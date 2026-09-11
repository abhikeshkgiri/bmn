import { Types } from 'mongoose';
import mongoose from 'mongoose';
import { CustomerMembership, MembershipPlan, MembershipStatus } from '@/models/Membership';
import Payment from '@/models/Payment';
import { connectDB } from '@/lib/db';
import { getRazorpayClient, verifyPaymentSignature } from '@/lib/razorpay';
import type { AuthUser } from '@/types';

export const MEMBERSHIP_ERRORS = {
  PLAN_NOT_FOUND: { code: 'PLAN_NOT_FOUND', message: 'Membership plan not found' },
  ACTIVE_MEMBERSHIP: { code: 'ACTIVE_MEMBERSHIP', message: 'An active membership already exists' },
  PAYMENT_NOT_FOUND: { code: 'PAYMENT_NOT_FOUND', message: 'Membership payment not found' },
  INVALID_SIGNATURE: { code: 'INVALID_SIGNATURE', message: 'Membership payment signature is invalid' },
};

export function isMembershipActive(expiryDate: Date, status: MembershipStatus): boolean {
  return status === MembershipStatus.ACTIVE && expiryDate >= new Date();
}

export async function getPlans() {
  await connectDB();
  return MembershipPlan.find({ active: true }).sort({ price: 1 });
}

export async function getMembership(customerId: string) {
  await connectDB();
  const membership = await CustomerMembership.findOne({ customer: new Types.ObjectId(customerId) }).populate('plan');
  if (membership && membership.status === MembershipStatus.ACTIVE && membership.expiryDate < new Date()) {
    membership.status = MembershipStatus.EXPIRED;
    await membership.save();
  }
  return membership;
}

export async function createMembershipOrder(planId: string, currentUser: AuthUser) {
  await connectDB();
  const plan = await MembershipPlan.findOne({ _id: planId, active: true });
  if (!plan) throw MEMBERSHIP_ERRORS.PLAN_NOT_FOUND;
  const current = await getMembership(currentUser._id);
  if (current?.status === MembershipStatus.ACTIVE && current.expiryDate >= new Date()) throw MEMBERSHIP_ERRORS.ACTIVE_MEMBERSHIP;

  const razorpayOrder = await getRazorpayClient().orders.create({
    amount: plan.price,
    currency: 'INR',
    receipt: `membership_${currentUser._id}_${plan._id}_${Date.now()}`,
    notes: { customerId: currentUser._id, planId: plan._id.toString() },
  });

  const membership = await CustomerMembership.findOneAndUpdate(
    { customer: new Types.ObjectId(currentUser._id) },
    {
      customer: new Types.ObjectId(currentUser._id),
      plan: plan._id,
      startDate: new Date(),
      expiryDate: new Date(),
      status: MembershipStatus.INACTIVE,
      autoRenew: false,
    },
    { upsert: true, new: true },
  );
  await Payment.create({
    customer: new Types.ObjectId(currentUser._id),
    membership: membership._id,
    amount: plan.price,
    currency: 'INR',
    method: 'ONLINE',
    provider: 'RAZORPAY',
    providerOrderId: razorpayOrder.id,
    status: 'PENDING',
  });

  return { orderId: razorpayOrder.id, amount: plan.price, currency: 'INR', keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '', membershipId: membership._id };
}

export async function verifyMembershipPayment(
  membershipId: string,
  orderId: string,
  paymentId: string,
  signature: string,
  currentUser: AuthUser,
) {
  await connectDB();
  const membership = await CustomerMembership.findOne({ _id: membershipId, customer: new Types.ObjectId(currentUser._id) }).populate('plan');
  if (!membership) throw MEMBERSHIP_ERRORS.PAYMENT_NOT_FOUND;
  const payment = await Payment.findOne({ membership: membership._id, providerOrderId: orderId, customer: new Types.ObjectId(currentUser._id) });
  if (!payment) throw MEMBERSHIP_ERRORS.PAYMENT_NOT_FOUND;
  if (payment.status === 'PAID') return membership;
  if (!verifyPaymentSignature(orderId, paymentId, signature)) throw MEMBERSHIP_ERRORS.INVALID_SIGNATURE;

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const updatedPayment = await Payment.findOneAndUpdate(
        { _id: payment._id, status: { $ne: 'PAID' } },
        { $set: { providerPaymentId: paymentId, providerSignature: signature, status: 'PAID' } },
        { new: true, session },
      );
      if (!updatedPayment) return;
      const plan = membership.plan as typeof membership.plan & { duration: number };
      const startDate = new Date();
      const expiryDate = new Date(startDate);
      expiryDate.setMonth(expiryDate.getMonth() + plan.duration);
      await CustomerMembership.updateOne(
        { _id: membership._id, customer: new Types.ObjectId(currentUser._id) },
        { $set: { status: MembershipStatus.ACTIVE, startDate, expiryDate, paymentId: payment._id } },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
  return getMembership(currentUser._id);
}
