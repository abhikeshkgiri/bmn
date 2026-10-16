/**
 * GET /api/coupons/available
 * Get available coupons for a specific salon/service
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAvailableCoupons } from '@/services/coupon.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const salonId = searchParams.get('salonId');
    const serviceId = searchParams.get('serviceId');

    const coupons = await getAvailableCoupons(salonId || undefined, serviceId || undefined);

    return NextResponse.json(
      {
        success: true,
        data: {
          coupons,
          count: coupons.length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching coupons:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch coupons' } },
      { status: 500 }
    );
  }
}
