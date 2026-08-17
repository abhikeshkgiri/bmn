/**
 * Development-only in-memory auth fallback.
 *
 * This keeps OTP login functional when MongoDB Atlas is unreachable from the
 * local environment, while preserving the real DB-backed flow in production.
 */

import crypto from 'crypto';
import { AUTH_DEV_MODE, AUTH_ERRORS, DEV_OTP, OTP_CONFIG } from '@/constants/auth';
import { USER_ROLES } from '@/constants/roles';
import { normalizePhoneNumber } from '@/utils/phone';
import type { AuthUser } from '@/types';

interface DevOtpRecord {
  phone: string;
  otpHash: string;
  expiresAt: number;
  attempts: number;
  verified: boolean;
}

interface DevUserRecord {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  role: string;
  isActive: boolean;
  isVerified: boolean;
}

const otpStore = new Map<string, DevOtpRecord>();
const userStore = new Map<string, DevUserRecord>();

function hashOtp(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex');
}

function getPhoneKey(phoneInput: string): string {
  return normalizePhoneNumber(phoneInput);
}

function getUserRecord(phone: string): DevUserRecord | undefined {
  return userStore.get(phone);
}

function setUserRecord(phone: string, user: DevUserRecord): void {
  userStore.set(phone, user);
}

export function shouldUseDevAuthFallback(): boolean {
  return process.env.NODE_ENV !== 'production' && AUTH_DEV_MODE;
}

export function devRequestOtp(phoneInput: string): { otp: string | null; success: boolean } {
  if (!shouldUseDevAuthFallback()) {
    return { otp: null, success: false };
  }

  const phone = getPhoneKey(phoneInput);
  const now = Date.now();
  const existing = otpStore.get(phone);

  if (existing && !existing.verified && existing.expiresAt > now) {
    existing.verified = true;
  }

  const otp = DEV_OTP;
  const otpHash = hashOtp(otp);
  otpStore.set(phone, {
    phone,
    otpHash,
    expiresAt: now + OTP_CONFIG.EXPIRY_MINUTES * 60 * 1000,
    attempts: 0,
    verified: false,
  });

  return { otp, success: true };
}

export function devVerifyOtpAndGetUser(phoneInput: string, otpInput: string): { user: AuthUser; isNewUser: boolean } {
  if (!shouldUseDevAuthFallback()) {
    throw new Error(AUTH_ERRORS.OTP_INVALID);
  }

  const phone = getPhoneKey(phoneInput);
  const record = otpStore.get(phone);

  if (!record) {
    throw new Error(AUTH_ERRORS.OTP_INVALID);
  }

  if (new Date().getTime() > record.expiresAt) {
    otpStore.delete(phone);
    throw new Error(AUTH_ERRORS.OTP_EXPIRED);
  }

  if (record.attempts >= OTP_CONFIG.MAX_ATTEMPTS) {
    otpStore.delete(phone);
    throw new Error(AUTH_ERRORS.OTP_ATTEMPTS_EXCEEDED);
  }

  if (hashOtp(otpInput) !== record.otpHash) {
    record.attempts += 1;
    otpStore.set(phone, record);
    throw new Error(AUTH_ERRORS.OTP_INVALID);
  }

  otpStore.delete(phone);

  let user = getUserRecord(phone);
  let isNewUser = false;

  if (!user) {
    user = {
      _id: crypto.randomUUID(),
      name: '',
      phone,
      role: USER_ROLES.CUSTOMER,
      isActive: true,
      isVerified: true,
    };
    setUserRecord(phone, user);
    isNewUser = true;
  }

  if (!user.isActive) {
    throw new Error(AUTH_ERRORS.USER_INACTIVE);
  }

  const authUser: AuthUser = {
    _id: user._id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    avatar: user.avatar,
    role: user.role as AuthUser['role'],
    isActive: user.isActive,
    isVerified: user.isVerified,
  };

  return { user: authUser, isNewUser };
}
