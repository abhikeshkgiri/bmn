import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { USER_ROLES } from '@/constants/roles';
import Barber from '@/models/Barber';
import { getBarberDashboardStats } from '@/services/booking.service';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
    }

    if (currentUser.role !== USER_ROLES.BARBER) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
    }

    const barber = await Barber.findOne({ user: currentUser._id });
    if (!barber) {
      return NextResponse.json({ success: false, error: { code: 'BARBER_NOT_FOUND', message: 'Barber profile not found for this user' } }, { status: 404 });
    }

    const dashboard = await getBarberDashboardStats(barber._id.toString(), currentUser);
    return NextResponse.json({ success: true, data: dashboard }, { status: 200 });
  } catch (error) {
    console.error('Barber dashboard stats error:', error);
    return NextResponse.json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to load barber stats' } }, { status: 500 });
  }
}
