import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/admin';
import { requireAuth } from '@/lib/auth';
import { AdminInputError, listSalonsForAdmin, updateSalonVerification } from '@/services/admin.service';
import type { AuthUser } from '@/types';

export async function GET(request: NextRequest) {
  let currentUser: AuthUser;
  try {
    currentUser = await requireAuth();
    requireAdminAccess(currentUser);
  } catch {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 });
  }

  try {
    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') ?? undefined;
    if (status && !['pending', 'active', 'rejected'].includes(status)) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_FILTER', message: 'Unsupported salon status filter' } }, { status: 400 });
    }
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    if ((fromDate && Number.isNaN(fromDate.getTime())) || (toDate && Number.isNaN(toDate.getTime()))) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_FILTER', message: 'Invalid submission date filter' } }, { status: 400 });
    }
    const result = await listSalonsForAdmin({
      page: Number(searchParams.get('page') ?? '1'),
      limit: Number(searchParams.get('limit') ?? '10'),
      search: searchParams.get('search') ?? undefined,
      status,
      city: searchParams.get('city') ?? undefined,
      from: fromDate,
      to: toDate,
    });
    return NextResponse.json({ success: true, data: result.salons, pagination: { total: result.total, page: result.page, limit: result.limit, pages: result.pages } });
  } catch (error) {
    console.error('Admin salon list failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ success: false, error: { code: 'ADMIN_SALON_LIST_UNAVAILABLE', message: 'Unable to load salon applications. Please retry.' } }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  let currentUser: AuthUser;
  try {
    currentUser = await requireAuth();
    requireAdminAccess(currentUser);
  } catch {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 });
  }

  try {
    const body = await request.json();
    if (
      typeof body.salonId !== 'string' ||
      typeof body.isVerified !== 'boolean' ||
      (body.isVerified === false && (typeof body.reason !== 'string' || !body.reason.trim()))
    ) throw new AdminInputError('Invalid salon approval request');
    const salon = await updateSalonVerification(currentUser, body.salonId, body.isVerified, typeof body.reason === 'string' ? body.reason.trim() : undefined);
    return NextResponse.json({ success: true, data: salon });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('CITY_NOT_SUPPORTED:')) {
      return NextResponse.json({ success: false, error: { code: 'CITY_NOT_SUPPORTED', message: error.message.split(':').slice(1).join(':').trim() } }, { status: 422 });
    }
    if (error instanceof AdminInputError) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT', message: error.message } }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'SALON_NOT_FOUND') {
      return NextResponse.json({ success: false, error: { code: 'SALON_NOT_FOUND', message: 'Salon application not found.' } }, { status: 404 });
    }
    console.error('Admin salon decision failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ success: false, error: { code: 'ADMIN_SALON_UPDATE_FAILED', message: 'Unable to update salon approval. Please retry.' } }, { status: 500 });
  }
}
