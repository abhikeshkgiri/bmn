import { NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/admin';
import { requireAuth } from '@/lib/auth';
import { getAdminDashboardStats } from '@/services/admin.service';

export async function GET() {
  try {
    const currentUser = await requireAuth();
    requireAdminAccess(currentUser);
    const stats = await getAdminDashboardStats();
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    if (error instanceof Error && error.message === 'You do not have permission to access this resource.') {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'You must be logged in to access this resource.') {
      return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: { code: 'ERROR', message: 'Unable to load admin dashboard' } }, { status: 500 });
  }
}
