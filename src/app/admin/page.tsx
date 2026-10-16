'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { getDashboardPathForRole } from '@/utils/dashboard-route';

interface AdminBooking { _id: string; status: string; customer?: { name?: string }; salon?: { name?: string }; service?: { name?: string } }
interface AdminRecentUser { _id: string; name: string; role: string; isActive: boolean }
interface AdminStats { totalCustomers: number; totalSalons: number; totalBarbers: number; totalBookings: number; completedBookings: number; cancelledBookings: number; totalRevenue: number; pendingSalonApprovals: number; pendingBarberApprovals: number; pendingReviews: number; recentBookings: AdminBooking[]; recentUsers: AdminRecentUser[] }

function isAdminStats(value: unknown): value is AdminStats {
  if (!value || typeof value !== 'object') return false;
  const stats = value as Record<string, unknown>;
  return [
    'totalCustomers', 'totalSalons', 'totalBarbers', 'totalBookings',
    'completedBookings', 'cancelledBookings', 'totalRevenue',
    'pendingSalonApprovals', 'pendingBarberApprovals', 'pendingReviews',
  ].every((key) => typeof stats[key] === 'number') &&
    Array.isArray(stats.recentBookings) &&
    Array.isArray(stats.recentUsers);
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await fetch('/api/auth/me');
      const user = me.ok ? (await me.json()).user : null;
      if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        if (!user) {
          router.replace('/login?next=%2Fadmin');
        } else {
          const dashboardPath = getDashboardPathForRole(user.role);
          if (dashboardPath) router.replace(dashboardPath);
          else setError('Salon staff dashboard access is not configured. Contact your salon administrator.');
        }
        return;
      }
      const res = await fetch('/api/admin/dashboard');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || 'Unable to load admin dashboard');
      }
      if (!isAdminStats(json.data)) throw new Error('Admin dashboard returned incomplete data.');
      setStats(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  if (loading) return <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-sm text-neutral-600">Loading admin dashboard…</div>;
  if (error) return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-8 text-red-700">
      <span>{error}</span>
      <Button variant="outline" onClick={() => void load()}>Retry</Button>
    </div>
  );
  if (!stats) return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-700">Admin dashboard data is unavailable. Retry to load current information.</div>;

  const metrics = [
    { label: 'Customers', value: stats.totalCustomers },
    { label: 'Salons', value: stats.totalSalons },
    { label: 'Barbers', value: stats.totalBarbers },
    { label: 'Bookings', value: stats.totalBookings },
    { label: 'Completed', value: stats.completedBookings },
    { label: 'Cancelled', value: stats.cancelledBookings },
    { label: 'Gross paid', value: `₹${(stats.totalRevenue / 100).toLocaleString('en-IN')}` },
    { label: 'Pending salons', value: stats.pendingSalonApprovals },
    { label: 'Pending barbers', value: stats.pendingBarberApprovals },
    { label: 'Pending reviews', value: stats.pendingReviews },
  ];
  const recentBookings = stats.recentBookings;
  const recentUsers = stats.recentUsers;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-brand-pink">Operations</p>
          <h1 className="mt-2 text-3xl font-bold">Platform Overview</h1>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((item) => (
          <Card key={item.label} className="p-4">
            <div className="text-sm text-neutral-500">{item.label}</div>
            <div className="mt-3 text-2xl font-bold">{item.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent bookings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentBookings.length === 0 ? (
              <div className="text-sm text-neutral-500">No recent bookings available.</div>
            ) : (
              recentBookings.map((booking) => (
                <div key={booking._id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3">
                  <div>
                    <div className="font-medium">{booking.customer?.name || 'Customer'}</div>
                    <div className="text-sm text-neutral-500">{booking.salon?.name || 'Salon'} • {booking.service?.name || 'Service'}</div>
                  </div>
                  <Badge variant="info">{booking.status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent users</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentUsers.length === 0 ? (
              <div className="text-sm text-neutral-500">No recent users available.</div>
            ) : (
              recentUsers.map((user) => (
                <div key={user._id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3">
                  <div>
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-neutral-500">{user.role}</div>
                  </div>
                  <Badge variant={user.isActive ? 'success' : 'warning'}>{user.isActive ? 'Active' : 'Inactive'}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/admin/users"><Button fullWidth variant="outline">Users</Button></Link>
        <Link href="/admin/salons"><Button fullWidth variant="outline">Salons</Button></Link>
        <Link href="/admin/barbers"><Button fullWidth variant="outline">Barbers</Button></Link>
        <Link href="/admin/reviews"><Button fullWidth variant="outline">Reviews</Button></Link>
      </div>
    </div>
  );
}
