/**
 * POST /api/payments/create-order
 * Create Razorpay order for a booking
 * Requires authentication and customer role
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createRazorpayOrder } from '@/services/payment.service';
import { CreatePaymentOrderSchema } from '@/validations/payment.schema';
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
    const validatedInput = CreatePaymentOrderSchema.parse(body);

    // Create Razorpay order
    const orderData = await createRazorpayOrder(validatedInput.bookingId, currentUser);

    return NextResponse.json(
      {
        success: true,
        data: orderData,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('PRODUCTION_CONFIG_ERROR:')) {
      return NextResponse.json(
        { success: false, error: { code: 'PAYMENT_CONFIGURATION', message: 'Online payments are not configured yet. Please contact support or try again later.' } },
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
            : paymentError.code === 'BOOKING_NOT_FOUND'
              ? 404
                : paymentError.code === 'ORDER_CREATION_IN_PROGRESS'
                  ? 409
                  : paymentError.code === 'ORDER_CREATION_UNKNOWN'
                    ? 409
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
    console.error('Create order error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create payment order',
        },
      },
      { status: 500 }
    );
  }
}
