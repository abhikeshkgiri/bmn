'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';

interface AdminBooking { _id: string; status: string; customer?: { name?: string }; salon?: { name?: string }; service?: { name?: string } }
interface AdminRecentUser { _id: string; name: string; role: string; isActive: boolean }
interface AdminStats { totalCustomers?: number; totalSalons?: number; totalBarbers?: number; totalBookings?: number; completedBookings?: number; cancelledBookings?: number; totalRevenue?: number; pendingSalonApprovals?: number; pendingBarberApprovals?: number; pendingReviews?: number; recentBookings?: AdminBooking[]; recentUsers?: AdminRecentUser[] }

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const me = await fetch('/api/auth/me');
        const user = me.ok ? (await me.json()).user : null;
        if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
          router.replace('/dashboard');
          return;
        }
        const res = await fetch('/api/admin/dashboard');
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || 'Unable to load admin dashboard');
        }
        setStats(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [router]);

  if (loading) return <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-sm text-neutral-600">Loading admin dashboard…</div>;
  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-700">{error}</div>;

  const metrics = [
    { label: 'Customers', value: stats?.totalCustomers ?? 0 },
    { label: 'Salons', value: stats?.totalSalons ?? 0 },
    { label: 'Barbers', value: stats?.totalBarbers ?? 0 },
    { label: 'Bookings', value: stats?.totalBookings ?? 0 },
    { label: 'Completed', value: stats?.completedBookings ?? 0 },
    { label: 'Cancelled', value: stats?.cancelledBookings ?? 0 },
    { label: 'Revenue', value: `₹${(stats?.totalRevenue ?? 0).toLocaleString('en-IN')}` },
    { label: 'Pending salons', value: stats?.pendingSalonApprovals ?? 0 },
    { label: 'Pending barbers', value: stats?.pendingBarberApprovals ?? 0 },
    { label: 'Pending reviews', value: stats?.pendingReviews ?? 0 },
  ];
  const recentBookings = stats?.recentBookings ?? [];
  const recentUsers = stats?.recentUsers ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-brand-pink">Operations</p>
          <h1 className="mt-2 text-3xl font-bold">Platform Overview</h1>
        </div>
        <Button variant="secondary">Export</Button>
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
                    <div className="font-medium">{booking?.customer?.name || 'Customer'}</div>
                    <div className="text-sm text-neutral-500">{booking?.salon?.name || 'Salon'} • {booking?.service?.name || 'Service'}</div>
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
