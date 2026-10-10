/**
 * GET /api/barbers/[id]/reviews
 * Get reviews for a specific barber with pagination and stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBarberReviews } from '@/services/review.service';
import { ReviewIdSchema, ReviewListQuerySchema } from '@/validations/review.schema';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: barberId } = await params;
    const { searchParams } = new URL(request.url);
    const parsedId = ReviewIdSchema.safeParse(barberId);
    const parsedQuery = ReviewListQuerySchema.safeParse({
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });

    if (!parsedId.success || !parsedQuery.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Barber ID or pagination parameters are invalid' },
        },
        { status: 400 }
      );
    }

    const result = await getBarberReviews(barberId, parsedQuery.data);

    return NextResponse.json(
      {
        success: true,
        data: {
          reviews: result.reviews,
          pagination: result.pagination,
          stats: result.stats,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error &&
      (error as { code: unknown }).code === 'REVIEW_NOT_FOUND') {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Barber reviews are not available' } },
        { status: 404 }
      );
    }
    console.error('Error fetching barber reviews:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch reviews' } },
      { status: 500 }
    );
  }
}
