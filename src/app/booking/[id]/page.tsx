'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Loading';
import { BOOKING_STATUS } from '@/constants/booking';
import { formatCurrency } from '@/utils/currency';
import { BOOKING_CANCELLATION_MINUTES } from '@/constants/booking-config';
import { Calendar, MapPin, Clock } from 'lucide-react';

interface Booking {
  _id: string;
  bookingNumber: string;
  salon: {
    _id: string;
    name: string;
    slug: string;
  };
  barber: {
    _id: string;
    name: string;
    profileImage?: string;
  };
  service: {
    _id: string;
    name: string;
    duration: number;
  };
  appointmentDate: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalAmount: number;
  servicePrice: number;
  discountAmount: number;
  taxAmount: number;
  status: string;
  paymentStatus: string;
  bookingType: string;
  customerNotes?: string;
  createdAt: string;
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

export default function BookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [canCancel, setCanCancel] = useState(false);

  const fetchBooking = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bookings/${bookingId}`);
      const result = await response.json();

      if (result.success) {
        setBooking(result.data);
      } else {
        setError(result.error?.message || 'Failed to load booking');
      }
    } catch (err) {
      setError('Failed to load booking');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  const checkCancellationEligibility = useCallback(() => {
    if (!booking) return;

    const appointmentDateTime = new Date(booking.appointmentDate);
    const [hours, minutes] = booking.startTime.split(':').map(Number);
    appointmentDateTime.setHours(hours, minutes, 0, 0);

    const now = new Date();
    const minutesUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60);

    setCanCancel(
      booking.status !== BOOKING_STATUS.CANCELLED &&
        booking.status !== BOOKING_STATUS.COMPLETED &&
        minutesUntilAppointment >= BOOKING_CANCELLATION_MINUTES
    );
  }, [booking]);

   
  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

   
  useEffect(() => {
    if (booking) {
      checkCancellationEligibility();
    }
  }, [booking, checkCancellationEligibility]);

  const handleCancel = async () => {
    if (!booking || !window.confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      setCancelling(true);
      const response = await fetch(`/api/bookings/${booking._id}/cancel`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancellationReason: 'Customer cancelled',
        }),
      });

      const result = await response.json();

      if (result.success) {
        setBooking(result.data);
        alert('Booking cancelled successfully');
      } else {
        alert('Error: ' + result.error?.message);
      }
    } catch {
      alert('Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <Card className="p-8 text-center">
            <p className="text-foreground-secondary mb-6">{error || 'Booking not found'}</p>
            <Button variant="primary" onClick={() => router.push('/bookings')}>
              Back to Bookings
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-foreground">{booking.bookingNumber}</h1>
            <Badge variant={STATUS_COLORS[booking.status]}>
              {STATUS_LABELS[booking.status]}
            </Badge>
          </div>
          <p className="text-foreground-secondary">
            Booked on {new Date(booking.createdAt).toLocaleDateString()}
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Salon Info */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Salon</h2>
            <div className="space-y-2">
              <p className="font-medium text-foreground">{booking.salon.name}</p>
              <Button variant="ghost" onClick={() => router.push(`/salons/${booking.salon.slug}`)}>
                View Salon
              </Button>
            </div>
          </Card>

          {/* Barber Info */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Barber</h2>
            <div className="flex items-start gap-4">
              {booking.barber.profileImage && (
                <img
                  src={booking.barber.profileImage}
                  alt={booking.barber.name}
                  className="w-16 h-16 rounded-full object-cover bg-gray-200"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              <div>
                <p className="font-medium text-foreground">{booking.barber.name}</p>
              </div>
            </div>
          </Card>

          {/* Appointment Details */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">Appointment Details</h2>
            <div className="space-y-3">
              {/* Service */}
              <div className="flex items-start gap-3">
                <div className="text-brand-pink mt-1">
                  <div className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-foreground-secondary">Service</p>
                  <p className="font-medium text-foreground">{booking.service.name}</p>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-start gap-3">
                <Calendar size={18} className="text-brand-pink mt-1" />
                <div>
                  <p className="text-sm text-foreground-secondary">Date</p>
                  <p className="font-medium text-foreground">
                    {new Date(booking.appointmentDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* Time */}
              <div className="flex items-start gap-3">
                <Clock size={18} className="text-brand-pink mt-1" />
                <div>
                  <p className="text-sm text-foreground-secondary">Time</p>
                  <p className="font-medium text-foreground">
                    {booking.startTime} - {booking.endTime}
                  </p>
                </div>
              </div>

              {/* Duration */}
              <div className="flex items-start gap-3">
                <Clock size={18} className="text-brand-pink mt-1" />
                <div>
                  <p className="text-sm text-foreground-secondary">Duration</p>
                  <p className="font-medium text-foreground">{booking.duration} minutes</p>
                </div>
              </div>

              {/* Booking Type */}
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-brand-pink mt-1" />
                <div>
                  <p className="text-sm text-foreground-secondary">Booking Type</p>
                  <p className="font-medium text-foreground">
                    {booking.bookingType === 'SALON' ? 'At Salon' : 'Home Service'}
                  </p>
                </div>
              </div>
            </div>

            {/* Customer Notes */}
            {booking.customerNotes && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-foreground-secondary mb-2">Notes</p>
                <p className="text-foreground">{booking.customerNotes}</p>
              </div>
            )}
          </Card>

          {/* Price Summary */}
          <Card className="p-6 bg-background">
            <h2 className="text-xl font-bold text-foreground mb-4">Price Summary</h2>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-foreground-secondary">Service Price</span>
                <span className="font-medium text-foreground">{formatCurrency(booking.servicePrice)}</span>
              </div>
              {booking.discountAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-foreground-secondary">Discount</span>
                  <span className="font-medium text-foreground">
                    -{formatCurrency(booking.discountAmount)}
                  </span>
                </div>
              )}
              {booking.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-foreground-secondary">Tax</span>
                  <span className="font-medium text-foreground">+{formatCurrency(booking.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-border">
                <span className="font-medium text-foreground">Total Amount</span>
                <span className="text-2xl font-bold text-brand-pink">
                  {formatCurrency(booking.totalAmount)}
                </span>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {canCancel && (
              <Button
                variant="ghost"
                fullWidth
                onClick={handleCancel}
                disabled={cancelling}
                className="text-red-600 hover:text-red-700"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Booking'}
              </Button>
            )}
            <Button
              variant="primary"
              fullWidth
              onClick={() => router.push('/bookings')}
            >
              Back to Bookings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
