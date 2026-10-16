import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { BarberOnboardingSchema, completeBarberOnboarding, getBarberOnboardingStatus } from '@/services/onboarding.service';
import { ZodError } from 'zod';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  if (!['CUSTOMER', 'BARBER'].includes(user.role)) return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Barber onboarding access required' } }, { status: 403 });
  return NextResponse.json({ success: true, data: await getBarberOnboardingStatus(user) });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  try {
    const input = BarberOnboardingSchema.parse(await request.json());
    const result = await completeBarberOnboarding(user, input);
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', details: error.issues } }, { status: 400 });
    const message = error instanceof Error ? error.message : 'Unable to complete barber onboarding';
    if (message.startsWith('CITY_NOT_SUPPORTED:')) return NextResponse.json({ success: false, error: { code: 'CITY_NOT_SUPPORTED', message: message.split(':').slice(1).join(':').trim() } }, { status: 422 });
    const status = message === 'ONBOARDING_FORBIDDEN' ? 403 : message === 'SALON_NOT_AVAILABLE' ? 404 : 400;
    return NextResponse.json({ success: false, error: { code: message, message: 'Unable to complete barber onboarding' } }, { status });
  }
}
