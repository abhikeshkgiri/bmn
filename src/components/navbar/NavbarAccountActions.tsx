'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, UserRound } from 'lucide-react';
import Button, { ButtonLink } from '@/components/ui/Button';
import type { UserRole } from '@/constants/roles';
import { getDashboardPathForRole } from '@/utils/dashboard-route';

interface SessionUser {
  name?: string;
  phone: string;
  role: UserRole;
  isVerified: boolean;
}

export default function NavbarAccountActions() {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('');

  const loadSession = useCallback(async (signal?: AbortSignal) => {
    setChecking(true);
    setUnavailable(false);
    setError('');
    try {
      const response = await fetch('/api/auth/me', { signal, cache: 'no-store' });
      const result = await response.json();
      if (signal?.aborted) return;
      if (response.status === 401) {
        setUser(null);
        return;
      }
      if (!response.ok || !result.success || !result.user) {
        setUser(null);
        setUnavailable(true);
        setError(result?.error?.message || 'Account status is temporarily unavailable.');
        return;
      }
      setUser(result.user as SessionUser);
    } catch (reason) {
      if (signal?.aborted) return;
      setUser(null);
      setUnavailable(true);
      setError(reason instanceof Error ? reason.message : 'Account status is temporarily unavailable.');
    } finally {
      if (!signal?.aborted) setChecking(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => void loadSession(controller.signal), 0);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [loadSession]);

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setError('');
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Unable to log out. Please retry.');
      setUser(null);
      setUnavailable(false);
      router.replace('/');
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to log out. Please retry.');
    } finally {
      setLoggingOut(false);
    }
  };

  if (checking) {
    return <span className="text-sm text-foreground-secondary" aria-live="polite">Checking account…</span>;
  }

  if (unavailable) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden max-w-48 text-xs text-red-700 sm:inline" role="status">{error}</span>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadSession()}>
          Retry account
        </Button>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <ButtonLink href="/login" variant="outline" size="sm">Login</ButtonLink>
        <ButtonLink href="/signup/choose" variant="primary" size="sm">Sign Up</ButtonLink>
      </>
    );
  }

  const accountName = user.name?.trim() || user.phone;
  const accountLabel = user.isVerified ? 'Verified account' : 'Mobile verification required';
  const dashboardPath = getDashboardPathForRole(user.role);

  return (
    <>
      {dashboardPath !== null ? (
        <Link
          href={dashboardPath}
          className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-brand-pink"
          aria-label={`${accountName} account dashboard`}
          title={accountLabel}
        >
          <UserRound size={18} aria-hidden="true" />
          <span className="hidden max-w-36 truncate sm:inline">{accountName}</span>
          <span className="sr-only">{accountLabel}</span>
        </Link>
      ) : (
        <span className="flex items-center gap-2 text-sm text-foreground-secondary" title="Staff dashboard access is not configured">
          <UserRound size={18} aria-hidden="true" />
          <span className="hidden max-w-36 truncate sm:inline">{accountName} · Staff access unavailable</span>
        </span>
      )}
      <Button type="button" variant="outline" size="sm" disabled={loggingOut} onClick={() => void logout()}>
        <LogOut size={16} aria-hidden="true" />
        <span className="hidden sm:inline">{loggingOut ? 'Logging out…' : 'Logout'}</span>
      </Button>
      {error && <span className="text-xs text-red-700" role="alert">{error}</span>}
    </>
  );
}
