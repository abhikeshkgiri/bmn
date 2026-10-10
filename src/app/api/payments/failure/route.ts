/**
 * POST /api/payments/failure
 * Record payment failure without marking booking as paid
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { recordPaymentFailure } from '@/services/payment.service';
import { PaymentFailureSchema } from '@/validations/payment.schema';
import { ZodError } from 'zod';

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

    // Parse and validate request body
    const body = await request.json();
    const validatedInput = PaymentFailureSchema.parse(body);

    // Record payment failure
    await recordPaymentFailure(
      validatedInput.bookingId,
      validatedInput.razorpay_order_id,
      currentUser,
      validatedInput.error_code,
      validatedInput.error_description
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Payment failure reported',
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

    if (error && typeof error === 'object' && 'code' in error) {
      const paymentError = error as { code: string; message?: string };
      const statusCode =
        paymentError.code === 'UNAUTHORIZED'
          ? 401
          : paymentError.code === 'FORBIDDEN'
            ? 403
            : paymentError.code === 'BOOKING_NOT_FOUND' || paymentError.code === 'PAYMENT_NOT_FOUND'
              ? 404
              : 400;
      return NextResponse.json(
        { success: false, error: { code: paymentError.code, message: paymentError.message } },
        { status: statusCode },
      );
    }

    // Handle unexpected errors
    console.error('Record payment failure error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to record payment failure',
        },
      },
      { status: 500 }
    );
  }
}
