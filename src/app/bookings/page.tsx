'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Loading';
import { BOOKING_STATUS } from '@/constants/booking';
import { formatCurrency } from '@/utils/currency';
import { Calendar, MapPin, User, Clock } from 'lucide-react';

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

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 10,
    totalPages: 0,
  });

  const fetchBookings = useCallback(async (pageNum: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bookings?page=${pageNum}&limit=10`);
      const result = await response.json() as {
        success: boolean;
        data?: Booking[];
        pagination?: { page: number; limit: number; total: number; totalPages: number };
      };

      if (result.success && result.data && result.pagination) {
        setBookings(result.data);
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

   
  useEffect(() => {
    fetchBookings(page);
  }, [page, fetchBookings]);

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
                        <div className="flex items-center gap-2 mb-3">
                          <h3 className="font-bold text-lg text-foreground">
                            {booking.bookingNumber}
                          </h3>
                          <Badge variant={STATUS_COLORS[booking.status]}>
                            {STATUS_LABELS[booking.status]}
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
                        <Button variant="primary" size="sm">
                          View Details
                        </Button>
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
            <p className="text-foreground-secondary mb-6">No bookings yet</p>
            <Button variant="primary">
              Book an Appointment
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
