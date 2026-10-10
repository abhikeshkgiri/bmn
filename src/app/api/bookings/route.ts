/**
 * POST /api/bookings - Create a new booking
 * GET /api/bookings - Get customer's bookings
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { BookingCreateSchema, BookingListQuerySchema } from '@/validations/booking.schema';
import {
  createBooking,
  getCustomerBookings,
} from '@/services/booking.service';
import { ZodError } from 'zod';
import { isRateLimited } from '@/lib/rate-limit';

/**
 * POST /api/bookings
 * Create a new booking
 */
export async function POST(request: NextRequest) {
  try {
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
    if (currentUser.role !== 'CUSTOMER') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Only customers can create bookings' } },
        { status: 403 }
      );
    }

    if (isRateLimited(`booking:${currentUser._id}`, 10, 10 * 60 * 1000)) {
      return NextResponse.json({ success: false, error: { code: 'RATE_LIMITED', message: 'Too many booking attempts' } }, { status: 429 });
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
    const validatedInput = BookingCreateSchema.parse(body);

    // Create booking through service layer
    const booking = await createBooking({
      ...validatedInput,
      currentUser,
    });

    return NextResponse.json(
      {
        success: true,
        data: booking,
      },
      { status: 201 }
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
      return NextResponse.json(
        {
          success: false,
          error: {
            code: bookingError.code,
            message: bookingError.message,
          },
        },
        { status: 400 }
      );
    }

    console.error('Booking creation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to create booking',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bookings
 * Get customer's bookings
 */
export async function GET(request: NextRequest) {
  try {
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
    if (currentUser.role !== 'CUSTOMER') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Only customers can view customer bookings' } },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryData = {
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      paymentStatus: searchParams.get('paymentStatus') ?? undefined,
      sortBy: searchParams.get('sortBy') ?? undefined,
      sortOrder: searchParams.get('sortOrder') ?? undefined,
    };

    // Validate query parameters
    const validatedQuery = BookingListQuerySchema.parse(queryData);

    // Get customer bookings
    const { bookings, pagination } = await getCustomerBookings(currentUser._id, {
      page: validatedQuery.page,
      limit: validatedQuery.limit,
      status: validatedQuery.status,
      paymentStatus: validatedQuery.paymentStatus,
      sortBy: validatedQuery.sortBy,
      sortOrder: validatedQuery.sortOrder,
    });

    return NextResponse.json(
      {
        success: true,
        data: bookings,
        pagination,
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
            message: 'Invalid query parameters',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    console.error('Booking list error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch bookings',
        },
      },
      { status: 500 }
    );
  }
}
