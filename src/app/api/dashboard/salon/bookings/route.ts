import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { USER_ROLES, type UserRole } from '@/constants/roles';
import { getSalonBookings } from '@/services/booking.service';

const salonDashboardRoles: UserRole[] = [
  USER_ROLES.SALON_OWNER,
  USER_ROLES.ADMIN,
  USER_ROLES.SUPER_ADMIN,
];

const SalonDashboardBookingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
  barberId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
    }

    if (!salonDashboardRoles.includes(currentUser.role)) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = SalonDashboardBookingsQuerySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status') || undefined,
      paymentStatus: searchParams.get('paymentStatus') || undefined,
      barberId: searchParams.get('barberId') || undefined,
    });

    const { bookings, pagination } = await getSalonBookings(currentUser._id, currentUser, query);
    return NextResponse.json({ success: true, data: bookings, pagination }, { status: 200 });
  } catch (error) {
    console.error('Dashboard salon bookings error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Invalid query parameters', details: error.issues } }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch salon bookings' } }, { status: 500 });
  }
}
