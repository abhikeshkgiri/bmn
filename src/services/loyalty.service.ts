/**
 * Loyalty & Membership Service
 * Handles loyalty points, memberships, and benefits
 */

import { Types } from 'mongoose';
import { LoyaltyAccount, LoyaltyTransaction, TransactionType } from '@/models/Loyalty';
import { CustomerMembership, MembershipPlan, type IMembershipPlan, MembershipStatus } from '@/models/Membership';
import { connectDB } from '@/lib/db';

export const LOYALTY_CONFIG = {
  POINTS_PER_RUPEE: 1, // 1 point per rupee spent
  MEMBERSHIP_DISCOUNT_STACKING: false, // Can membership + coupon stack?
  POINTS_EXPIRY_DAYS: null, // null = never expire
} as const;

export interface LoyaltyStats {
  pointsBalance: number;
  lifetimePoints: number;
  redeemedPoints: number;
  currentMembership?: {
    planName: string;
    discount: number;
    expiryDate: Date;
  };
}

export interface LoyaltyTransaction {
  type: string;
  points: number;
  reason: string;
  date: Date;
}

/**
 * Error codes
 */
export const LOYALTY_ERRORS = {
  ACCOUNT_NOT_FOUND: { code: 'ACCOUNT_NOT_FOUND', message: 'Loyalty account not found' },
  INSUFFICIENT_POINTS: { code: 'INSUFFICIENT_POINTS', message: 'Insufficient loyalty points' },
  INVALID_AMOUNT: { code: 'INVALID_AMOUNT', message: 'Invalid redemption amount' },
} as const;

/**
 * Get or create loyalty account for customer
 */
export async function getLoyaltyAccount(customerId: string): Promise<InstanceType<typeof LoyaltyAccount>> {
  await connectDB();

  let account = await LoyaltyAccount.findOne({ customer: new Types.ObjectId(customerId) });

  if (!account) {
    account = await LoyaltyAccount.create({
      customer: new Types.ObjectId(customerId),
      pointsBalance: 0,
      lifetimePoints: 0,
      redeemedPoints: 0,
    });
  }

  return account;
}

/**
 * Award loyalty points after successful booking completion
 * Called when booking status changes to COMPLETED
 */
export async function awardLoyaltyPoints(
  bookingId: string,
  customerId: string,
  bookingAmount: number
): Promise<InstanceType<typeof LoyaltyAccount>> {
  await connectDB();

  // Calculate points (1 point per rupee)
  const points = Math.floor((bookingAmount / 100) * LOYALTY_CONFIG.POINTS_PER_RUPEE);

  if (points <= 0) {
    throw { code: 'INVALID_AMOUNT', message: 'Booking amount too low to earn points' };
  }

  // Get or create loyalty account
  const account = await getLoyaltyAccount(customerId);

  // Check if points already awarded for this booking (idempotency)
  const existingTx = await LoyaltyTransaction.findOne({
    bookingId: new Types.ObjectId(bookingId),
    transactionType: TransactionType.EARN,
  });

  if (existingTx) {
    // Already awarded, return account without double-crediting
    return account;
  }

  // Award points atomically
  const updated = await LoyaltyAccount.findOneAndUpdate(
    { _id: account._id },
    {
      $inc: {
        pointsBalance: points,
        lifetimePoints: points,
      },
    },
    { new: true }
  );

  // Record transaction
  await LoyaltyTransaction.create({
    account: account._id,
    customer: new Types.ObjectId(customerId),
    transactionType: TransactionType.EARN,
    points,
    reason: `Booking completed`,
    bookingId: new Types.ObjectId(bookingId),
    description: `₹${(bookingAmount / 100).toFixed(2)} spent = ${points} points`,
  });

  return updated;
}

/**
 * Redeem loyalty points for discount
 * Called during checkout validation
 */
export async function redeemLoyaltyPoints(
  customerId: string,
  pointsToRedeem: number
): Promise<{ discount: number; newBalance: number }> {
  await connectDB();

  if (pointsToRedeem <= 0) {
    throw LOYALTY_ERRORS.INVALID_AMOUNT;
  }

  const account = await LoyaltyAccount.findOne({ customer: new Types.ObjectId(customerId) });

  if (!account) {
    throw LOYALTY_ERRORS.ACCOUNT_NOT_FOUND;
  }

  if (account.pointsBalance < pointsToRedeem) {
    throw LOYALTY_ERRORS.INSUFFICIENT_POINTS;
  }

  // Conversion: 100 points = ₹10 (configurable)
  const discount = Math.floor((pointsToRedeem / 100) * 1000); // Convert to paise

  // Redeem points atomically
  const updated = await LoyaltyAccount.findOneAndUpdate(
    {
      _id: account._id,
      pointsBalance: { $gte: pointsToRedeem },
    },
    {
      $inc: {
        pointsBalance: -pointsToRedeem,
        redeemedPoints: pointsToRedeem,
      },
    },
    { new: true }
  );

  if (!updated) {
    throw LOYALTY_ERRORS.INSUFFICIENT_POINTS;
  }

  // Record transaction
  await LoyaltyTransaction.create({
    account: account._id,
    customer: new Types.ObjectId(customerId),
    transactionType: TransactionType.REDEEM,
    points: -pointsToRedeem,
    reason: `Points redeemed for discount`,
    description: `${pointsToRedeem} points = ₹${(discount / 100).toFixed(2)} discount`,
  });

  return {
    discount,
    newBalance: updated.pointsBalance,
  };
}

