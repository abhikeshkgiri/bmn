import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { requireAdminAccess } from '@/lib/admin';
import { createLeave, listLeaves } from '@/services/admin-operations.service';

export async function GET() {
  try {
    requireAdminAccess(await requireAuth());
    return NextResponse.json({ success: true, data: await listLeaves() });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'ERROR', message: 'Unable to load leave records' } }, { status: 400 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = requireAdminAccess(await requireAuth());
    return NextResponse.json({ success: true, data: await createLeave(actor, await request.json()) }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'ERROR', message: 'Unable to create leave record' } }, { status: 400 });
  }
}
