/**
 * Coupon Service
 * Handles coupon validation, discount calculation, and usage tracking
 * All discount calculations are done server-side to prevent fraud
 */

import { Types } from 'mongoose';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import Coupon, { type ICoupon, CouponType } from '@/models/Coupon';
import CouponUsage from '@/models/CouponUsage';
import { connectDB } from '@/lib/db';
import { COUPON_TYPE } from '@/constants/coupons';

export interface CouponValidationResult {
  valid: boolean;
  coupon?: ICoupon;
  error?: string;
  discount?: number; // Final discount in paise
  finalAmount?: number; // Final amount after discount
}

export interface CouponApplyRequest {
  couponCode: string;
  salonId: string;
  serviceId: string;
  customerId: string;
  subtotal: number; // Amount in paise
}

export interface DiscountCalculationResult {
  discount: number; // Amount in paise
  finalAmount: number; // Amount in paise
  couponCode?: string;
  isValid: boolean;
}

/**
 * Error codes for coupon operations
 */
export const COUPON_ERRORS = {
  INVALID_CODE: { code: 'INVALID_CODE', message: 'Coupon code not found or invalid' },
  COUPON_EXPIRED: { code: 'COUPON_EXPIRED', message: 'Coupon has expired' },
  COUPON_NOT_STARTED: { code: 'COUPON_NOT_STARTED', message: 'Coupon has not started yet' },
  COUPON_USAGE_LIMIT: { code: 'COUPON_USAGE_LIMIT', message: 'Coupon usage limit exceeded' },
  COUPON_USER_LIMIT: { code: 'COUPON_USER_LIMIT', message: 'You have already used this coupon' },
  MINIMUM_ORDER_NOT_MET: { code: 'MINIMUM_ORDER_NOT_MET', message: 'Minimum order value not met' },
  SALON_NOT_ELIGIBLE: { code: 'SALON_NOT_ELIGIBLE', message: 'This coupon is not applicable for this salon' },
  SERVICE_NOT_ELIGIBLE: { code: 'SERVICE_NOT_ELIGIBLE', message: 'This coupon is not applicable for this service' },
  CUSTOMER_NOT_ELIGIBLE: { code: 'CUSTOMER_NOT_ELIGIBLE', message: 'You are not eligible to use this coupon' },
  INVALID_REQUEST: { code: 'INVALID_REQUEST', message: 'Invalid coupon request' },
} as const;

/**
 * Validate coupon and get applicable discount
 * Performs server-side validation to prevent fraud
 */
export async function validateCoupon(request: CouponApplyRequest): Promise<CouponValidationResult> {
  await connectDB();

  // Find coupon
  const coupon = await Coupon.findOne({
    code: request.couponCode.toUpperCase().trim(),
    active: true,
  });

  if (!coupon) {
    return {
      valid: false,
      error: COUPON_ERRORS.INVALID_CODE.message,
    };
  }

  // Check if coupon has started
  const now = new Date();
  if (coupon.startDate > now) {
    return {
      valid: false,
      error: COUPON_ERRORS.COUPON_NOT_STARTED.message,
    };
  }

  // Check if coupon has expired
  if (coupon.expiryDate < now) {
    return {
      valid: false,
      error: COUPON_ERRORS.COUPON_EXPIRED.message,
    };
  }

  // Check usage limit (global)
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    return {
      valid: false,
      error: COUPON_ERRORS.COUPON_USAGE_LIMIT.message,
    };
  }

  if (coupon.perUserLimit) {
    const usedByCustomer = await CouponUsage.countDocuments({
      coupon: coupon._id,
      customer: new Types.ObjectId(request.customerId),
    });
    if (usedByCustomer >= coupon.perUserLimit) {
      return { valid: false, error: COUPON_ERRORS.COUPON_USER_LIMIT.message };
    }
  }

  // Check salon applicability
  if (coupon.applicable.salons && coupon.applicable.salons.length > 0) {
    const salonId = new Types.ObjectId(request.salonId);
    const isApplicable = coupon.applicable.salons.some((s: Types.ObjectId) => s.toString() === salonId.toString());
    if (!isApplicable) {
      return {
        valid: false,
        error: COUPON_ERRORS.SALON_NOT_ELIGIBLE.message,
      };
    }
  }

  // Check service applicability
  if (coupon.applicable.services && coupon.applicable.services.length > 0) {
    const serviceId = new Types.ObjectId(request.serviceId);
    const isApplicable = coupon.applicable.services.some((s: Types.ObjectId) => s.toString() === serviceId.toString());
    if (!isApplicable) {
      return {
        valid: false,
        error: COUPON_ERRORS.SERVICE_NOT_ELIGIBLE.message,
      };
    }
  }

  // Check customer applicability
  if (coupon.applicable.customers && coupon.applicable.customers.length > 0) {
    const customerId = new Types.ObjectId(request.customerId);
    const isApplicable = coupon.applicable.customers.some((c: Types.ObjectId) => c.toString() === customerId.toString());
    if (!isApplicable) {
      return {
        valid: false,
        error: COUPON_ERRORS.CUSTOMER_NOT_ELIGIBLE.message,
      };
    }
  }

  // Check minimum order value
  if (coupon.minimumOrderValue && request.subtotal < coupon.minimumOrderValue) {
    return {
      valid: false,
      error: COUPON_ERRORS.MINIMUM_ORDER_NOT_MET.message,
    };
  }

  // Calculate discount
  const discount = calculateDiscount(coupon, request.subtotal);

  // Verify subtotal >= discount (sanity check)
  if (discount > request.subtotal) {
    return {
      valid: false,
      error: COUPON_ERRORS.INVALID_REQUEST.message,
    };
  }

  const finalAmount = request.subtotal - discount;

  return {
    valid: true,
    coupon,
    discount,
    finalAmount,
  };
}

