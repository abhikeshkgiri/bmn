'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Loading';
import { BOOKING_STATUS, PAYMENT_STATUS } from '@/constants/booking';
import { USER_ROLES } from '@/constants/roles';
import { formatCurrency } from '@/utils/currency';
import { Calendar, Clock3, Users, DollarSign, ArrowRight, CheckCircle2, XCircle, Plus } from 'lucide-react';

interface DashboardData {
  salon: { _id: string; name: string; isActive?: boolean; status?: string; owner?: string } | null;
  stats: {
    todayBookings: number;
    upcomingBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    todayRevenue: number;
    totalBookings: number;
    pendingBookings: number;
  };
  todayAppointments: Array<{
    _id: string;
    bookingNumber: string;
    customer?: { _id?: string; name?: string; phone?: string };
    barber?: { _id?: string; name?: string };
    service?: { _id?: string; name?: string };
    appointmentDate: string;
    startTime: string;
    endTime: string;
    status: string;
    paymentStatus: string;
    totalAmount: number;
  }>;
  upcomingAppointments: Array<{
    _id: string;
    bookingNumber: string;
    customer?: { name?: string };
    barber?: { name?: string };
    service?: { name?: string };
    appointmentDate: string;
    startTime: string;
    endTime: string;
    status: string;
    paymentStatus: string;
    totalAmount: number;
  }>;
}

const statusColors: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  [BOOKING_STATUS.PENDING]: 'warning',
  [BOOKING_STATUS.CONFIRMED]: 'info',
  [BOOKING_STATUS.IN_PROGRESS]: 'info',
  [BOOKING_STATUS.COMPLETED]: 'success',
  [BOOKING_STATUS.CANCELLED]: 'error',
  [BOOKING_STATUS.NO_SHOW]: 'error',
};

export default function SalonDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const userResp = await fetch('/api/auth/me');
        if (!userResp.ok) {
          router.push('/login');
          return;
        }

        const userData = await userResp.json();
        const hasAccess = [USER_ROLES.SALON_OWNER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(userData.user.role);
        if (!hasAccess) {
          setError('You do not have access to the salon dashboard');
          setLoading(false);
          return;
        }

        const resp = await fetch('/api/salon/dashboard');
        const json = await resp.json();
        if (!resp.ok || !json.success) {
          throw new Error(json.error?.message || 'Failed to load salon dashboard');
        }

        setData(json.data);
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-8 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Access denied</h1>
            <p className="text-foreground-secondary mb-6">{error}</p>
            <Link href="/">
              <Button variant="primary">Back to home</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-brand-pink font-medium">Salon dashboard</p>
            <h1 className="text-3xl font-bold text-foreground">{data.salon?.name || 'Salon Overview'}</h1>
            <p className="text-foreground-secondary">{today}</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link href="/salon/bookings">
              <Button variant="primary">Manage Bookings</Button>
            </Link>
            <Link href="/salon/services">
              <Button variant="secondary">Services</Button>
            </Link>
            <Link href="/salon/barbers">
              <Button variant="secondary">Barbers</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-foreground-secondary">Today</span>
              <Calendar className="text-brand-pink" size={18} />
            </div>
            <p className="text-3xl font-bold text-foreground">{data.stats.todayBookings}</p>
            <p className="text-sm text-foreground-secondary">Appointments</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-foreground-secondary">Upcoming</span>
              <Clock3 className="text-brand-pink" size={18} />
            </div>
            <p className="text-3xl font-bold text-foreground">{data.stats.upcomingBookings}</p>
            <p className="text-sm text-foreground-secondary">Next appointments</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-foreground-secondary">Completed</span>
              <CheckCircle2 className="text-green-600" size={18} />
            </div>
            <p className="text-3xl font-bold text-foreground">{data.stats.completedBookings}</p>
            <p className="text-sm text-foreground-secondary">Finished</p>
          </Card>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-foreground-secondary">Revenue</span>
              <DollarSign className="text-green-600" size={18} />
            </div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(data.stats.todayRevenue)}</p>
            <p className="text-sm text-foreground-secondary">Paid today</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.todayAppointments.length === 0 ? (
                  <p className="text-foreground-secondary py-8 text-center">No appointments today</p>
                ) : (
                  data.todayAppointments.map((booking) => (
                    <div key={booking._id} className="p-3 border border-border rounded-lg">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div>
                          <p className="font-medium">{booking.customer?.name || 'Customer'}</p>
                          <p className="text-xs text-foreground-secondary">{booking.bookingNumber}</p>
                        </div>
                        <Badge variant={statusColors[booking.status] || 'info'}>{booking.status}</Badge>
                      </div>
                      <div className="space-y-1 text-sm text-foreground-secondary">
                        <p>{booking.service?.name || 'Service'}</p>
                        <p>{booking.barber?.name || 'Barber'}</p>
                        <p>{booking.startTime} - {booking.endTime}</p>
                        <p>{booking.paymentStatus}</p>
                      </div>
                      <div className="mt-3 flex gap-2 flex-wrap">
                        <Link href={`/booking/${booking._id}`}>
                          <Button size="sm" variant="outline">View</Button>
                        </Link>
                        {booking.status === BOOKING_STATUS.PENDING && (
                          <Button size="sm" variant="primary" onClick={() => router.push(`/booking/${booking._id}`)}>Confirm</Button>
                        )}
                        {booking.status === BOOKING_STATUS.CONFIRMED && (
                          <Button size="sm" variant="primary" onClick={() => router.push(`/booking/${booking._id}`)}>Start</Button>
                        )}
                        {booking.status === BOOKING_STATUS.IN_PROGRESS && (
                          <Button size="sm" variant="primary" onClick={() => router.push(`/booking/${booking._id}`)}>Complete</Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.upcomingAppointments.length === 0 ? (
                  <p className="text-foreground-secondary py-8 text-center">No upcoming bookings</p>
                ) : (
                  data.upcomingAppointments.map((booking) => (
                    <div key={booking._id} className="flex items-center justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium">{booking.customer?.name || 'Customer'}</p>
                        <p className="text-xs text-foreground-secondary">{new Date(booking.appointmentDate).toLocaleDateString()} • {booking.service?.name || 'Service'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{booking.startTime}</p>
                        <Badge variant={statusColors[booking.status] || 'info'}>{booking.status}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Link href="/salon/bookings" className="block">
            <Card className="p-4 hover:shadow-md transition-shadow">
              <Users size={24} className="mb-2 text-brand-pink" />
              <h3 className="font-semibold">Manage bookings</h3>
            </Card>
          </Link>
          <Link href="/salon/services" className="block">
            <Card className="p-4 hover:shadow-md transition-shadow">
              <Plus size={24} className="mb-2 text-brand-pink" />
              <h3 className="font-semibold">Services</h3>
            </Card>
          </Link>
          <Link href="/salon/barbers" className="block">
            <Card className="p-4 hover:shadow-md transition-shadow">
              <Users size={24} className="mb-2 text-brand-pink" />
              <h3 className="font-semibold">Barbers</h3>
            </Card>
          </Link>
          <Link href="/salons" className="block">
            <Card className="p-4 hover:shadow-md transition-shadow">
              <ArrowRight size={24} className="mb-2 text-brand-pink" />
              <h3 className="font-semibold">View public salon</h3>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
