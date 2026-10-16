'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Dropdown } from '@/components/ui/Dropdown';
import Button from '@/components/ui/Button';

interface NotificationPreview {
  _id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  bookingHref?: string | null;
}

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [countError, setCountError] = useState(false);

  const loadUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications/unread-count');
      if (!response.ok) {
        setCountError(true);
        return;
      }
      const result = await response.json() as { success?: boolean; unreadCount?: number };
      if (!result.success) {
        setCountError(true);
        return;
      }
      setUnreadCount(result.unreadCount ?? 0);
      setCountError(false);
    } catch {
      setCountError(true);
    }
  };

  const loadPreview = async () => {
    try {
      setLoading(true);
      setPreviewError(false);
      const response = await fetch('/api/notifications?limit=5');
      if (!response.ok) {
        setPreviewError(true);
        return;
      }
      const result = await response.json() as {
        success?: boolean;
        data?: { notifications?: NotificationPreview[] };
      };
      if (!result.success) throw new Error('Notification request failed');
      setNotifications(result.data?.notifications ?? []);
    } catch {
      setPreviewError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const runFetches = () => {
      void loadUnreadCount();
      void loadPreview();
    };

    const handleFocus = () => {
      runFetches();
    };

    window.addEventListener('focus', handleFocus);
    const timer = window.setTimeout(runFetches, 0);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.clearTimeout(timer);
    };
  }, []);

  const trigger = (
    <button
      type="button"
      aria-label="Open notifications"
      className="relative inline-flex items-center justify-center rounded-full border border-border bg-white p-2 text-foreground hover:text-brand-pink focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-pink"
    >
      <Bell size={18} />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-brand-pink px-1 text-[10px] font-semibold text-white">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );

  return (
    <Dropdown trigger={trigger}>
      <div className="w-80 rounded-lg bg-white">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-medium">Notifications</span>
          <Link href="/notifications" className="text-xs text-brand-pink hover:underline">View all</Link>
        </div>
        {countError && (
          <div role="alert" className="flex items-center justify-between px-4 py-2 text-xs text-error-600">
            <span>Unread count unavailable.</span>
            <button type="button" className="underline" onClick={() => void loadUnreadCount()}>Retry</button>
          </div>
        )}
        {loading ? (
          <div className="px-4 py-3 text-sm text-foreground-secondary">Loading...</div>
        ) : previewError ? (
          <div role="alert" className="flex items-center justify-between px-4 py-3 text-sm text-error-600">
            <span>Unable to load notifications.</span>
            <button type="button" className="underline" onClick={() => void loadPreview()}>Retry</button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-3 text-sm text-foreground-secondary">You&apos;re all caught up.</div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <div key={notification._id} className={`border-b border-border px-4 py-3 last:border-b-0 ${notification.isRead ? 'opacity-80' : 'bg-pink-50/40'}`}>
                <div className="text-sm font-medium text-foreground">{notification.title}</div>
                <div className="mt-1 text-xs text-foreground-secondary">{notification.message}</div>
                {notification.bookingHref && (
                  <Link
                    href={notification.bookingHref}
                    className="mt-1 inline-block text-xs font-medium text-brand-pink hover:underline"
                  >
                    View booking
                  </Link>
                )}
                <div className="mt-1 text-[11px] text-foreground-muted">
                  {new Date(notification.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="border-t border-border px-4 py-3">
          <Link href="/notifications">
            <Button variant="outline" size="sm" fullWidth>Open notification center</Button>
          </Link>
        </div>
      </div>
    </Dropdown>
  );
}
