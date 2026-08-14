import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { USER_ROLES } from '@/constants/roles';
import Salon from '@/models/Salon';
import { getSalonDashboardStats } from '@/services/booking.service';

export async function GET() {
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

    const salon = await Salon.findOne({ owner: currentUser._id }).lean();
    if (!salon) {
      return NextResponse.json(
        { success: false, error: { code: 'SALON_NOT_FOUND', message: 'Salon not found for this owner' } },
        { status: 404 }
      );
    }

    const dashboard = await getSalonDashboardStats(salon._id.toString(), currentUser);

    return NextResponse.json({ success: true, data: dashboard }, { status: 200 });
  } catch (error) {
    console.error('Salon dashboard error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to load dashboard' } },
      { status: 500 }
    );
  }
}
