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
}

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationPreview[]>([]);
  const [loading, setLoading] = useState(false);

  const loadUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications/unread-count');
      if (!response.ok) {
        return;
      }
      const result = await response.json() as { unreadCount?: number };
      setUnreadCount(result.unreadCount ?? 0);
    } catch {
      // Ignore notification count errors in the UI.
    }
  };

  const loadPreview = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications?limit=5');
      if (!response.ok) {
        return;
      }
      const result = await response.json() as {
        success?: boolean;
        data?: { notifications?: NotificationPreview[] };
      };
      setNotifications(result.data?.notifications ?? []);
    } catch {
      // Ignore preview load errors.
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const runFetches = () => {
      void loadUnreadCount();
      void loadPreview();
    };

    const intervalId = window.setInterval(runFetches, 30000);
    const handleFocus = () => {
      runFetches();
    };

    window.addEventListener('focus', handleFocus);
    const timer = window.setTimeout(runFetches, 0);

    return () => {
      window.clearInterval(intervalId);
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
        {loading ? (
          <div className="px-4 py-3 text-sm text-foreground-secondary">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-3 text-sm text-foreground-secondary">You&apos;re all caught up.</div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <div key={notification._id} className={`border-b border-border px-4 py-3 last:border-b-0 ${notification.isRead ? 'opacity-80' : 'bg-pink-50/40'}`}>
                <div className="text-sm font-medium text-foreground">{notification.title}</div>
                <div className="mt-1 text-xs text-foreground-secondary">{notification.message}</div>
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
