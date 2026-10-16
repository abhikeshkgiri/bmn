'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Loading';
import NearbySalons from '@/components/location/NearbySalons';
import { BOOKING_STATUS, PAYMENT_STATUS } from '@/constants/booking';
import { USER_ROLES } from '@/constants/roles';
import { formatCurrency } from '@/utils/currency';
import NotificationBell from '@/components/notifications/NotificationBell';
import { Calendar, MapPin, User, Clock, ArrowRight, Plus } from 'lucide-react';

interface Customer {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  profileImage?: string;
}

interface Booking {
  _id: string;
  bookingNumber: string;
  salon: {
    _id: string;
    name: string;
  };
  barber: {
    _id: string;
    name: string;
  };
  service: {
    _id: string;
    name: string;
    duration: number;
  };
  appointmentDate: string;
  startTime: string;
  endTime: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
}

const STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  [BOOKING_STATUS.PENDING]: 'warning',
  [BOOKING_STATUS.CONFIRMED]: 'success',
  [BOOKING_STATUS.IN_PROGRESS]: 'info',
  [BOOKING_STATUS.COMPLETED]: 'success',
  [BOOKING_STATUS.CANCELLED]: 'error',
  [BOOKING_STATUS.NO_SHOW]: 'error',
};

const STATUS_LABELS: Record<string, string> = {
  [BOOKING_STATUS.PENDING]: 'Pending',
  [BOOKING_STATUS.CONFIRMED]: 'Confirmed',
  [BOOKING_STATUS.IN_PROGRESS]: 'In Progress',
  [BOOKING_STATUS.COMPLETED]: 'Completed',
  [BOOKING_STATUS.CANCELLED]: 'Cancelled',
  [BOOKING_STATUS.NO_SHOW]: 'No Show',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  [PAYMENT_STATUS.PENDING]: 'Pending',
  [PAYMENT_STATUS.AUTHORIZED]: 'Authorized',
  [PAYMENT_STATUS.PAID]: 'Paid',
  [PAYMENT_STATUS.FAILED]: 'Failed',
  [PAYMENT_STATUS.REFUNDED]: 'Refunded',
  [PAYMENT_STATUS.PARTIALLY_REFUNDED]: 'Partially Refunded',
};

