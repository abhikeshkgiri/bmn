import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/admin';
import { requireAuth } from '@/lib/auth';
import { listBarbersForAdmin, updateBarberVerification } from '@/services/admin.service';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    requireAdminAccess(currentUser);
    const { searchParams } = new URL(request.url);
    const result = await listBarbersForAdmin({
      page: Number(searchParams.get('page') ?? '1'),
      limit: Number(searchParams.get('limit') ?? '10'),
      search: searchParams.get('search') ?? undefined,
      status: searchParams.get('status') ?? undefined,
    });
    return NextResponse.json({ success: true, data: result.barbers, pagination: { total: result.total, page: result.page, limit: result.limit, pages: result.pages } });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    requireAdminAccess(currentUser);
    const body = await request.json();
    if (typeof body.barberId !== 'string' || typeof body.isVerified !== 'boolean') throw new Error('INVALID_INPUT');
    const barber = await updateBarberVerification(currentUser, body.barberId, body.isVerified, typeof body.reason === 'string' ? body.reason.trim() : undefined);
    return NextResponse.json({ success: true, data: barber });
  } catch (error) {
    const message = error instanceof Error && error.message === 'INVALID_INPUT' ? 'Invalid barber approval request' : 'Unable to update barber verification';
    return NextResponse.json({ success: false, error: { code: 'ERROR', message } }, { status: 400 });
  }
}
