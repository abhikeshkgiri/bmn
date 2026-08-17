/**
 * POST /api/coupons/validate
 * Validate a coupon and calculate discount
 * Returns discount amount and final price for server-side calculation
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateCoupon, COUPON_ERRORS } from '@/services/coupon.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { couponCode, salonId, serviceId, customerId, subtotal } = body;

    // Validate required fields
    if (!couponCode || !salonId || !serviceId || !customerId || subtotal === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'All fields are required' },
        },
        { status: 400 }
      );
    }

    // Validate subtotal
    if (typeof subtotal !== 'number' || subtotal < 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_AMOUNT', message: 'Invalid amount' },
        },
        { status: 400 }
      );
    }

    // Validate coupon
    const result = await validateCoupon({
      couponCode: couponCode.trim(),
      salonId,
      serviceId,
      customerId,
      subtotal: Math.floor(subtotal), // Convert to paise if needed
    });

    if (!result.valid) {
      return NextResponse.json(
        {
          success: false,
          error: { code: result.error || 'INVALID_COUPON', message: result.error },
        },
        { status: 400 }
      );
    }

    // Return discount and final amount (always server-calculated)
    return NextResponse.json(
      {
        success: true,
        data: {
          couponCode: couponCode.toUpperCase(),
          discount: result.discount,
          finalAmount: result.finalAmount,
          subtotal: Math.floor(subtotal),
          discountType: result.coupon?.discountType,
          discountValue: result.coupon?.discountValue,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error validating coupon:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to validate coupon' } },
      { status: 500 }
    );
  }
}
