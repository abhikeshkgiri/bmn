/**
 * POST /api/auth/send-otp
 * Request OTP for phone number
 */

import { NextRequest, NextResponse } from 'next/server';
import { SendOtpSchema } from '@/validations/auth.schema';
import { requestOtp } from '@/services/auth.service';
import { ZodError } from 'zod';
import { getRequestIp, isRateLimited } from '@/lib/rate-limit';
import { isDatabaseUnavailableError } from '@/lib/db-errors';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const validatedData = SendOtpSchema.parse(body);

    if (isRateLimited(`otp-ip:${getRequestIp(request)}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ success: false, message: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    // Request OTP
    const { otp, success } = await requestOtp(validatedData.phone);

    if (!success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Too many OTP requests. Please try again later.',
        },
        { status: 429 }
      );
    }

    // Return success response
    const response: Record<string, unknown> = {
      success: true,
      message: otp
        ? 'Development OTP ready. Use the code shown to continue.'
        : 'OTP sent successfully. Check your SMS for the code.',
    };

    // In development, include OTP for testing
    if (otp) {
      response.devOtp = otp;
    }

    return NextResponse.json(response);
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
      if (isDatabaseUnavailableError(error)) {
        return NextResponse.json(
          { success: false, error: 'Database unavailable; OTP was not issued.' },
          { status: 503 }
        );
      }

      // Check for specific auth errors
      if (error.message.includes('OTP_PROVIDER_NOT_CONFIGURED')) {
        return NextResponse.json(
          {
            success: false,
            error: 'OTP provider is not configured',
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to send OTP',
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
