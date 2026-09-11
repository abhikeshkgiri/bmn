import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/admin';
import { requireAuth } from '@/lib/auth';
import { listSalonsForAdmin, updateSalonVerification } from '@/services/admin.service';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    requireAdminAccess(currentUser);
    const { searchParams } = new URL(request.url);
    const result = await listSalonsForAdmin({
      page: Number(searchParams.get('page') ?? '1'),
      limit: Number(searchParams.get('limit') ?? '10'),
      search: searchParams.get('search') ?? undefined,
      status: searchParams.get('status') ?? undefined,
    });
    return NextResponse.json({ success: true, data: result.salons, pagination: { total: result.total, page: result.page, limit: result.limit, pages: result.pages } });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    requireAdminAccess(currentUser);
    const body = await request.json();
    if (typeof body.salonId !== 'string' || typeof body.isVerified !== 'boolean') throw new Error('INVALID_INPUT');
    const salon = await updateSalonVerification(currentUser, body.salonId, body.isVerified, typeof body.reason === 'string' ? body.reason.trim() : undefined);
    return NextResponse.json({ success: true, data: salon });
  } catch (error) {
    const message = error instanceof Error && error.message === 'INVALID_INPUT' ? 'Invalid salon approval request' : 'Unable to update salon verification';
    return NextResponse.json({ success: false, error: { code: 'ERROR', message } }, { status: 400 });
  }
}