/**
 * Calculate actual discount amount based on coupon type
 * PERCENTAGE: Apply percentage, cap at maximumDiscount if specified
 * FIXED: Apply fixed amount
 */
export function calculateDiscount(coupon: ICoupon, subtotal: number): number {
  if (coupon.discountType === COUPON_TYPE.PERCENTAGE) {
    let discount = Math.floor((subtotal * coupon.discountValue) / 100);

    // Apply maximum discount cap if specified
    if (coupon.maximumDiscount && discount > coupon.maximumDiscount) {
      discount = coupon.maximumDiscount;
    }

    return discount;
  } else if (coupon.discountType === COUPON_TYPE.FIXED) {
    // Cap discount at subtotal
    return Math.min(coupon.discountValue, subtotal);
  }

  return 0;
}

/**
 * Apply coupon to booking (increment usage counter)
 * This should be called during checkout, BEFORE payment
 */
export async function applyCoupon(
  couponCode: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  customerId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  bookingId?: string
): Promise<ICoupon> {
  await connectDB();

  const coupon = await Coupon.findOne({
    code: couponCode.toUpperCase().trim(),
  });

  if (!coupon) {
    throw COUPON_ERRORS.INVALID_CODE;
  }

  // This would ideally use MongoDB transactions for atomicity
  // For now, we increment usedCount and track per-user usage separately
  // In production, maintain a separate CouponUsage collection for per-user tracking
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
    throw COUPON_ERRORS.COUPON_USAGE_LIMIT;
  }

  // Increment used count atomically
  const updated = await Coupon.findOneAndUpdate(
    {
      _id: coupon._id,
      // Only update if usage limit not exceeded (optimistic concurrency)
      $expr: coupon.usageLimit ? { $lt: ['$usedCount', coupon.usageLimit] } : { $gte: ['$usedCount', 0] },
    },
    {
      $inc: { usedCount: 1 },
    },
    { new: true }
  );

  if (!updated) {
    // Usage limit was exceeded by another concurrent request
    throw COUPON_ERRORS.COUPON_USAGE_LIMIT;
  }

  return updated;
}

/**
 * Calculate final amount with coupon applied
 * Server-side calculation, never trust client input
 */
export async function calculateFinalAmount(
  subtotal: number,
  couponCode?: string,
  salonId?: string,
  serviceId?: string,
  customerId?: string
): Promise<DiscountCalculationResult> {
  // If no coupon, return subtotal as-is
  if (!couponCode) {
    return {
      discount: 0,
      finalAmount: subtotal,
      isValid: false,
    };
  }

  // Validate coupon
  if (!salonId || !serviceId || !customerId) {
    return {
      discount: 0,
      finalAmount: subtotal,
      isValid: false,
    };
  }

  const validationResult = await validateCoupon({
    couponCode,
    salonId,
    serviceId,
    customerId,
    subtotal,
  });

  if (!validationResult.valid) {
    return {
      discount: 0,
      finalAmount: subtotal,
      isValid: false,
    };
  }

  return {
    discount: validationResult.discount || 0,
    finalAmount: validationResult.finalAmount || subtotal,
    couponCode,
    isValid: true,
  };
}

/**
 * Get available coupons for a customer
 */
export async function getAvailableCoupons(
  salonId?: string,
  serviceId?: string
): Promise<ICoupon[]> {
  await connectDB();

  const now = new Date();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {
    active: true,
    startDate: { $lte: now },
    expiryDate: { $gte: now },
  };

  // If salon specified, filter by applicable salons
  if (salonId) {
    query.$or = [
      { 'applicable.salons': { $size: 0 } }, // No restriction
      { 'applicable.salons': new Types.ObjectId(salonId) }, // Specifically applicable
    ];
  }

  // If service specified, filter by applicable services
  if (serviceId) {
    query.$or = [
      ...(query.$or || []),
      { 'applicable.services': { $size: 0 } }, // No restriction
      { 'applicable.services': new Types.ObjectId(serviceId) }, // Specifically applicable
    ];
  }

  const coupons = await Coupon.find(query)
    .select('code description discountType discountValue minimumOrderValue maximumDiscount applicable expiryDate')
    .limit(20);

  return coupons;
}

/**
 * Refund coupon usage (if booking is cancelled/refunded)
 */
export async function refundCouponUsage(couponCode: string): Promise<void> {
  await connectDB();

  await Coupon.findOneAndUpdate(
    {
      code: couponCode.toUpperCase().trim(),
    },
    {
      $inc: { usedCount: -1 },
    }
  );
}

/**
 * Check per-user coupon usage
 * Would need a separate CouponUsage collection in production
 */
export async function checkPerUserUsage(
  couponCode: string,
  customerId: string
): Promise<number> {
  await connectDB();
  const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim() }).select('_id');
  if (!coupon) return 0;
  return CouponUsage.countDocuments({ coupon: coupon._id, customer: new Types.ObjectId(customerId) });
}
