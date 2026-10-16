import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getMembership } from '@/services/membership.service';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'CUSTOMER') return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  return NextResponse.json({ success: true, data: await getMembership(user._id) });
}
