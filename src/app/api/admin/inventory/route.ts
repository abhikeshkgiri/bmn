import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { requireAdminAccess } from '@/lib/admin';
import { adjustInventory, listInventory } from '@/services/admin-operations.service';

export async function GET(request: NextRequest) {
  try {
    requireAdminAccess(await requireAuth());
    return NextResponse.json({ success: true, data: await listInventory(new URL(request.url).searchParams.get('salonId') ?? undefined) });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'ERROR', message: 'Unable to load inventory' } }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = requireAdminAccess(await requireAuth());
    return NextResponse.json({ success: true, data: await adjustInventory(actor, await request.json()) });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'ERROR', message: 'Unable to adjust inventory' } }, { status: 400 });
  }
}
