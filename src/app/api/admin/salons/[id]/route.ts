import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/admin';
import { requireAuth } from '@/lib/auth';
import { AdminInputError, getSalonAdminDetails } from '@/services/admin.service';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    requireAdminAccess(user);
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } },
      { status: 403 },
    );
  }

  try {
    const { id } = await params;
    const data = await getSalonAdminDetails(id);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof AdminInputError) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ID', message: error.message } },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message === 'SALON_NOT_FOUND') {
      return NextResponse.json(
        { success: false, error: { code: 'SALON_NOT_FOUND', message: 'Salon application not found.' } },
        { status: 404 },
      );
    }
    console.error('Admin salon detail failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json(
      { success: false, error: { code: 'ADMIN_SALON_DETAIL_UNAVAILABLE', message: 'Unable to load salon application details. Please retry.' } },
      { status: 503 },
    );
  }
}
