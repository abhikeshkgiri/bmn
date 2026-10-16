import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/admin';
import { requireAuth } from '@/lib/auth';
import { getAdminAnalytics } from '@/services/admin.service';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    requireAdminAccess(currentUser);
    const { searchParams } = new URL(request.url);
    const rangeDays = Number(searchParams.get('rangeDays') ?? '30');
    const analytics = await getAdminAnalytics(Number.isFinite(rangeDays) ? rangeDays : 30);
    return NextResponse.json({ success: true, data: analytics });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 });
  }
}
