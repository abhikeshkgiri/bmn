/**
 * PATCH /api/bookings/[id]/cancel
 * Cancel a booking
 * Handles refund if booking is paid
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { cancelBooking } from '@/services/booking.service';
import { processRefund, getPaymentByBooking } from '@/services/payment.service';
import { BookingCancelSchema } from '@/validations/booking.schema';
import { PAYMENT_STATUS } from '@/constants/booking';
import { ZodError } from 'zod';

interface Params {
  id: string;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const { id } = await params;

    // Require authentication
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedInput = BookingCancelSchema.parse(body);

    // Cancel booking through service layer
    const booking = await cancelBooking(id, currentUser, validatedInput.cancellationReason);

    // Handle refund if booking is paid
    if (booking.paymentStatus === PAYMENT_STATUS.PAID) {
      try {
        const payment = await getPaymentByBooking(id, currentUser);
        if (payment && payment.status === PAYMENT_STATUS.PAID) {
          await processRefund(payment._id.toString(), payment.amount, 'Booking cancelled by customer', currentUser);
        }
      } catch (refundError) {
        console.error('Refund processing failed:', refundError);
        // Don't fail the cancellation if refund fails - refund can be retried
        // But return info about refund failure to client
        return NextResponse.json(
          {
            success: true,
            data: booking,
            warning: {
              message: 'Booking cancelled but refund processing failed. Please contact support.',
            },
          },
          { status: 200 }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: booking,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle validation errors
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    // Handle booking service errors
    if (error && typeof error === 'object' && 'code' in error) {
      const bookingError = error as Record<string, unknown>;
      const statusCode = bookingError.code === 'UNAUTHORIZED' ? 403 : bookingError.code === 'BOOKING_NOT_FOUND' ? 404 : 400;
      return NextResponse.json(
        {
          success: false,
          error: {
            code: bookingError.code,
            message: bookingError.message,
          },
        },
        { status: statusCode }
      );
    }

    console.error('Booking cancellation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to cancel booking',
        },
      },
      { status: 500 }
    );
  }
}
