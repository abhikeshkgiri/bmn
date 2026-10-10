import { NextRequest, NextResponse } from 'next/server';
import { SendOtpSchema } from '@/validations/auth.schema';
import { requestOtp } from '@/services/auth.service';
import { USER_ROLES } from '@/constants/roles';
import { ZodError } from 'zod';
import { getRequestIp, isRateLimited } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const validatedData = SendOtpSchema.parse(await request.json());

    if (isRateLimited(`otp-ip:${getRequestIp(request)}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ success: false, message: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { otp, success } = await requestOtp(validatedData.phone, USER_ROLES.SALON_OWNER);
    if (!success) {
      return NextResponse.json({ success: false, message: 'Too many OTP requests. Please try again later.' }, { status: 429 });
    }

    const response: Record<string, unknown> = {
      success: true,
      message: otp ? 'Development OTP ready. Use the code shown to continue.' : 'OTP sent successfully. Check your SMS for the code.',
    };
    if (otp) response.devOtp = otp;
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid input', details: error.issues }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes('OTP_PROVIDER_NOT_CONFIGURED')) {
      return NextResponse.json({ success: false, error: 'OTP provider is not configured' }, { status: 500 });
    }

    console.error('Salon owner OTP request failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ success: false, error: 'Unable to send OTP right now' }, { status: 500 });
  }
}
