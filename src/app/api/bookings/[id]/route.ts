/**
 * GET /api/bookings/[id] - Get booking details
 * PATCH /api/bookings/[id] - Update booking
 * DELETE /api/bookings/[id] - Delete booking (soft delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getBookingById } from '@/services/booking.service';

interface Params {
  id: string;
}

/**
 * GET /api/bookings/[id]
 * Get single booking details with authorization
 */
export async function GET(request: NextRequest, { params }: { params: Promise<Params> }) {
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

    // Get booking with authorization checks
    const booking = await getBookingById(id, currentUser);

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Booking not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: booking,
      },
      { status: 200 }
    );
  } catch (error) {
    // Handle authorization errors
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
        { status: 403 }
      );
    }

    console.error('Booking fetch error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch booking',
        },
      },
      { status: 500 }
    );
  }
}
