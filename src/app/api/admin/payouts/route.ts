import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { requireAdminAccess } from '@/lib/admin';
import { listPayouts, transitionPayout } from '@/services/admin-operations.service';
import { PayoutStatus } from '@/models/Payout';

export async function GET() {
  try {
    requireAdminAccess(await requireAuth());
    return NextResponse.json({ success: true, data: await listPayouts() });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = requireAdminAccess(await requireAuth());
    const body = await request.json();
    const payout = await transitionPayout(actor, String(body.payoutId), body.status as PayoutStatus);
    return NextResponse.json({ success: true, data: payout });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'ERROR', message: 'Invalid payout transition' } }, { status: 400 });
  }
}
