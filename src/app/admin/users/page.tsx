'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface AdminUser { _id: string; name: string; phone: string; role: string; isActive: boolean }

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError('');
    try {
      const [usersResponse, currentUserResponse] = await Promise.all([
        fetch(`/api/admin/users?page=${targetPage}&limit=10&search=${encodeURIComponent(search.trim())}&isActive=${status}`),
        fetch('/api/auth/me'),
      ]);
      const result = await usersResponse.json();
      if (!usersResponse.ok || !result.success) {
        throw new Error(result.error?.message || 'Unable to load users.');
      }
      const session = currentUserResponse.ok ? await currentUserResponse.json() : null;
      setUsers(Array.isArray(result.data) ? result.data : []);
      setPages(Math.max(1, result.pagination?.pages || 1));
      setPage(targetPage);
      setCurrentUserId(typeof session?.user?._id === 'string' ? session.user._id : '');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load users.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(1), 250);
    return () => window.clearTimeout(timeout);
  }, [load]);

  async function changeStatus(user: AdminUser) {
    const nextIsActive = !user.isActive;
    const action = nextIsActive ? 'reactivate' : 'deactivate';
    const confirmation = nextIsActive
      ? `Reactivate ${user.name}'s account?`
      : `Deactivate ${user.name}'s account? Their booking, payment, and audit history will be preserved.`;
    if (!window.confirm(confirmation)) return;

    setSavingId(user._id);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id, isActive: nextIsActive }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || `Unable to ${action} this account.`);
      }
      setNotice(`${user.name}'s account was ${nextIsActive ? 'reactivated' : 'deactivated'}. History was preserved.`);
      await load(1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Unable to ${action} this account.`);
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User management</CardTitle>
        <p className="text-sm text-neutral-600">Deactivate accounts without deleting their booking, payment, or audit history.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_12rem_auto]">
          <Input label="Search name or phone" value={search} onChange={(event) => setSearch(event.target.value)} />
          <label className="block text-sm font-medium">Account status
            <select className="mt-1 w-full rounded-lg border border-border bg-white p-3" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All accounts</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>
          <div className="self-end"><Button type="button" onClick={() => void load(1)}>Apply filters</Button></div>
        </div>

        {notice && <p role="status" className="rounded-lg bg-success-50 p-3 text-sm text-success-700">{notice}</p>}
        {error && <p role="alert" className="rounded-lg bg-error-50 p-3 text-sm text-error-700">{error}</p>}

        {loading ? <p role="status">Loading users…</p> : users.length === 0 ? <p className="text-sm text-neutral-600">No users found.</p> : (
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user._id} className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-neutral-500">{user.phone} • {user.role}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={user.isActive ? 'success' : 'warning'}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
                  <Button
                    type="button"
                    variant={user.isActive ? 'outline' : 'secondary'}
                    size="sm"
                    disabled={savingId !== null || user._id === currentUserId}
                    onClick={() => void changeStatus(user)}
                    aria-label={`${user.isActive ? 'Deactivate' : 'Reactivate'} ${user.name}`}
                  >
                    {savingId === user._id ? 'Saving…' : user.isActive ? 'Deactivate' : 'Reactivate'}
                  </Button>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3">
              <Button type="button" variant="outline" disabled={page <= 1 || loading} onClick={() => void load(page - 1)}>Previous</Button>
              <span className="text-sm text-neutral-600">Page {page} of {pages}</span>
              <Button type="button" variant="outline" disabled={page >= pages || loading} onClick={() => void load(page + 1)}>Next</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
