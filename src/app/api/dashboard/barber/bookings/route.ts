import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { USER_ROLES } from '@/constants/roles';
import Barber from '@/models/Barber';
import { getBarberBookings } from '@/services/booking.service';

const BarberDashboardBookingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
    }

    if (currentUser.role !== USER_ROLES.BARBER) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = BarberDashboardBookingsQuerySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status') || undefined,
    });

    const barber = await Barber.findOne({ user: currentUser._id });
    if (!barber) {
      return NextResponse.json({ success: false, error: { code: 'BARBER_NOT_FOUND', message: 'Barber profile not found for this user' } }, { status: 404 });
    }

    const { bookings, pagination } = await getBarberBookings(barber._id.toString(), currentUser, query);
    return NextResponse.json({ success: true, data: bookings, pagination }, { status: 200 });
  } catch (error) {
    console.error('Dashboard barber bookings error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Invalid query parameters', details: error.issues } }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch barber bookings' } }, { status: 500 });
  }
}
