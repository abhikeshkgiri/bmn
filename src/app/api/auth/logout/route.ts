/**
 * POST /api/auth/logout
 * Clear authentication session
 */

import { NextResponse } from 'next/server';
import { SESSION_CONFIG } from '@/constants/auth';

export async function POST() {
  // Create response
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  // Clear the session cookie
  response.cookies.set({
    name: SESSION_CONFIG.COOKIE_NAME,
    value: '',
    httpOnly: SESSION_CONFIG.HTTP_ONLY,
    secure: SESSION_CONFIG.SECURE,
    sameSite: SESSION_CONFIG.SAME_SITE,
    path: '/',
    maxAge: 0, // This deletes the cookie
  });

  return response;
}