/**
 * Reverse points if booking is cancelled/refunded
 */
export async function reversePointsForRefund(bookingId: string, customerId: string): Promise<void> {
  await connectDB();

  // Find original transaction
  const originalTx = await LoyaltyTransaction.findOne({
    bookingId: new Types.ObjectId(bookingId),
    transactionType: TransactionType.EARN,
  });

  if (!originalTx) {
    return; // No points were awarded
  }

  const account = await LoyaltyAccount.findOne({ customer: new Types.ObjectId(customerId) });

  if (!account) {
    return;
  }

  // Reverse points
  await LoyaltyAccount.findOneAndUpdate(
    { _id: account._id },
    {
      $inc: {
        pointsBalance: -originalTx.points,
        lifetimePoints: -originalTx.points,
      },
    }
  );

  // Record reversal transaction
  await LoyaltyTransaction.create({
    account: account._id,
    customer: new Types.ObjectId(customerId),
    transactionType: TransactionType.REFUND_REVERSAL,
    points: -originalTx.points,
    reason: `Booking cancelled - points reversed`,
    bookingId: new Types.ObjectId(bookingId),
  });
}

/**
 * Get loyalty statistics for customer
 */
export async function getLoyaltyStats(customerId: string): Promise<LoyaltyStats> {
  await connectDB();

  const account = await getLoyaltyAccount(customerId);
  const membership = await CustomerMembership.findOne({
    customer: new Types.ObjectId(customerId),
    status: MembershipStatus.ACTIVE,
  }).populate('plan');

  const stats: LoyaltyStats = {
    pointsBalance: account.pointsBalance,
    lifetimePoints: account.lifetimePoints,
    redeemedPoints: account.redeemedPoints,
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (membership && (membership as any).plan) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plan = (membership as any).plan as IMembershipPlan;
    stats.currentMembership = {
      planName: plan.name,
      discount: plan.discountPercentage || 0,
      expiryDate: membership.expiryDate,
    };
  }

  return stats;
}

/**
 * Get loyalty transaction history with pagination
 */
export async function getLoyaltyHistory(
  customerId: string,
  page: number = 1,
  limit: number = 10
): Promise<{
  transactions: InstanceType<typeof LoyaltyTransaction>[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  await connectDB();

  const account = await LoyaltyAccount.findOne({ customer: new Types.ObjectId(customerId) });

  if (!account) {
    return {
      transactions: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    };
  }

  const skip = (page - 1) * limit;
  const total = await LoyaltyTransaction.countDocuments({ account: account._id });
  const totalPages = Math.ceil(total / limit);

  const transactions = await LoyaltyTransaction.find({ account: account._id })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('bookingId');

  return {
    transactions,
    pagination: { page, limit, total, totalPages },
  };
}

/**
 * Get active membership for customer
 */
export async function getActiveMembership(
  customerId: string
): Promise<(InstanceType<typeof CustomerMembership> & { plan: IMembershipPlan }) | null> {
  await connectDB();

  const now = new Date();

  const membership = (await CustomerMembership.findOne({
    customer: new Types.ObjectId(customerId),
    status: MembershipStatus.ACTIVE,
    expiryDate: { $gte: now },
  }).populate('plan')) as InstanceType<typeof CustomerMembership> & { plan: IMembershipPlan };

  return membership || null;
}

/**
 * Get all membership plans
 */
export async function getMembershipPlans(): Promise<InstanceType<typeof MembershipPlan>[]> {
  await connectDB();

  return await MembershipPlan.find({ active: true }).sort({ price: 1 });
}

/**
 * Calculate effective discount (membership + coupon, with stacking rules)
 */
export function calculateEffectiveDiscount(
  bookingAmount: number,
  membershipDiscount: number = 0,
  couponDiscount: number = 0
): number {
  // By default, we don't stack discounts
  if (LOYALTY_CONFIG.MEMBERSHIP_DISCOUNT_STACKING === false) {
    // Use the higher discount
    return Math.max(membershipDiscount, couponDiscount);
  } else {
    // Stack discounts
    return membershipDiscount + couponDiscount;
  }
}

/**
 * Check if customer can use membership discount for this booking
 */
export async function canUseMembershipDiscount(customerId: string): Promise<boolean> {
  const membership = await getActiveMembership(customerId);
  return !!membership;
}

/**
 * Get membership discount for eligible customer
 */
export async function getMembershipDiscount(
  customerId: string,
  bookingAmount: number
): Promise<number> {
  const membership = await getActiveMembership(customerId);

  if (!membership) {
    return 0;
  }

  if (membership.plan.discountPercentage && membership.plan.discountPercentage > 0) {
    return Math.floor((bookingAmount * membership.plan.discountPercentage) / 100);
  }

  return 0;
}
