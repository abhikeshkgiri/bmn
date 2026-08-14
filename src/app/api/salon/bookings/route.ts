import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { USER_ROLES } from '@/constants/roles';
import Salon from '@/models/Salon';
import { getSalonBookings } from '@/services/booking.service';

const SalonBookingQuerySchema = z.object({
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
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    if (![USER_ROLES.SALON_OWNER, USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const query = SalonBookingQuerySchema.parse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      status: searchParams.get('status') || undefined,
      paymentStatus: searchParams.get('paymentStatus') || undefined,
      barberId: searchParams.get('barberId') || undefined,
    });

    const salon = currentUser.role === USER_ROLES.SALON_OWNER
      ? await Salon.findOne({ owner: currentUser._id })
      : null;

    const { bookings, pagination } = await getSalonBookings(
      currentUser._id,
      currentUser,
      {
        page: query.page,
        limit: query.limit,
        status: query.status,
        paymentStatus: query.paymentStatus,
        barberId: query.barberId,
      }
    );

    return NextResponse.json({
      success: true,
      data: bookings,
      pagination,
      salon: salon ? { _id: salon._id.toString(), name: salon.name } : null,
    }, { status: 200 });
  } catch (error) {
    console.error('Salon bookings list error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch bookings' } },
      { status: 500 }
    );
  }
}