export default function CustomerDashboard() {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [upcomingBooking, setUpcomingBooking] = useState<Booking | null>(null);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState({
    upcomingCount: 0,
    completedCount: 0,
    totalBookings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchCustomerData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);

      // Fetch customer profile
      const profileResponse = await fetch('/api/auth/me');
      const profileResult = await profileResponse.json() as {
        success: boolean;
        user?: Customer;
        data?: Customer;
      };

      if (!profileResponse.ok || !profileResult.success) {
        throw new Error(profileResponse.status === 401 ? 'Please sign in to view your dashboard.' : 'Unable to load your profile.');
      }
      if (profileResult.user || profileResult.data) {
        setCustomer(profileResult.user || profileResult.data || null);
      }

      // Fetch bookings
      const bookingsResponse = await fetch('/api/bookings?page=1&limit=50');
      const bookingsResult = await bookingsResponse.json() as {
        success: boolean;
        data?: Booking[];
        pagination?: { total: number };
        error?: { message?: string };
      };

      if (!bookingsResponse.ok || !bookingsResult.success || !bookingsResult.data) {
        throw new Error(
          bookingsResponse.status === 401
            ? 'Please sign in to view your bookings.'
            : bookingsResult.error?.message || 'Unable to load your bookings.'
        );
      }
      {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Find next upcoming booking
        const upcoming = bookingsResult.data.find((b) => {
          const appointmentDate = new Date(b.appointmentDate);
          const appointmentDay = new Date(
            appointmentDate.getFullYear(),
            appointmentDate.getMonth(),
            appointmentDate.getDate()
          );
          return appointmentDay.getTime() >= today.getTime() && b.status !== BOOKING_STATUS.CANCELLED;
        });

        setUpcomingBooking(upcoming || null);
        setRecentBookings(bookingsResult.data.slice(0, 5));

        // Calculate stats
        const upcomingCount = bookingsResult.data.filter((b) => {
          const appointmentDate = new Date(b.appointmentDate);
          const appointmentDay = new Date(
            appointmentDate.getFullYear(),
            appointmentDate.getMonth(),
            appointmentDate.getDate()
          );
          return appointmentDay.getTime() >= today.getTime() && b.status !== BOOKING_STATUS.CANCELLED;
        }).length;

        const completedCount = bookingsResult.data.filter(
          (b) => b.status === BOOKING_STATUS.COMPLETED
        ).length;

        setStats({
          upcomingCount,
          completedCount,
          totalBookings: bookingsResult.pagination?.total || bookingsResult.data.length,
        });
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setLoadError(error instanceof Error ? error.message : 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const checkRoleAndRedirect = async () => {
      try {
        const meResponse = await fetch('/api/auth/me');
        if (!meResponse.ok) {
          router.replace('/login?next=/dashboard');
          return;
        }
        const me = await meResponse.json();
        const role = me?.user?.role;

        if (role === USER_ROLES.SALON_OWNER || role === USER_ROLES.SALON_STAFF) {
          router.replace('/dashboard/salon');
          return;
        }

        if (role === USER_ROLES.ADMIN || role === USER_ROLES.SUPER_ADMIN) {
          router.replace('/admin');
          return;
        }

        if (role === USER_ROLES.BARBER) {
          router.replace('/dashboard/barber');
          return;
        }
        if (role !== USER_ROLES.CUSTOMER) {
          throw new Error('This account does not have customer dashboard access.');
        }
      } catch (error) {
        console.error('Failed to verify customer dashboard access:', error);
        setLoadError(error instanceof Error ? error.message : 'Unable to verify dashboard access.');
        setLoading(false);
        return;
      }

      fetchCustomerData();
    };

    checkRoleAndRedirect();
  }, [fetchCustomerData, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {loadError && (
          <Card className="mb-6 flex flex-col gap-3 border-error-200 p-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-error-700">{loadError}</p>
            <Button type="button" variant="secondary" onClick={fetchCustomerData}>Retry</Button>
          </Card>
        )}
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-brand-pink to-brand-pink/80 rounded-lg p-8 text-white mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-2">Welcome, {customer?.name}</h1>
              <p className="text-white/80">Manage your appointments and bookings</p>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <Link href="/bookings">
                <Button variant="secondary">View All Bookings</Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Stats Cards */}
          <Card className="p-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-brand-pink mb-2">{stats.upcomingCount}</div>
              <p className="text-foreground-secondary">Upcoming Bookings</p>
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">{stats.completedCount}</div>
              <p className="text-foreground-secondary">Completed Bookings</p>
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">{stats.totalBookings}</div>
              <p className="text-foreground-secondary">Total Bookings</p>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Upcoming Appointment */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold mb-6">Next Appointment</h2>
            {upcomingBooking ? (
              <Card className="p-6 mb-8">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-foreground mb-2">{upcomingBooking.service.name}</h3>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant={STATUS_COLORS[upcomingBooking.status]}>
                        {STATUS_LABELS[upcomingBooking.status]}
                      </Badge>
                      {upcomingBooking.paymentStatus === PAYMENT_STATUS.PAID && (
                        <Badge variant="success">Payment Received</Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-brand-pink">
                      {formatCurrency(upcomingBooking.totalAmount)}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-foreground-secondary mb-6">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} />
                    <span>{upcomingBooking.salon.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={16} />
                    <span>{upcomingBooking.barber.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={16} />
                    <span>
                      {new Date(upcomingBooking.appointmentDate).toLocaleDateString('en-US', {
                        weekday: 'short',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    <span>
                      {upcomingBooking.startTime} - {upcomingBooking.endTime}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Link href={`/booking/${upcomingBooking._id}`} className="flex-1">
                    <Button variant="primary" className="w-full">
                      View Details
                    </Button>
                  </Link>
                  <Link href={`/booking/${upcomingBooking._id}`} className="flex-1">
                    <Button variant="secondary" className="w-full">
                      Reschedule
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <Card className="p-8 text-center mb-8">
                <p className="text-foreground-secondary mb-6">No upcoming appointments</p>
                <Link href="/salons">
                  <Button variant="primary">
                    <Plus size={16} className="mr-2" />
                    Book an Appointment
                  </Button>
                </Link>
              </Card>
            )}

            {/* Recent Bookings */}
            <h2 className="text-2xl font-bold mb-6">Recent Bookings</h2>
            <div className="space-y-3">
              {recentBookings.map((booking) => (
                <Link key={booking._id} href={`/booking/${booking._id}`}>
                  <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-foreground">{booking.service.name}</h4>
                          <Badge variant={STATUS_COLORS[booking.status]}>
                            {STATUS_LABELS[booking.status]}
                          </Badge>
                        </div>
                        <div className="text-sm text-foreground-secondary">
                          {booking.salon.name} • {booking.barber.name}
                        </div>
                        <div className="text-sm text-foreground-secondary">
                          {new Date(booking.appointmentDate).toLocaleDateString()} at {booking.startTime}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground mb-1">
                          {formatCurrency(booking.totalAmount)}
                        </p>
                        <Badge variant={booking.paymentStatus === PAYMENT_STATUS.PAID ? 'success' : 'warning'}>
                          {PAYMENT_STATUS_LABELS[booking.paymentStatus] || 'Pending'}
                        </Badge>
                      </div>
                      <ArrowRight size={16} className="ml-4 text-foreground-secondary" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Nearby Salons */}
            <h2 className="text-2xl font-bold mb-6 mt-8">Nearby Salons</h2>
            <NearbySalons />
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
            <div className="space-y-3">
              <Link href="/salons">
                <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer text-center">
                  <div className="text-3xl mb-2">🔍</div>
                  <h4 className="font-semibold text-foreground">Find Salon</h4>
                  <p className="text-xs text-foreground-secondary">Browse salons</p>
                </Card>
              </Link>
              <Link href="/salons">
                <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer text-center">
                  <div className="text-3xl mb-2">📅</div>
                  <h4 className="font-semibold text-foreground">Book Appointment</h4>
                  <p className="text-xs text-foreground-secondary">Schedule now</p>
                </Card>
              </Link>
              <Link href="/bookings">
                <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer text-center">
                  <div className="text-3xl mb-2">📋</div>
                  <h4 className="font-semibold text-foreground">My Bookings</h4>
                  <p className="text-xs text-foreground-secondary">View all bookings</p>
                </Card>
              </Link>
              <Link href="/profile">
                <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer text-center">
                  <div className="text-3xl mb-2">👤</div>
                  <h4 className="font-semibold text-foreground">My Profile</h4>
                  <p className="text-xs text-foreground-secondary">Manage account</p>
                </Card>
              </Link>
              <Link href="/loyalty">
                <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer text-center">
                  <h4 className="font-semibold text-foreground">Loyalty and membership</h4>
                  <p className="text-xs text-foreground-secondary">Points and plans</p>
                </Card>
              </Link>
              <Link href="/memberships">
                <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer text-center">
                  <h4 className="font-semibold text-foreground">Membership plans</h4>
                  <p className="text-xs text-foreground-secondary">Unlock member benefits</p>
                </Card>
              </Link>
              <Link href="/favorites">
                <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer text-center">
                  <h4 className="font-semibold text-foreground">Favorites</h4>
                  <p className="text-xs text-foreground-secondary">Saved salons and barbers</p>
                </Card>
              </Link>
              <Link href="/addresses">
                <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer text-center">
                  <h4 className="font-semibold text-foreground">Saved addresses</h4>
                  <p className="text-xs text-foreground-secondary">Manage your addresses</p>
                </Card>
              </Link>
              <Link href="/support">
                <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer text-center">
                  <h4 className="font-semibold text-foreground">Help and support</h4>
                  <p className="text-xs text-foreground-secondary">Contact support</p>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
