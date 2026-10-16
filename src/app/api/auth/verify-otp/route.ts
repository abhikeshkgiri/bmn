/**
 * POST /api/auth/verify-otp
 * Verify OTP and create session
 */

import { NextRequest } from 'next/server';
import { handleOtpVerification } from '@/lib/auth/otp-verification-handler';

export async function POST(request: NextRequest) {
  return handleOtpVerification(request, true);
}
