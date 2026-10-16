import { NextRequest } from 'next/server';
import { handleOtpVerification } from '@/lib/auth/otp-verification-handler';

export async function POST(request: NextRequest) {
  return handleOtpVerification(request, false);
}
