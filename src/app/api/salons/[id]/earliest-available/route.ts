/**
 * GET /api/salons/[id]/earliest-available
 * Get the earliest available slot for a salon
 * Used for displaying "Next available" time on discovery pages
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEarliestAvailableSlot } from '@/services/booking.service';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: salonId } = await params;

    if (!salonId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_SALON_ID',
            message: 'Salon ID is required',
          },
        },
        { status: 400 }
      );
    }

    const earliestSlot = await getEarliestAvailableSlot(salonId);

    return NextResponse.json(
      {
        success: true,
        data: earliestSlot,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error getting earliest available slot:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SERVER_ERROR',
          message: 'Failed to get earliest available slot',
        },
      },
      { status: 500 }
    );
  }
}
