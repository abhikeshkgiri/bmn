import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { USER_ROLES } from '@/constants/roles';
import Barber from '@/models/Barber';
import { getBarberDashboardStats } from '@/services/booking.service';

const BarberDashboardQuerySchema = z.object({
  barberId: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    if (currentUser.role !== USER_ROLES.BARBER) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = BarberDashboardQuerySchema.parse({
      barberId: searchParams.get('barberId') || undefined,
    });

    const barber = await Barber.findOne({ user: currentUser._id }).lean();
    if (!barber) {
      return NextResponse.json(
        { success: false, error: { code: 'BARBER_NOT_FOUND', message: 'Barber profile not found for this user' } },
        { status: 404 }
      );
    }

    const barberId = query.barberId || barber._id.toString();
    if (barberId !== barber._id.toString()) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const dashboard = await getBarberDashboardStats(barber._id.toString(), currentUser);
    return NextResponse.json({ success: true, data: dashboard }, { status: 200 });
  } catch (error) {
    console.error('Barber dashboard error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to load dashboard' } },
      { status: 500 }
    );
  }
}
