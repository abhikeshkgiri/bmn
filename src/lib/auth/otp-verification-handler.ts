import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { VerifyOtpSchema } from '@/validations/auth.schema';
import { verifyOtpAndGetUser, createSessionToken } from '@/services/auth.service';
import { SESSION_CONFIG } from '@/constants/auth';
import { getRequestIp, isRateLimited } from '@/lib/rate-limit';
import { isDatabaseUnavailableError } from '@/lib/db-errors';

export async function handleOtpVerification(request: NextRequest, allowNewUser: boolean) {
  try {
    const validatedData = VerifyOtpSchema.parse(await request.json());
    if (isRateLimited(`otp-verify:${getRequestIp(request)}:${validatedData.phone}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ success: false, error: 'Too many verification attempts' }, { status: 429 });
    }

    const { user, isNewUser } = await verifyOtpAndGetUser(
      validatedData.phone,
      validatedData.otp,
      allowNewUser,
    );
    const token = await createSessionToken(user);
    const response = NextResponse.json({
      success: true,
      user,
      message: isNewUser ? 'Welcome to BookMyNai!' : 'Logged in successfully',
    });
    response.cookies.set({
      name: SESSION_CONFIG.COOKIE_NAME,
      value: token,
      httpOnly: SESSION_CONFIG.HTTP_ONLY,
      secure: SESSION_CONFIG.SECURE,
      sameSite: SESSION_CONFIG.SAME_SITE,
      path: '/',
      maxAge: SESSION_CONFIG.DURATION_MS / 1000,
    });
    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json({ success: false, error: 'Database unavailable; sign-in could not be verified.' }, { status: 503 });
    }
    if (error instanceof Error) {
      if (error.message === 'ACCOUNT_NOT_FOUND') {
        return NextResponse.json({
          success: false,
          code: 'ACCOUNT_NOT_FOUND',
          error: 'No account is registered with this mobile number. Create an account first, then sign in.',
        }, { status: 404 });
      }
      if (error.message === 'USER_INACTIVE') {
        return NextResponse.json({ success: false, error: error.message }, { status: 403 });
      }
      if (
        error.message.includes('OTP_INVALID') ||
        error.message.includes('OTP_EXPIRED') ||
        error.message.includes('OTP_ATTEMPTS_EXCEEDED')
      ) {
        return NextResponse.json({ success: false, error: error.message }, { status: 401 });
      }
    }
    console.error('OTP verification failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json({ success: false, error: 'Failed to verify OTP.' }, { status: 500 });
  }
}
