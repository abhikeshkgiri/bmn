'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Loading';

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  type: string;
}

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchInitialNotifications = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/notifications?page=1&limit=10');
        const result = await response.json() as {
          success?: boolean;
          data?: {
            notifications?: NotificationItem[];
            pagination?: { totalPages?: number; page?: number };
          };
        };

        if (!response.ok || !result.success) {
          throw new Error('Failed to load notifications');
        }

        const items = result.data?.notifications ?? [];
        setNotifications(items);
        setTotalPages(result.data?.pagination?.totalPages ?? 1);
        setPage(result.data?.pagination?.page ?? 1);
      } catch {
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    const timer = window.setTimeout(() => {
      void fetchInitialNotifications();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const loadNotifications = async (pageNumber = 1) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/notifications?page=${pageNumber}&limit=10`);
      const result = await response.json() as {
        success?: boolean;
        data?: {
          notifications?: NotificationItem[];
          pagination?: { totalPages?: number; page?: number };
        };
      };

      if (!response.ok || !result.success) {
        throw new Error('Failed to load notifications');
      }

      const items = result.data?.notifications ?? [];
      setNotifications(items);
      setTotalPages(result.data?.pagination?.totalPages ?? 1);
      setPage(result.data?.pagination?.page ?? pageNumber);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    const response = await fetch('/api/notifications/read-all', { method: 'POST' });
    if (response.ok) {
      void loadNotifications(page);
    }
  };

  const deleteNotification = async (id: string) => {
    const response = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
    if (response.ok) {
      void loadNotifications(page);
    }
  };

  const handleRead = async (id: string) => {
    const response = await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
    if (response.ok) {
      void loadNotifications(page);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-brand-pink">Inbox</p>
            <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={markAllRead}>Mark all read</Button>
            <Link href="/dashboard"><Button variant="primary" size="sm">Back to dashboard</Button></Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your notifications</CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-foreground-secondary">You do not have any notifications yet.</div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div key={notification._id} className={`rounded-lg border p-4 ${notification.isRead ? 'border-border bg-white' : 'border-brand-pink/30 bg-pink-50/40'}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-foreground">{notification.title}</div>
                        <div className="mt-1 text-sm text-foreground-secondary">{notification.message}</div>
                        <div className="mt-2 text-xs text-foreground-muted">
                          {new Date(notification.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!notification.isRead && (
                          <Button variant="outline" size="sm" onClick={() => void handleRead(notification._id)}>Mark read</Button>
                        )}
                        <Button variant="destructive" size="sm" onClick={() => void deleteNotification(notification._id)}>Delete</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => void loadNotifications(page - 1)}>Previous</Button>
            <span className="flex items-center px-3 text-sm text-foreground-secondary">Page {page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => void loadNotifications(page + 1)}>Next</Button>
          </div>
        )}
      </div>
    </div>
  );
}
