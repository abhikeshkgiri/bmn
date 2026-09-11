'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

interface AdminUser { _id: string; name: string; phone: string; role: string; isActive: boolean }

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/users?page=1&limit=10');
        const json = await res.json();
        if (json.success) setUsers(json.data || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>User management</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <div>Loading users…</div> : users.length === 0 ? <div>No users found.</div> : (
          <div className="space-y-3">
            {users.map((user) => (
              <div key={user._id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3">
                <div>
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-neutral-500">{user.phone} • {user.role}</div>
                </div>
                <Badge variant={user.isActive ? 'success' : 'warning'}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          <Button variant="secondary">Add filters</Button>
        </div>
      </CardContent>
    </Card>
  );
}
