import { NextRequest, NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { SendOtpSchema } from '@/validations/auth.schema';
import { requestLoginOtp } from '@/services/auth.service';
import { getRequestIp, isRateLimited } from '@/lib/rate-limit';
import { isDatabaseUnavailableError } from '@/lib/db-errors';

const LoginOtpSchema = SendOtpSchema.extend({
  audience: z.enum(['customer', 'salonOwner']),
});

export async function POST(request: NextRequest) {
  try {
    const input = LoginOtpSchema.parse(await request.json());
    if (isRateLimited(`otp-ip:${getRequestIp(request)}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ success: false, message: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const { otp, success } = await requestLoginOtp(input.phone, input.audience);
    if (!success) {
      return NextResponse.json({ success: false, message: 'Too many OTP requests. Please try again later.' }, { status: 429 });
    }

    return NextResponse.json({
      success: true,
      message: otp ? 'Development OTP ready. Use the code shown to continue.' : 'OTP sent successfully. Check your SMS for the code.',
      ...(otp ? { devOtp: otp } : {}),
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json({ success: false, error: 'Database unavailable; sign-in could not be verified.' }, { status: 503 });
    }
    if (error instanceof Error && error.message === 'ACCOUNT_NOT_FOUND') {
      return NextResponse.json({
        success: false,
        code: 'ACCOUNT_NOT_FOUND',
        error: 'No account is registered with this mobile number. Create an account first, then sign in.',
      }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'SALON_OWNER_ACCOUNT_REQUIRED') {
      return NextResponse.json({
        success: false,
        code: 'SALON_OWNER_ACCOUNT_REQUIRED',
        error: 'This number is registered as a customer account. Choose customer login or register a salon owner account with another number.',
      }, { status: 403 });
    }
    if (error instanceof Error && error.message === 'USER_INACTIVE') {
      return NextResponse.json({ success: false, error: 'Your account is inactive. Please contact support.' }, { status: 403 });
    }
    console.error('Login OTP request failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ success: false, error: 'Unable to send OTP right now.' }, { status: 500 });
  }
}
