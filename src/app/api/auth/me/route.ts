/**
 * GET /api/auth/me
 * Get current authenticated user
 */

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isDatabaseUnavailableError } from '@/lib/db-errors';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    const unavailable = isDatabaseUnavailableError(error);
    console.error('Current user lookup failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json(
      {
        success: false,
        error: {
          code: unavailable ? 'DATABASE_UNAVAILABLE' : 'AUTH_LOOKUP_FAILED',
          message: unavailable
            ? 'The database cannot be reached. Session verification is temporarily unavailable.'
            : 'Unable to verify the current session.',
        },
      },
      { status: unavailable ? 503 : 500 }
    );
  }
}
