import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { updateBookingStatus } from '@/services/booking.service';
import { BOOKING_STATUS_ARRAY } from '@/constants/booking';

const BookingStatusSchema = z.object({
  status: z.enum(BOOKING_STATUS_ARRAY as [string, ...string[]]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validated = BookingStatusSchema.parse(body);
    const booking = await updateBookingStatus(id, validated.status, currentUser);

    return NextResponse.json({ success: true, data: booking }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid request data', details: error.issues } },
        { status: 400 }
      );
    }

    const appError = error as Record<string, unknown>;
    const statusCode = appError.code === 'UNAUTHORIZED' ? 403 : appError.code === 'BOOKING_NOT_FOUND' ? 404 : 400;

    return NextResponse.json(
      {
        success: false,
        error: {
          code: appError.code || 'SERVER_ERROR',
          message: appError.message || 'Failed to update booking status',
        },
      },
      { status: statusCode }
    );
  }
}
