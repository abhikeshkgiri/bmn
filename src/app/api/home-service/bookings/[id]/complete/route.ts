import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { completeHomeService } from '@/services/home-service.service';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  try {
    return NextResponse.json({ success: true, data: await completeHomeService(user, (await params).id) });
  } catch {
    return NextResponse.json({ success: false, error: { code: 'ERROR', message: 'Unable to complete service' } }, { status: 400 });
  }
}
