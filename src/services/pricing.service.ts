import { Types } from 'mongoose';
import CouponUsage from '@/models/CouponUsage';
import Coupon, { type ICoupon } from '@/models/Coupon';
import Salon from '@/models/Salon';
import Service from '@/models/Service';
import { connectDB } from '@/lib/db';
import { validateCoupon } from '@/services/coupon.service';
import { getActiveMembership, getMembershipDiscount, LOYALTY_CONFIG } from '@/services/loyalty.service';
import { LoyaltyAccount } from '@/models/Loyalty';
import mongoose from 'mongoose';

export interface CheckoutPriceInput {
  salonId: string;
  serviceId: string;
  customerId: string;
  couponCode?: string;
  loyaltyPoints?: number;
}

export interface CheckoutPrice {
  servicePrice: number;
  subtotal: number;
  membershipDiscount: number;
  couponDiscount: number;
  loyaltyDiscount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  coupon?: ICoupon;
  couponCode?: string;
  loyaltyPoints: number;
  membershipPlan?: string;
}

export async function calculateCheckoutPrice(input: CheckoutPriceInput): Promise<CheckoutPrice> {
  await connectDB();

  const [salon, service] = await Promise.all([
    Salon.findById(input.salonId).select('_id isActive'),
    Service.findById(input.serviceId).select('_id salon isActive price discountPrice'),
  ]);

  if (!salon || !salon.isActive) throw new Error('INVALID_SALON');
  if (!service || !service.isActive || service.salon.toString() !== input.salonId) throw new Error('INVALID_SERVICE');

  const servicePrice = service.discountPrice || service.price;
  const subtotal = Math.max(0, servicePrice);
  let couponDiscount = 0;
  let coupon: ICoupon | undefined;

  if (input.couponCode) {
    const result = await validateCoupon({
      couponCode: input.couponCode,
      salonId: input.salonId,
      serviceId: input.serviceId,
      customerId: input.customerId,
      subtotal,
    });
    if (!result.valid || !result.coupon) throw new Error(result.error || 'INVALID_COUPON');
    coupon = result.coupon;
    couponDiscount = result.discount || 0;
  }

  const membership = await getActiveMembership(input.customerId);
  const membershipDiscount = membership
    ? await getMembershipDiscount(input.customerId, subtotal)
    : 0;
  const effectivePrimaryDiscount = LOYALTY_CONFIG.MEMBERSHIP_DISCOUNT_STACKING
    ? membershipDiscount + couponDiscount
    : Math.max(membershipDiscount, couponDiscount);

  const afterPrimaryDiscount = Math.max(0, subtotal - effectivePrimaryDiscount);
  const requestedPoints = Math.max(0, Math.floor(input.loyaltyPoints || 0));
  let loyaltyPoints = 0;
  let loyaltyDiscount = 0;
  if (requestedPoints > 0) {
    const account = await LoyaltyAccount.findOne({ customer: new Types.ObjectId(input.customerId) });
    if (!account || account.pointsBalance < requestedPoints) throw new Error('INSUFFICIENT_POINTS');
    loyaltyPoints = requestedPoints;
    loyaltyDiscount = Math.min(
      afterPrimaryDiscount,
      Math.floor((requestedPoints / 100) * 1000),
    );
  }

  const discountAmount = Math.min(subtotal, effectivePrimaryDiscount + loyaltyDiscount);
  const taxAmount = 0;
  const totalAmount = Math.max(0, subtotal - discountAmount + taxAmount);

  return {
    servicePrice,
    subtotal,
    membershipDiscount: effectivePrimaryDiscount === membershipDiscount ? membershipDiscount : 0,
    couponDiscount: effectivePrimaryDiscount === couponDiscount ? couponDiscount : 0,
    loyaltyDiscount,
    discountAmount,
    taxAmount,
    totalAmount,
    coupon,
    couponCode: coupon?.code,
    loyaltyPoints,
    membershipPlan: membership?.plan?.name,
  };
}

export async function reserveCouponUsage(
  coupon: ICoupon,
  customerId: string,
  bookingId: string,
  session: mongoose.ClientSession,
): Promise<void> {
  // Touch the coupon document first so concurrent reservations serialize in the transaction.
  await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 0 } }, { session });
  const usageCount = await CouponUsage.countDocuments({
    coupon: coupon._id,
    customer: new Types.ObjectId(customerId),
  }).session(session);
  if (coupon.perUserLimit && usageCount >= coupon.perUserLimit) {
    throw new Error('COUPON_USER_LIMIT');
  }

  try {
    await CouponUsage.create([{
      coupon: coupon._id,
      customer: new Types.ObjectId(customerId),
      booking: new Types.ObjectId(bookingId),
    }], { session });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) throw new Error('COUPON_USER_LIMIT');
    throw error;
  }

  const updated = await Coupon.findOneAndUpdate(
    {
      _id: coupon._id,
      active: true,
      startDate: { $lte: new Date() },
      expiryDate: { $gte: new Date() },
      ...(coupon.usageLimit ? { $expr: { $lt: ['$usedCount', coupon.usageLimit] } } : {}),
    },
    { $inc: { usedCount: 1 } },
    { new: true, session },
  );
  if (!updated) throw new Error('COUPON_USAGE_LIMIT');
}

export async function releaseCouponUsage(bookingId: string, session?: mongoose.ClientSession): Promise<void> {
  await connectDB();
  const usage = await CouponUsage.findOneAndDelete({ booking: new Types.ObjectId(bookingId) }, session ? { session } : undefined);
  if (usage) await Coupon.updateOne({ _id: usage.coupon, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }, session ? { session } : undefined);
}
