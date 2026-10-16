import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { requireAdminAccess } from '@/lib/admin';
import { createCommissionForBooking, listCommissions } from '@/services/admin-operations.service';

export async function POST(request: NextRequest) {
  try {
    const actor = requireAdminAccess(await requireAuth());
    const body = await request.json();
    if (typeof body.bookingId !== 'string') throw new Error('INVALID_BOOKING');
    return NextResponse.json({ success: true, data: await createCommissionForBooking(actor, body.bookingId) }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: { code: 'ERROR', message: error instanceof Error ? error.message : 'Unable to calculate commission' } }, { status: 400 });
  }
}

export async function GET() {
  try {
    requireAdminAccess(await requireAuth());
    return NextResponse.json({ success: true, data: await listCommissions() });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'ERROR', message: 'Unable to calculate commission' } }, { status: 400 });
  }
}
