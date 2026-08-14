/**
 * Authentication Service
 * Business logic for OTP-based authentication
 */

import crypto from 'crypto';
import { SignJWT } from 'jose';
import { connectDB } from '@/lib/db';
import User from '@/models/User';
import OtpVerification from '@/models/OtpVerification';
import { normalizePhoneNumber } from '@/utils/phone';
import { sendOtp } from '@/lib/otp-provider';
import { rateLimiter } from '@/lib/rate-limit';
import { OTP_CONFIG, AUTH_ERRORS, AUTH_DEV_MODE, DEV_OTP } from '@/constants/auth';
import { USER_ROLES } from '@/constants/roles';
import type { AuthUser } from '@/types';

/**
 * Generate a random OTP
 */
export function generateOtp(): string {
  return Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(OTP_CONFIG.LENGTH, '0');
}

/**
 * Hash OTP for secure storage
 */
export function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

/**
 * Verify OTP against hash
 */
export function verifyOtpHash(otp: string, hash: string): boolean {
  const otpHash = hashOtp(otp);
  return otpHash === hash;
}

/**
 * Request OTP for phone number
 * Returns generated OTP in dev mode, null in production
 */
export async function requestOtp(phoneInput: string): Promise<{ otp: string | null; success: boolean }> {
  try {
    await connectDB();

    // Normalize phone number
    const phone = normalizePhoneNumber(phoneInput);

    // Check rate limit - max 3 OTP requests per 15 minutes per phone
    const isAllowed = rateLimiter.isAllowed(phone, 3, 15 * 60 * 1000);
    if (!isAllowed) {
      return { otp: null, success: false };
    }

    // Invalidate any existing unverified OTPs for this phone
    await OtpVerification.updateMany({ phone, verified: false }, { verified: true });

    // Generate OTP
    let otp: string;
    if (AUTH_DEV_MODE) {
      otp = DEV_OTP;
    } else {
      otp = generateOtp();
    }

    // Hash OTP for storage
    const otpHash = hashOtp(otp);

    // Create expiration time
    const expiresAt = new Date(Date.now() + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000);

    // Save OTP verification record
    await OtpVerification.create({
      phone,
      otpHash,
      expiresAt,
      attempts: 0,
      verified: false,
    });

    // Send OTP through provider
    try {
      await sendOtp(phone, otp);
    } catch (error) {
      console.error('Failed to send OTP:', error);
      // In production, log this but don't expose to client
      throw new Error(AUTH_ERRORS.AUTH_PROVIDER_ERROR);
    }

    // Return OTP only in dev mode
    return { otp: AUTH_DEV_MODE ? otp : null, success: true };
  } catch (error) {
    console.error('Error requesting OTP:', error);
    throw error;
  }
}

/**
 * Verify OTP and create/find user
 */
export async function verifyOtpAndGetUser(
  phoneInput: string,
  otpInput: string
): Promise<{ user: AuthUser; isNewUser: boolean }> {
  try {
    await connectDB();

    // Normalize phone number
    const phone = normalizePhoneNumber(phoneInput);

    // Find active OTP verification record
    const otpRecord = await OtpVerification.findOne({
      phone,
      verified: false,
    }).select('+otpHash');

    if (!otpRecord) {
      throw new Error(AUTH_ERRORS.OTP_INVALID);
    }

    // Check if OTP is expired
    if (new Date() > otpRecord.expiresAt) {
      throw new Error(AUTH_ERRORS.OTP_EXPIRED);
    }

    // Check attempt limit
    if (otpRecord.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
      throw new Error(AUTH_ERRORS.OTP_ATTEMPTS_EXCEEDED);
    }

    // Verify OTP
    if (!verifyOtpHash(otpInput, otpRecord.otpHash)) {
      // Increment attempts
      otpRecord.attempts += 1;
      await otpRecord.save();
      throw new Error(AUTH_ERRORS.OTP_INVALID);
    }

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    // Find or create user
    let user = await User.findOne({ phone });
    let isNewUser = false;

    if (!user) {
      // Create new user with CUSTOMER role
      user = await User.create({
        name: '', // Will be filled in profile completion
        phone,
        role: USER_ROLES.CUSTOMER,
        isActive: true,
        isVerified: true,
      });
      isNewUser = true;
    } else if (!user.isActive) {
      throw new Error(AUTH_ERRORS.USER_INACTIVE);
    }

    return {
      user: {
        _id: user._id.toString(),
        name: user.name,
        phone: user.phone,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        isActive: user.isActive,
        isVerified: user.isVerified,
      },
      isNewUser,
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
}

/**
 * Create session token (JWT)
 */
export async function createSessionToken(user: AuthUser): Promise<string> {
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET || '');

  if (!process.env.AUTH_SECRET) {
    throw new Error('AUTH_SECRET is not configured');
  }

  const payload = {
    userId: user._id,
    phone: user.phone,
    role: user.role,
  };

  const token = await new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(secret);

  return token;
}

/**
 * Logout user by clearing session
 */
export async function logoutUser(): Promise<void> {
  // The session cookie will be cleared in the API route
  // This function can be used for any additional cleanup in the future
  return;
}
