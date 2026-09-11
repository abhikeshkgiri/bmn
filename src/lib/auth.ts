/**
 * Authentication utilities
 * Server-side only - use these in API routes and server components
 */

import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { SESSION_CONFIG, AUTH_ERRORS } from '@/constants/auth';
import type { SessionPayload, AuthUser, UserRole } from '@/types';
import User from '@/models/User';
import { connectDB } from '@/lib/db';
import { assertProductionEnvironment } from '@/lib/env';

// Get the secret key for JWT signing/verification
function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Get the current authenticated user from the session cookie
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    assertProductionEnvironment();
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_CONFIG.COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    // Verify and decode the JWT token
    const secret = getAuthSecret();
    const verified = await jwtVerify(token, secret);
    const payload = verified.payload as unknown as SessionPayload;

    // Verify user still exists and is active
    await connectDB();
    const user = await User.findById(payload.userId);

    if (!user || !user.isActive) {
      return null;
    }

    return {
      _id: user._id.toString(),
      name: user.name,
      phone: user.phone,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      isActive: user.isActive,
      isVerified: user.isVerified,
      notificationPreferences: user.notificationPreferences,
    };
  } catch {
    // Token invalid, expired, or verification failed
    return null;
  }
}

/**
 * Require authentication - throws if user is not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error(AUTH_ERRORS.UNAUTHORIZED);
  }
  return user;
}

/**
 * Require specific role
 */
export async function requireRole(requiredRole: UserRole | UserRole[]): Promise<AuthUser> {
  const user = await requireAuth();

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  if (!roles.includes(user.role)) {
    throw new Error(AUTH_ERRORS.FORBIDDEN);
  }

  return user;
}

/**
 * Check if current user has a specific role
 */
export async function hasRole(requiredRole: UserRole | UserRole[]): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) return false;

    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return roles.includes(user.role);
  } catch {
    return false;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}
