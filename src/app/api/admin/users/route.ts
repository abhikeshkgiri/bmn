import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/admin';
import { requireAuth } from '@/lib/auth';
import { AdminInputError, listUsers, updateUserStatusAsAdmin } from '@/services/admin.service';
import { z, ZodError } from 'zod';
import type { AuthUser } from '@/types';

const UserStatusSchema = z.object({
  userId: z.string().regex(/^[a-f\d]{24}$/i),
  isActive: z.boolean(),
}).strict();

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
  let currentUser: AuthUser;
  try {
    currentUser = await requireAuth();
    requireAdminAccess(currentUser);
  } catch {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 });
  }

  try {
    const body = UserStatusSchema.parse(await request.json());
    const user = await updateUserStatusAsAdmin(currentUser, body.userId, body.isActive);
    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT', message: 'Provide a valid user and active status.' } }, { status: 400 });
    }
    if (error instanceof AdminInputError) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_INPUT', message: error.message } }, { status: 400 });
    }
    if (error instanceof Error && error.message === 'USER_NOT_FOUND') {
      return NextResponse.json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found.' } }, { status: 404 });
    }
    console.error('Admin user status update failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ success: false, error: { code: 'ADMIN_USER_UPDATE_FAILED', message: 'Unable to update user status. Please retry.' } }, { status: 500 });
  }
}
