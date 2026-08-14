/**
 * GET /api/bookings/availability
 * Get available time slots for a barber on a given date
 */

import { NextRequest, NextResponse } from 'next/server';
import { AvailabilityQuerySchema } from '@/validations/booking.schema';
import { getAvailableSlots } from '@/services/booking.service';
import { ZodError } from 'zod';

export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryData = {
      salonId: searchParams.get('salonId'),
      barberId: searchParams.get('barberId'),
      serviceId: searchParams.get('serviceId'),
      date: searchParams.get('date'),
    };

    // Validate query parameters
    const validatedQuery = AvailabilityQuerySchema.parse(queryData);

    // Get available slots
    const availability = await getAvailableSlots(
      validatedQuery.salonId,
      validatedQuery.barberId,
      validatedQuery.serviceId,
      validatedQuery.date
    );

    return NextResponse.json(
      {
        success: true,
        data: availability,
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
        { status: 422 }
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

    console.error('Availability check error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to fetch availability',
        },
      },
      { status: 500 }
    );
  }
}
