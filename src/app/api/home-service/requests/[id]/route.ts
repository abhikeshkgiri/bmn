import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getHomeServiceBooking, transitionHomeService } from '@/services/home-service.service';
import { HomeServiceStatus } from '@/models/Booking';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  try {
    return NextResponse.json({ success: true, data: await getHomeServiceBooking(user, (await params).id) });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Home-service booking access denied' } }, { status: 403 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  try {
    const body = await request.json() as { status?: HomeServiceStatus };
    if (!body.status || !Object.values(HomeServiceStatus).includes(body.status)) throw new Error('INVALID_STATUS');
    return NextResponse.json({ success: true, data: await transitionHomeService(user, (await params).id, body.status) });
  } catch (error) {
    const message = error instanceof Error && error.message === 'INVALID_STATUS' ? 'Invalid home-service status' : 'Unable to update home-service status';
    return NextResponse.json({ success: false, error: { code: 'ERROR', message } }, { status: 400 });
  }
}
