import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getBookingById } from '@/services/booking.service';

interface Params {
  id: string;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<Params> }
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
    const booking = await getBookingById(id, currentUser);

    if (!booking) {
      return NextResponse.json(
        { success: false, error: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: booking }, { status: 200 });
  } catch (error) {
    const bookingError = error as Record<string, unknown>;
    const statusCode = bookingError.code === 'UNAUTHORIZED' ? 403 : 404;

    return NextResponse.json(
      {
        success: false,
        error: {
          code: bookingError.code || 'SERVER_ERROR',
          message: bookingError.message || 'Failed to fetch booking',
        },
      },
      { status: statusCode }
    );
  }
}
