/**
 * POST /api/payments/verify
 * Verify Razorpay payment signature and confirm payment
 * Requires authentication and customer role
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { verifyRazorpayPayment } from '@/services/payment.service';
import { VerifyPaymentSchema } from '@/validations/payment.schema';
import { ZodError } from 'zod';
import { isRateLimited } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
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

    if (isRateLimited(`payment-verify:${currentUser._id}`, 10, 10 * 60 * 1000)) {
      return NextResponse.json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many payment verification attempts' } }, { status: 429 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedInput = VerifyPaymentSchema.parse(body);

    // Verify payment signature and confirm
    const payment = await verifyRazorpayPayment(
      validatedInput.bookingId,
      validatedInput.razorpay_order_id,
      validatedInput.razorpay_payment_id,
      validatedInput.razorpay_signature,
      currentUser
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          paymentId: payment._id,
          bookingId: payment.booking,
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          method: payment.method,
          provider: payment.provider,
          paidAt: payment.paidAt ?? null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('PRODUCTION_CONFIG_ERROR:')) {
      return NextResponse.json(
        { success: false, error: { code: 'PAYMENT_CONFIGURATION', message: 'Payment verification is temporarily unavailable. Your payment may still be reconciled; please contact support before retrying.' } },
        { status: 503 },
      );
    }

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

    // Handle payment service errors
    if (error && typeof error === 'object' && 'code' in error) {
      const paymentError = error as Record<string, unknown>;
      const statusCode =
        paymentError.code === 'UNAUTHORIZED'
          ? 401
          : paymentError.code === 'FORBIDDEN'
            ? 403
            : paymentError.code === 'BOOKING_NOT_FOUND' || paymentError.code === 'PAYMENT_NOT_FOUND'
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
    console.error('Verify payment error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to verify payment',
        },
      },
      { status: 500 }
    );
  }
}
