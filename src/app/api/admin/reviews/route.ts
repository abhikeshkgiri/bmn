import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAccess } from '@/lib/admin';
import { requireAuth } from '@/lib/auth';
import { listReviewsForAdmin, moderateReviewAsAdmin } from '@/services/admin.service';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    requireAdminAccess(currentUser);
    const { searchParams } = new URL(request.url);
    const result = await listReviewsForAdmin({
      page: Number(searchParams.get('page') ?? '1'),
      limit: Number(searchParams.get('limit') ?? '10'),
      status: searchParams.get('status') ?? undefined,
      search: searchParams.get('search') ?? undefined,
    });
    return NextResponse.json({ success: true, data: result.reviews, pagination: { total: result.total, page: result.page, limit: result.limit, pages: result.pages } });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Admin access required' } }, { status: 403 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    requireAdminAccess(currentUser);
    const body = await request.json();
    if (typeof body.reviewId !== 'string' || typeof body.status !== 'string') throw new Error('INVALID_INPUT');
    const review = await moderateReviewAsAdmin(currentUser, body.reviewId, body.status, typeof body.reason === 'string' ? body.reason.trim() : undefined);
    return NextResponse.json({ success: true, data: review });
  } catch (error) {
    const message = error instanceof Error && error.message === 'INVALID_INPUT' ? 'Invalid review moderation request' : 'Unable to moderate review';
    return NextResponse.json({ success: false, error: { code: 'ERROR', message } }, { status: 400 });
  }
}
