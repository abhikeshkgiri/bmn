/**
 * PATCH /api/reviews/[id] - Update review
 * DELETE /api/reviews/[id] - Delete review
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { updateReview, deleteReview } from '@/services/review.service';
import { ReviewIdSchema, ReviewUpdateSchema } from '@/validations/review.schema';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!ReviewIdSchema.safeParse(id).success) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ID', message: 'Review ID is invalid' } },
        { status: 400 }
      );
    }
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
    const parsed = ReviewUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'Review data is invalid' } },
        { status: 400 }
      );
    }

    const updatedReview = await updateReview({
      reviewId: id,
      ...parsed.data,
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
    if (err.code === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Only customers can manage reviews' } },
        { status: 403 }
      );
    }
    if (err.code === 'INVALID_INPUT') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'Review data is invalid' } },
        { status: 400 }
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
    if (!ReviewIdSchema.safeParse(id).success) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ID', message: 'Review ID is invalid' } },
        { status: 400 }
      );
    }
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
    if (err.code === 'UNAUTHORIZED') {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Only customers can manage reviews' } },
        { status: 403 }
      );
    }
    if (err.code === 'INVALID_INPUT') {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ID', message: 'Review ID is invalid' } },
        { status: 400 }
      );
    }

    console.error('Error deleting review:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete review' } },
      { status: 500 }
    );
  }
}
