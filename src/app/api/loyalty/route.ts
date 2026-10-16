import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getLoyaltyStats } from '@/services/loyalty.service';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'CUSTOMER') return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  return NextResponse.json({ success: true, data: await getLoyaltyStats(user._id) });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'CUSTOMER') return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  const body = await request.json() as { points?: number };
  const points = Number(body.points);
  if (!Number.isInteger(points) || points <= 0) return NextResponse.json({ success: false, error: 'Invalid points amount' }, { status: 400 });
  try {
    return NextResponse.json({ success: true, data: await import('@/services/loyalty.service').then((service) => service.redeemLoyaltyPoints(user._id, points)) });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to redeem points' }, { status: 400 });
  }
}
