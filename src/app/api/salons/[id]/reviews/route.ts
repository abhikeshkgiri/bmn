/**
 * GET /api/salons/[id]/reviews
 * Get reviews for a specific salon with pagination and stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSalonReviews } from '@/services/review.service';
import { ReviewIdSchema, ReviewListQuerySchema } from '@/validations/review.schema';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: salonId } = await params;
    const { searchParams } = new URL(request.url);
    const parsedId = ReviewIdSchema.safeParse(salonId);
    const parsedQuery = ReviewListQuerySchema.safeParse({
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });

    if (!parsedId.success || !parsedQuery.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Salon ID or pagination parameters are invalid' },
        },
        { status: 400 }
      );
    }

    const result = await getSalonReviews(salonId, parsedQuery.data);

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
        { success: false, error: { code: 'NOT_FOUND', message: 'Salon reviews are not available' } },
        { status: 404 }
      );
    }
    console.error('Error fetching salon reviews:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch reviews' } },
      { status: 500 }
    );
  }
}
