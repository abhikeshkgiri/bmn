/**
 * POST /api/auth/verify-otp
 * Verify OTP and create session
 */

import { NextRequest, NextResponse } from 'next/server';
import { VerifyOtpSchema } from '@/validations/auth.schema';
import { verifyOtpAndGetUser, createSessionToken } from '@/services/auth.service';
import { SESSION_CONFIG } from '@/constants/auth';
import { ZodError } from 'zod';
import { getRequestIp, isRateLimited } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validatedData = VerifyOtpSchema.parse(body);

    if (isRateLimited(`otp-verify:${getRequestIp(request)}:${validatedData.phone}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ success: false, error: 'Too many verification attempts' }, { status: 429 });
    }

    // Verify OTP and get/create user
    const { user, isNewUser } = await verifyOtpAndGetUser(validatedData.phone, validatedData.otp);

    // Create session token
    const token = await createSessionToken(user);

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        user,
        message: isNewUser ? 'Welcome to BookMyNai!' : 'Logged in successfully',
      },
      { status: 200 }
    );

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: SESSION_CONFIG.COOKIE_NAME,
      value: token,
      httpOnly: SESSION_CONFIG.HTTP_ONLY,
      secure: SESSION_CONFIG.SECURE,
      sameSite: SESSION_CONFIG.SAME_SITE,
      path: '/',
      maxAge: SESSION_CONFIG.DURATION_MS / 1000, // Convert to seconds
    });

    return response;
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      const errorMessage = error.message;

      // Check for specific errors
      if (
        errorMessage.includes('OTP_INVALID') ||
        errorMessage.includes('OTP_EXPIRED') ||
        errorMessage.includes('OTP_ATTEMPTS_EXCEEDED')
      ) {
        return NextResponse.json(
          {
            success: false,
            error: errorMessage,
          },
          { status: 401 }
        );
      }

      if (errorMessage.includes('USER_INACTIVE')) {
        return NextResponse.json(
          {
            success: false,
            error: errorMessage,
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: errorMessage || 'Failed to verify OTP',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
