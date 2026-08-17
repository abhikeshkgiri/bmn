/**
 * PATCH /api/reviews/[id] - Update review
 * DELETE /api/reviews/[id] - Delete review
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { updateReview, deleteReview, getReview, REVIEW_ERRORS } from '@/services/review.service';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { rating, review } = body;

    const updatedReview = await updateReview({
      reviewId: id,
      rating: rating !== undefined ? parseInt(rating) : undefined,
      review: review?.trim(),
      currentUser,
    });

    return NextResponse.json(
      { success: true, data: updatedReview },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as Record<string, unknown>;

    if (err.code === 'REVIEW_NOT_FOUND') {
      return NextResponse.json(
        { success: false, error: { code: 'REVIEW_NOT_FOUND', message: 'Review not found' } },
        { status: 404 }
      );
    }

    if (err.code === 'REVIEW_NOT_OWNED') {
      return NextResponse.json(
        { success: false, error: { code: 'REVIEW_NOT_OWNED', message: 'You can only edit your own reviews' } },
        { status: 403 }
      );
    }

    console.error('Error updating review:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update review' } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    await deleteReview(id, currentUser);

    return NextResponse.json(
      { success: true, message: 'Review deleted successfully' },
      { status: 200 }
    );
  } catch (error: unknown) {
    const err = error as Record<string, unknown>;

    if (err.code === 'REVIEW_NOT_FOUND') {
      return NextResponse.json(
        { success: false, error: { code: 'REVIEW_NOT_FOUND', message: 'Review not found' } },
        { status: 404 }
      );
    }

    if (err.code === 'REVIEW_NOT_OWNED') {
      return NextResponse.json(
        { success: false, error: { code: 'REVIEW_NOT_OWNED', message: 'You can only delete your own reviews' } },
        { status: 403 }
      );
    }

    console.error('Error deleting review:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete review' } },
      { status: 500 }
    );
  }
}
