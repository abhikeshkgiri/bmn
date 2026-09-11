'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Loading';
import { BOOKING_STATUS } from '@/constants/booking';
import { USER_ROLES } from '@/constants/roles';
import NotificationBell from '@/components/notifications/NotificationBell';
import { CalendarClock, Clock3, UserCheck, ArrowRight } from 'lucide-react';

interface DashboardData {
  barber: { _id: string; name: string; salon?: { name?: string } } | null;
  stats: {
    todayAppointments: number;
    upcomingAppointments: number;
    completedAppointments: number;
    remainingAppointments: number;
  };
  todayAppointments: Array<{
    _id: string;
    bookingNumber: string;
    customer?: { name?: string };
    service?: { name?: string; duration?: number };
    appointmentDate: string;
    startTime: string;
    endTime: string;
    status: string;
  }>;
  upcomingAppointments: Array<{
    _id: string;
    customer?: { name?: string };
    service?: { name?: string; duration?: number };
    appointmentDate: string;
    startTime: string;
    endTime: string;
    status: string;
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

export default function BarberDashboardRoutePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const authResponse = await fetch('/api/auth/me');
        if (!authResponse.ok) {
          router.push('/login');
          return;
        }

        const userData = await authResponse.json();
        if (userData?.user?.role !== USER_ROLES.BARBER) {
          setError('You do not have access to the barber dashboard');
          setLoading(false);
          return;
        }

        const response = await fetch('/api/dashboard/barber/stats');
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result?.error?.message || 'Failed to load barber dashboard');
        }

        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Spinner size="lg" /></div>;
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

  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-brand-pink font-medium">Barber dashboard</p>
            <h1 className="text-3xl font-bold text-foreground">{data.barber?.name || 'Barber profile'}</h1>
            <p className="text-foreground-secondary">{data.barber?.salon?.name || 'Salon'}</p>
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            <NotificationBell />
            <Link href="/dashboard/barber/bookings"><Button variant="primary">My bookings</Button></Link>
            <Link href="/dashboard/barber/home-service"><Button variant="secondary">Home-service requests</Button></Link>
            <Link href="/dashboard/barber/profile"><Button variant="secondary">My profile</Button></Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
          <Card className="p-5"><div className="flex items-center justify-between mb-3"><span className="text-sm text-foreground-secondary">Today</span><CalendarClock size={18} className="text-brand-pink" /></div><p className="text-3xl font-bold text-foreground">{data.stats.todayAppointments}</p><p className="text-sm text-foreground-secondary">Appointments</p></Card>
          <Card className="p-5"><div className="flex items-center justify-between mb-3"><span className="text-sm text-foreground-secondary">Upcoming</span><Clock3 size={18} className="text-brand-pink" /></div><p className="text-3xl font-bold text-foreground">{data.stats.upcomingAppointments}</p><p className="text-sm text-foreground-secondary">Scheduled</p></Card>
          <Card className="p-5"><div className="flex items-center justify-between mb-3"><span className="text-sm text-foreground-secondary">Completed</span><UserCheck size={18} className="text-green-600" /></div><p className="text-3xl font-bold text-foreground">{data.stats.completedAppointments}</p><p className="text-sm text-foreground-secondary">Finished</p></Card>
          <Card className="p-5"><div className="flex items-center justify-between mb-3"><span className="text-sm text-foreground-secondary">Remaining</span><ArrowRight size={18} className="text-brand-pink" /></div><p className="text-3xl font-bold text-foreground">{data.stats.remainingAppointments}</p><p className="text-sm text-foreground-secondary">Open today</p></Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Today&apos;s appointments</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.todayAppointments.length === 0 ? <p className="text-foreground-secondary py-8 text-center">No appointments today</p> : data.todayAppointments.map((booking) => (
                  <div key={booking._id} className="p-3 border border-border rounded-lg">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div>
                        <p className="font-medium">{booking.customer?.name || 'Customer'}</p>
                        <p className="text-xs text-foreground-secondary">{booking.bookingNumber}</p>
                      </div>
                      <Badge variant={statusColors[booking.status] || 'info'}>{booking.status}</Badge>
                    </div>
                    <div className="text-sm text-foreground-secondary space-y-1">
                      <p>{booking.service?.name || 'Service'}</p>
                      <p>{booking.startTime} - {booking.endTime}</p>
                      <p>{booking.service?.duration || 0} mins</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Upcoming appointments</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.upcomingAppointments.length === 0 ? <p className="text-foreground-secondary py-8 text-center">No upcoming bookings</p> : data.upcomingAppointments.map((booking) => (
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
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
