/**
 * GET /api/barbers/[id]/reviews
 * Get reviews for a specific barber with pagination and stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBarberReviews } from '@/services/review.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: barberId } = await params;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    if (page < 1 || limit < 1 || limit > 50) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_PAGINATION', message: 'Invalid pagination parameters' },
        },
        { status: 400 }
      );
    }

    const result = await getBarberReviews(barberId, { page, limit });

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
    console.error('Error fetching barber reviews:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch reviews' } },
      { status: 500 }
    );
  }
}
