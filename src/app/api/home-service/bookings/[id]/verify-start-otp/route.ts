import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { verifyStartOtp } from '@/services/home-service.service';
import { z, ZodError } from 'zod';

const OtpSchema = z.object({ otp: z.string().regex(/^\d{6}$/) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  try {
    const { otp } = OtpSchema.parse(await request.json());
    return NextResponse.json({ success: true, data: await verifyStartOtp(user, (await params).id, otp) });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', details: error.issues } }, { status: 400 });
    return NextResponse.json({ success: false, error: { code: 'ERROR', message: 'Unable to verify service OTP' } }, { status: 400 });
  }
}
