/**
 * POST /api/reviews
 * Create a new review for a completed booking
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createReview } from '@/services/review.service';
import { ReviewCreateSchema } from '@/validations/review.schema';
import { revalidateHomeSalons } from '@/lib/home-salon-cache';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'Request body must be valid JSON' } },
        { status: 400 }
      );
    }
    const parsed = ReviewCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'Review data is invalid' } },
        { status: 400 }
      );
    }

    const createdReview = await createReview({ ...parsed.data, currentUser });
    revalidateHomeSalons();

    return NextResponse.json(
      {
        success: true,
        data: createdReview,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const err = error as Record<string, unknown>;

    // Check for known review errors
    if (err.code && typeof err.code === 'string') {
      const statusCode = err.code.includes('NOT_FOUND') ? 404 : err.code === 'UNAUTHORIZED' ? 403 : 400;
      return NextResponse.json(
        { success: false, error: { code: err.code, message: err.message } },
        { status: statusCode }
      );
    }

    console.error('Error creating review:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create review' } },
      { status: 500 }
    );
  }
}
