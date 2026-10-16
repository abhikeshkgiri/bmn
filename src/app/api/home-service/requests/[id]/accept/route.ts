import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { transitionHomeService } from '@/services/home-service.service';
import { HomeServiceStatus } from '@/models/Booking';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  try {
    return NextResponse.json({ success: true, data: await transitionHomeService(user, (await params).id, HomeServiceStatus.ACCEPTED) });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'ERROR', message: 'Unable to accept request' } }, { status: 400 });
  }
}
