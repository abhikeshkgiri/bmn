/**
 * GET /api/payments/booking/[bookingId]
 * Get payment details for a booking
 * Requires authentication and customer ownership
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getPaymentByBooking } from '@/services/payment.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    // Authenticate user
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

    const { bookingId } = await params;

    // Validate booking ID format
    if (!bookingId || !/^[0-9a-f]{24}$/i.test(bookingId)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid booking ID',
          },
        },
        { status: 400 }
      );
    }

    // Get payment details
    const payment = await getPaymentByBooking(bookingId, currentUser);

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PAYMENT_NOT_FOUND',
            message: 'Payment not found for this booking',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          paymentId: payment._id,
          bookingId: payment.booking,
          amount: payment.amount,
          currency: payment.currency,
          method: payment.method,
          provider: payment.provider,
          status: payment.status,
          refundAmount: payment.refundAmount || 0,
          refundPending: Boolean(payment.refundRequestId),
          refundRequestStatus: payment.refundRequestStatus ?? null,
          createdAt: payment.createdAt,
          updatedAt: payment.updatedAt,
          paidAt: payment.paidAt ?? null,
          // Do NOT expose sensitive data:
          // providerOrderId, providerPaymentId, providerSignature, metadata
        },
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle payment service errors
    if (error && typeof error === 'object' && 'code' in error) {
      const paymentError = error as Record<string, unknown>;
      const statusCode =
        paymentError.code === 'UNAUTHORIZED'
          ? 401
          : paymentError.code === 'FORBIDDEN'
            ? 403
            : paymentError.code === 'BOOKING_NOT_FOUND'
              ? 404
              : 400;

      return NextResponse.json(
        {
          success: false,
          error: {
            code: paymentError.code,
            message: paymentError.message,
          },
        },
        { status: statusCode }
      );
    }

    // Handle unexpected errors
    console.error('Get payment error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch payment details',
        },
      },
      { status: 500 }
    );
  }
}
