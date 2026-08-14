'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Loading';
import { BOOKING_STATUS, PAYMENT_STATUS } from '@/constants/booking';
import { formatCurrency } from '@/utils/currency';
import { Calendar, MapPin, User, Clock, ChevronRight } from 'lucide-react';

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

const PAYMENT_STATUS_COLORS: Record<string, 'success' | 'warning' | 'error' | 'info'> = {
  [PAYMENT_STATUS.PENDING]: 'warning',
  [PAYMENT_STATUS.AUTHORIZED]: 'info',
  [PAYMENT_STATUS.PAID]: 'success',
  [PAYMENT_STATUS.FAILED]: 'error',
  [PAYMENT_STATUS.REFUNDED]: 'info',
  [PAYMENT_STATUS.PARTIALLY_REFUNDED]: 'warning',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  [PAYMENT_STATUS.PENDING]: 'Payment Pending',
  [PAYMENT_STATUS.AUTHORIZED]: 'Authorized',
  [PAYMENT_STATUS.PAID]: 'Paid',
  [PAYMENT_STATUS.FAILED]: 'Payment Failed',
  [PAYMENT_STATUS.REFUNDED]: 'Refunded',
  [PAYMENT_STATUS.PARTIALLY_REFUNDED]: 'Partially Refunded',
};

type FilterTab = 'all' | 'upcoming' | 'today' | 'completed' | 'cancelled';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 10,
    totalPages: 0,
  });

  const getStatusFilter = (tab: FilterTab): string | undefined => {
    switch (tab) {
      case 'completed':
        return BOOKING_STATUS.COMPLETED;
      case 'cancelled':
        return BOOKING_STATUS.CANCELLED;
      default:
        return undefined;
    }
  };

  const filterBookingsByDate = (bookings: Booking[], tab: FilterTab): Booking[] => {
    if (tab === 'all' || tab === 'completed' || tab === 'cancelled') {
      return bookings;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return bookings.filter((booking) => {
      const appointmentDate = new Date(booking.appointmentDate);
      const appointmentDay = new Date(appointmentDate.getFullYear(), appointmentDate.getMonth(), appointmentDate.getDate());

      if (tab === 'today') {
        return appointmentDay.getTime() === today.getTime();
      }

      // upcoming
      return appointmentDay.getTime() >= today.getTime();
    });
  };

  const fetchBookings = useCallback(
    async (pageNum: number) => {
      try {
        setLoading(true);
        const statusFilter = getStatusFilter(activeTab);
        const url = statusFilter
          ? `/api/bookings?page=${pageNum}&limit=10&status=${statusFilter}`
          : `/api/bookings?page=${pageNum}&limit=10`;

        const response = await fetch(url);
        const result = await response.json() as {
          success: boolean;
          data?: Booking[];
          pagination?: { page: number; limit: number; total: number; totalPages: number };
        };

        if (result.success && result.data && result.pagination) {
          const filteredBookings = filterBookingsByDate(result.data, activeTab);
          setBookings(filteredBookings);
          setPagination(result.pagination);
        }
      } catch (error) {
        console.error('Failed to fetch bookings:', error);
      } finally {
        setLoading(false);
      }
    },
    [activeTab]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchBookings(page);
  }, [page, fetchBookings]);

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    setPage(1);
  };

  if (loading && bookings.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Bookings</h1>
          <p className="text-foreground-secondary">View and manage your appointments</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap border-b border-gray-200">
          {['all', 'upcoming', 'today', 'completed', 'cancelled'].map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab as FilterTab)}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-brand-pink text-brand-pink'
                  : 'text-foreground-secondary hover:text-foreground'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Bookings List */}
        {bookings.length > 0 ? (
          <>
            <div className="space-y-4 mb-8">
              {bookings.map((booking) => (
                <Link key={booking._id} href={`/booking/${booking._id}`}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      {/* Left side - Booking info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <h3 className="font-bold text-lg text-foreground">
                            {booking.bookingNumber}
                          </h3>
                          <Badge variant={STATUS_COLORS[booking.status]}>
                            {STATUS_LABELS[booking.status]}
                          </Badge>
                          <Badge variant={PAYMENT_STATUS_COLORS[booking.paymentStatus] || 'warning'}>
                            {PAYMENT_STATUS_LABELS[booking.paymentStatus] || 'Payment Pending'}
                          </Badge>
                        </div>

                        {/* Booking details */}
                        <div className="space-y-2 text-sm text-foreground-secondary">
                          {/* Salon */}
                          <div className="flex items-center gap-2">
                            <MapPin size={16} />
                            <span>{booking.salon.name}</span>
                          </div>

                          {/* Barber */}
                          <div className="flex items-center gap-2">
                            <User size={16} />
                            <span>{booking.barber.name}</span>
                          </div>

                          {/* Service */}
                          <div className="text-sm text-foreground-secondary">
                            <span className="font-medium">{booking.service.name}</span>
                          </div>

                          {/* Date and time */}
                          <div className="flex items-center gap-2">
                            <Calendar size={16} />
                            <span>
                              {new Date(booking.appointmentDate).toLocaleDateString()} at{' '}
                              {booking.startTime}
                            </span>
                          </div>

                          {/* Duration */}
                          <div className="flex items-center gap-2">
                            <Clock size={16} />
                            <span>{booking.service.duration} minutes</span>
                          </div>
                        </div>
                      </div>

                      {/* Right side - Price and action */}
                      <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                        <div className="text-right">
                          <p className="text-sm text-foreground-secondary">Total Amount</p>
                          <p className="text-2xl font-bold text-brand-pink">
                            {formatCurrency(booking.totalAmount)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                          <ChevronRight size={16} className="text-foreground-secondary" />
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <Button
                  variant="ghost"
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>

                {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, i) => {
                  const pageNum = page > 3 ? page - 2 + i : i + 1;
                  if (pageNum > pagination.totalPages) return null;
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === page ? 'primary' : 'ghost'}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}

                <Button
                  variant="ghost"
                  disabled={page === pagination.totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-foreground-secondary mb-6">No bookings found</p>
            <Link href="/book/salons">
              <Button variant="primary">
                Book an Appointment
              </Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
