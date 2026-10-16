import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getLoyaltyHistory } from '@/services/loyalty.service';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'CUSTOMER') return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') || 1));
  const limit = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get('limit') || 10)));
  return NextResponse.json({ success: true, ...(await getLoyaltyHistory(user._id, page, limit)) });
}
