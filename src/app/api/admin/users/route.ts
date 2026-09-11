import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/admin';
import { requireAuth } from '@/lib/auth';
import { listUsers, updateUserStatusAsAdmin } from '@/services/admin.service';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    requireAdminAccess(currentUser);
    const { searchParams } = new URL(request.url);
    const result = await listUsers({
      page: Number(searchParams.get('page') ?? '1'),
      limit: Number(searchParams.get('limit') ?? '10'),
      search: searchParams.get('search') ?? undefined,
      role: searchParams.get('role') ?? undefined,
      isActive: searchParams.get('isActive') ?? undefined,
    });
    return NextResponse.json({ success: true, data: result.users, pagination: { total: result.total, page: result.page, limit: result.limit, pages: result.pages } });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    requireAdminAccess(currentUser);
    const body = await request.json();
    if (typeof body.userId !== 'string' || typeof body.isActive !== 'boolean') throw new Error('INVALID_INPUT');
    if (body.userId === currentUser._id) throw new Error('SELF_DEACTIVATION_FORBIDDEN');
    const user = await updateUserStatusAsAdmin(currentUser, body.userId, body.isActive);
    return NextResponse.json({ success: true, data: user });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'ERROR', message: 'Unable to update user status' } }, { status: 400 });
  }
}
