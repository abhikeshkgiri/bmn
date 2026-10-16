/**
 * Authentication constants and configuration
 */

export const OTP_CONFIG = {
  LENGTH: 6, // 6-digit OTP
  EXPIRY_MINUTES: 5, // OTP valid for 5 minutes
  MAX_ATTEMPTS: 5, // Maximum verification attempts
  RESEND_COOLDOWN_SECONDS: 60, // Wait 60 seconds before resend
} as const;

export const SESSION_CONFIG = {
  DURATION_DAYS: 7, // Session expires in 7 days
  DURATION_MS: 7 * 24 * 60 * 60 * 1000, // In milliseconds
  COOKIE_NAME: 'bookmynai-session',
  SECURE: process.env.NODE_ENV === 'production',
  HTTP_ONLY: true,
  SAME_SITE: 'lax' as const,
} as const;

export const AUTH_ERRORS = {
  INVALID_PHONE: 'Invalid phone number',
  OTP_EXPIRED: 'OTP has expired. Please request a new one.',
  OTP_INVALID: 'Incorrect OTP. Please try again.',
  OTP_ATTEMPTS_EXCEEDED: 'Too many incorrect attempts. Please request a new OTP.',
  OTP_RATE_LIMITED: 'Too many OTP requests. Please try again later.',
  USER_INACTIVE: 'Your account is inactive. Please contact support.',
  UNAUTHORIZED: 'You must be logged in to access this resource.',
  FORBIDDEN: 'You do not have permission to access this resource.',
  AUTH_PROVIDER_ERROR: 'Authentication provider is not configured.',
  INVALID_ROLE: 'Invalid role specified.',
} as const;

export const AUTH_DEV_MODE = process.env.NODE_ENV !== 'production' && process.env.AUTH_DEV_MODE === 'true';

export const DEV_OTP = '123456'; // Only used in development mode
