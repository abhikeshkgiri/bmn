/**
 * GET /api/salons/[id]/reviews
 * Get reviews for a specific salon with pagination and stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSalonReviews } from '@/services/review.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: salonId } = await params;
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

    const result = await getSalonReviews(salonId, { page, limit });

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
    console.error('Error fetching salon reviews:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch reviews' } },
      { status: 500 }
    );
  }
}
