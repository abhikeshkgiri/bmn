/**
 * POST /api/reviews
 * Create a new review for a completed booking
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createReview, REVIEW_ERRORS } from '@/services/review.service';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { bookingId, rating, review, target } = body;

    if (!bookingId || rating === undefined || !target) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'bookingId, rating, and target are required' },
        },
        { status: 400 }
      );
    }

    const createdReview = await createReview({
      bookingId,
      rating: parseInt(rating),
      review: review?.trim() || undefined,
      target,
      currentUser,
    });

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
