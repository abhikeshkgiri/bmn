/**
 * PATCH /api/bookings/[id]/status
 * Update booking status (admin/salon staff only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { updateBookingStatus } from '@/services/booking.service';
import { BookingIdSchema, BookingStatusUpdateSchema } from '@/validations/booking.schema';
import { ZodError } from 'zod';

interface Params {
  id: string;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const { id } = await params;
    if (!BookingIdSchema.safeParse(id).success) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ID', message: 'Booking ID is invalid' } },
        { status: 400 }
      );
    }

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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Request body must be valid JSON' } },
        { status: 400 }
      );
    }
    const validatedInput = BookingStatusUpdateSchema.parse(body);

    // Update booking status through service layer
    const booking = await updateBookingStatus(id, validatedInput.status, currentUser);

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

    console.error('Booking status update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to update booking status',
        },
      },
      { status: 500 }
    );
  }
}
