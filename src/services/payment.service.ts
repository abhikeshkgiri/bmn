/**
 * Payment Service Layer
 * Core business logic for payment operations
 * All server-side validation and authorization happens here
 */

import Payment, { type IPayment } from '@/models/Payment';
import { randomUUID } from 'node:crypto';
import Booking, { type IBooking } from '@/models/Booking';
import {
  isBookingHoldExpired,
} from '@/utils/booking';
import {
  isProviderPaymentCaptured,
  isProviderPaymentMatching,
  isRefundWithinBalance,
} from '@/utils/payment';
import WebhookEvent from '@/models/WebhookEvent';
import { connectDB } from '@/lib/db';
import {
  getRazorpayClient,
  getRazorpayPublicKeyId,
  verifyPaymentSignature,
} from '@/lib/razorpay';
import type { AuthUser } from '@/types';
import { PAYMENT_STATUS, PAYMENT_METHOD, PAYMENT_PROVIDER, BOOKING_STATUS } from '@/constants/booking';
import {
  notifyBookingConfirmed,
  notifyPaymentSuccess,
} from '@/services/notification.service';
import { recordAuditEvent } from '@/services/audit.service';
import mongoose from 'mongoose';

/**
 * Payment error codes and messages
 */
export const PAYMENT_ERRORS = {
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'Authentication required',
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    message: 'You do not have permission to access this payment',
  },
  BOOKING_NOT_FOUND: {
    code: 'BOOKING_NOT_FOUND',
    message: 'Booking not found',
  },
  PAYMENT_NOT_FOUND: {
    code: 'PAYMENT_NOT_FOUND',
    message: 'Payment not found',
  },
  PAYMENT_ALREADY_COMPLETED: {
    code: 'PAYMENT_ALREADY_COMPLETED',
    message: 'Payment has already been completed',
  },
  INVALID_PAYMENT: {
    code: 'INVALID_PAYMENT',
    message: 'Invalid payment state',
  },
  PAYMENT_CAPTURED_BOOKING_UNCONFIRMED: {
    code: 'PAYMENT_CAPTURED_BOOKING_UNCONFIRMED',
    message: 'Payment was captured but the booking could not be confirmed. Please contact support.',
  },
  INVALID_SIGNATURE: {
    code: 'INVALID_SIGNATURE',
    message: 'Payment signature verification failed',
  },
  ORDER_MISMATCH: {
    code: 'ORDER_MISMATCH',
    message: 'Order ID mismatch',
  },
  AMOUNT_MISMATCH: {
    code: 'AMOUNT_MISMATCH',
    message: 'Payment amount does not match booking amount',
  },
  PAYMENT_FAILED: {
    code: 'PAYMENT_FAILED',
    message: 'Payment processing failed',
  },
  REFUND_FAILED: {
    code: 'REFUND_FAILED',
    message: 'Refund processing failed',
  },
  INVALID_PAYMENT_METHOD: {
    code: 'INVALID_PAYMENT_METHOD',
    message: 'Invalid payment method',
  },
  RAZORPAY_ERROR: {
    code: 'RAZORPAY_ERROR',
    message: 'Payment gateway error',
  },
  BOOKING_CANCELLED: {
    code: 'BOOKING_CANCELLED',
    message: 'Cannot process payment for cancelled booking',
  },
};

async function syncRefundStatusToBooking(payment: IPayment): Promise<void> {
  if (!payment.booking) return;
  await Booking.updateOne(
    {
      _id: payment.booking,
      paymentStatus: { $in: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_REFUNDED] },
    },
    { $set: { paymentStatus: payment.status } },
  );
}

/**
 * Create Razorpay order for a booking
 * Returns order details for frontend Checkout
 */
export async function createRazorpayOrder(
  bookingId: string,
  currentUser: AuthUser
): Promise<{
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}> {
  await connectDB();

  // Verify user is CUSTOMER
  if (currentUser.role !== 'CUSTOMER') {
    throw PAYMENT_ERRORS.UNAUTHORIZED;
  }

  // Fetch booking
  const booking = (await Booking.findById(bookingId)
    .populate('service')
    .lean()) as (IBooking & { service: Record<string, unknown> }) | null;

  if (!booking) {
    throw PAYMENT_ERRORS.BOOKING_NOT_FOUND;
  }

  // Verify booking belongs to current customer
  if (booking.customer.toString() !== currentUser._id) {
    throw PAYMENT_ERRORS.FORBIDDEN;
  }

  if (
    booking.status !== BOOKING_STATUS.PENDING ||
    booking.paymentStatus === PAYMENT_STATUS.PAID ||
    !booking.holdExpiresAt ||
    isBookingHoldExpired(booking.holdExpiresAt)
  ) {
    throw PAYMENT_ERRORS.BOOKING_CANCELLED;
  }

  if (!Number.isSafeInteger(booking.totalAmount) || booking.totalAmount <= 0) {
    throw PAYMENT_ERRORS.INVALID_PAYMENT;
  }

  const keyId = getRazorpayPublicKeyId();
  const payment = (await Payment.findOne({ booking: bookingId }).sort({ updatedAt: -1 })) as IPayment | null;

  if (payment?.status === PAYMENT_STATUS.PAID) {
    throw PAYMENT_ERRORS.PAYMENT_ALREADY_COMPLETED;
  }

  if (payment?.status === PAYMENT_STATUS.AUTHORIZED) {
    throw PAYMENT_ERRORS.INVALID_PAYMENT;
  }

  if (payment?.status === PAYMENT_STATUS.PENDING) {
    if (
      payment.amount !== booking.totalAmount ||
      payment.currency !== 'INR' ||
      !payment.providerOrderId
    ) {
      throw PAYMENT_ERRORS.AMOUNT_MISMATCH;
    }
    return {
      orderId: payment.providerOrderId,
      amount: payment.amount,
      currency: payment.currency,
      keyId,
    };
  }

  if (payment && payment.status !== PAYMENT_STATUS.FAILED) {
    throw PAYMENT_ERRORS.INVALID_PAYMENT;
  }

  // Create Razorpay order
  const razorpay = getRazorpayClient();
  let razorpayOrder: { id: string };

  try {
    razorpayOrder = await razorpay.orders.create({
      amount: booking.totalAmount, // Already in paise
      currency: 'INR',
      receipt: `bk_${randomUUID()}`,
      notes: {
        bookingId: bookingId.toString(),
        customerId: currentUser._id.toString(),
      },
    });
  } catch (error) {
    console.error('Razorpay order creation failed:', error);
    throw PAYMENT_ERRORS.RAZORPAY_ERROR;
  }

  // Create or update payment record
  const newPayment = new Payment({
    booking: bookingId,
    customer: currentUser._id,
    amount: booking.totalAmount,
    currency: 'INR',
    method: PAYMENT_METHOD.CARD,
    provider: PAYMENT_PROVIDER.RAZORPAY,
    providerOrderId: razorpayOrder.id,
    status: PAYMENT_STATUS.PENDING,
  });
  await newPayment.save();

  return {
    orderId: razorpayOrder.id,
    amount: booking.totalAmount,
    currency: 'INR',
    keyId,
  };
}

/**
 * Verify Razorpay payment signature and confirm payment
 * Updates Payment and Booking status on success
 * Idempotent: safe to call multiple times
 */
export async function verifyRazorpayPayment(
  bookingId: string,
  orderId: string,
  paymentId: string,
  signature: string,
  currentUser: AuthUser
): Promise<IPayment> {
  await connectDB();

  // Verify user is CUSTOMER
  if (currentUser.role !== 'CUSTOMER') {
    throw PAYMENT_ERRORS.UNAUTHORIZED;
  }

  // Fetch booking to verify ownership and amount
  const booking = (await Booking.findById(bookingId)) as IBooking | null;

  if (!booking) {
    throw PAYMENT_ERRORS.BOOKING_NOT_FOUND;
  }

  // Verify booking belongs to current customer
  if (booking.customer.toString() !== currentUser._id) {
    throw PAYMENT_ERRORS.FORBIDDEN;
  }

  const payment = (await Payment.findOne({
    booking: bookingId,
    providerOrderId: orderId,
  })) as IPayment | null;

  if (!payment) {
    throw PAYMENT_ERRORS.PAYMENT_NOT_FOUND;
  }

  // Verify Razorpay signature
  const isSignatureValid = verifyPaymentSignature(orderId, paymentId, signature);
  if (!isSignatureValid) {
    throw PAYMENT_ERRORS.INVALID_SIGNATURE;
  }

  // Verify amount matches
  if (
    payment.amount !== booking.totalAmount ||
    payment.currency !== 'INR'
  ) {
    throw PAYMENT_ERRORS.AMOUNT_MISMATCH;
  }

  if (payment.status === PAYMENT_STATUS.PAID) {
    if (payment.providerPaymentId !== paymentId) {
      throw PAYMENT_ERRORS.INVALID_PAYMENT;
    }
    if (booking.paymentStatus !== PAYMENT_STATUS.PAID) {
      throw PAYMENT_ERRORS.PAYMENT_CAPTURED_BOOKING_UNCONFIRMED;
    }
    await notifyBookingConfirmed(bookingId);
    await notifyPaymentSuccess(bookingId);
    return payment;
  }

  if (payment.status !== PAYMENT_STATUS.PENDING && payment.status !== PAYMENT_STATUS.AUTHORIZED) {
    throw PAYMENT_ERRORS.INVALID_PAYMENT;
  }

  let providerPayment;
  try {
    providerPayment = await getRazorpayClient().payments.fetch(paymentId);
  } catch (error) {
    console.error('Razorpay payment lookup failed:', error);
    throw PAYMENT_ERRORS.RAZORPAY_ERROR;
  }
  if (
    !isProviderPaymentMatching(providerPayment, {
      orderId,
      amount: payment.amount,
      currency: payment.currency,
    })
  ) {
    throw PAYMENT_ERRORS.AMOUNT_MISMATCH;
  }
  if (!isProviderPaymentCaptured(providerPayment)) {
    throw PAYMENT_ERRORS.INVALID_PAYMENT;
  }

  const session = await mongoose.startSession();
  let verifiedPayment: IPayment | null = null;
  try {
    await session.withTransaction(async () => {
      const currentBooking = await Booking.findOne({
        _id: bookingId,
        status: BOOKING_STATUS.PENDING,
        paymentStatus: { $ne: PAYMENT_STATUS.PAID },
        holdExpiresAt: { $gt: new Date() },
      }).session(session);

      if (!currentBooking || isBookingHoldExpired(currentBooking.holdExpiresAt)) {
        throw PAYMENT_ERRORS.BOOKING_CANCELLED;
      }

      verifiedPayment = await Payment.findOneAndUpdate(
        {
          _id: payment._id,
          status: { $in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.AUTHORIZED] },
          $or: [
            { providerPaymentId: null },
            { providerPaymentId: { $exists: false } },
            { providerPaymentId: paymentId },
          ],
        },
        {
          $set: {
            providerPaymentId: paymentId,
            providerSignature: signature,
            status: PAYMENT_STATUS.PAID,
            paidAt: new Date(),
          },
        },
        { new: true, session },
      ) as IPayment | null;

      if (!verifiedPayment) {
        verifiedPayment = await Payment.findById(payment._id).session(session) as IPayment | null;
        return;
      }

      const bookingUpdate = await Booking.updateOne(
        {
          _id: bookingId,
          status: BOOKING_STATUS.PENDING,
          paymentStatus: { $ne: PAYMENT_STATUS.PAID },
          holdExpiresAt: { $gt: new Date() },
        },
        {
          $set: {
            paymentStatus: PAYMENT_STATUS.PAID,
            status: BOOKING_STATUS.CONFIRMED,
            holdExpiresAt: null,
          },
        },
        { session },
      );
      if (bookingUpdate.modifiedCount !== 1) {
        throw PAYMENT_ERRORS.BOOKING_CANCELLED;
      }
    });
  } finally {
    await session.endSession();
  }

  if (!verifiedPayment) {
    throw PAYMENT_ERRORS.INVALID_PAYMENT;
  }

  const paymentToReturn = verifiedPayment as IPayment;
  if (
    paymentToReturn.status !== PAYMENT_STATUS.PAID ||
    paymentToReturn.providerPaymentId !== paymentId
  ) {
    throw PAYMENT_ERRORS.INVALID_PAYMENT;
  }

  await notifyBookingConfirmed(bookingId);
  await notifyPaymentSuccess(bookingId);
  await recordAuditEvent({
    actor: currentUser,
    action: 'PAYMENT_VERIFIED',
    entityType: 'Payment',
    entityId: paymentToReturn._id.toString(),
    metadata: { bookingId },
  });

  return paymentToReturn;
}

/**
 * Record payment failure
 */
export async function recordPaymentFailure(
  bookingId: string,
  orderId: string,
  currentUser: AuthUser,
  errorCode?: string,
  errorDescription?: string
): Promise<void> {
  await connectDB();

  if (currentUser.role !== 'CUSTOMER') {
    throw PAYMENT_ERRORS.UNAUTHORIZED;
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    customer: currentUser._id,
    status: BOOKING_STATUS.PENDING,
    paymentStatus: { $ne: PAYMENT_STATUS.PAID },
    holdExpiresAt: { $gt: new Date() },
  });
  if (!booking) {
    throw PAYMENT_ERRORS.BOOKING_NOT_FOUND;
  }

  const payment = await Payment.findOne({
    booking: bookingId,
    providerOrderId: orderId,
  });

  if (payment) {
    const update = await Payment.updateOne(
    {
      _id: payment._id,
      status: PAYMENT_STATUS.PENDING,
    },
    {
      $set: {
        'metadata.customerReportedFailure': {
          ...(errorCode ? { errorCode } : {}),
          ...(errorDescription ? { errorDescription } : {}),
          reportedAt: new Date(),
        },
      },
    },
    );
    if (update.matchedCount === 0) {
    return;
    }
    return;
  }

  throw PAYMENT_ERRORS.PAYMENT_NOT_FOUND;
}

/**
 * Get payment by booking ID
 * Verifies customer ownership
 */
export async function getPaymentByBooking(
  bookingId: string,
  currentUser: AuthUser
): Promise<IPayment | null> {
  await connectDB();

  if (currentUser.role !== 'CUSTOMER') {
    throw PAYMENT_ERRORS.UNAUTHORIZED;
  }

  // Fetch booking to verify ownership
  const booking = (await Booking.findById(bookingId)) as IBooking | null;

  if (!booking) {
    throw PAYMENT_ERRORS.BOOKING_NOT_FOUND;
  }

  // Check authorization
  if (currentUser.role === 'CUSTOMER' && booking.customer.toString() !== currentUser._id) {
    throw PAYMENT_ERRORS.FORBIDDEN;
  }

  // Fetch and return payment
  const payment = (await Payment.findOne({
    booking: bookingId,
  }).sort({ updatedAt: -1 })) as IPayment | null;

  return payment;
}

/**
 * Get payment by ID
 * Verifies customer ownership
 */
export async function getPaymentById(
  paymentId: string,
  currentUser: AuthUser
): Promise<IPayment | null> {
  await connectDB();

  const payment = (await Payment.findById(paymentId)
    .populate('booking')
    .lean()) as (IPayment & { booking?: IBooking }) | null;

  if (!payment) {
    throw PAYMENT_ERRORS.PAYMENT_NOT_FOUND;
  }

  if (currentUser.role !== 'CUSTOMER') {
    throw PAYMENT_ERRORS.UNAUTHORIZED;
  }
  if (!payment.booking || (payment.booking as { customer?: { toString: () => string } }).customer?.toString() !== currentUser._id) {
    throw PAYMENT_ERRORS.FORBIDDEN;
  }

  return payment;
}

/**
 * Process refund via Razorpay
 * Updates payment status and refund amount
 */
export async function processRefund(
  paymentId: string,
  refundAmount?: number,
  reason?: string,
  actor?: AuthUser,
): Promise<IPayment> {
  await connectDB();

  const payment = (await Payment.findById(paymentId)) as IPayment | null;

  if (!payment) {
    throw PAYMENT_ERRORS.PAYMENT_NOT_FOUND;
  }

  if (
    payment.status !== PAYMENT_STATUS.PAID &&
    payment.status !== PAYMENT_STATUS.PARTIALLY_REFUNDED
  ) {
    throw PAYMENT_ERRORS.INVALID_PAYMENT;
  }

  // Use full amount if not specified
  const amountToRefund = refundAmount === undefined ? payment.amount : refundAmount;

  // Verify refund amount does not exceed payment amount
  if (
    !isRefundWithinBalance(amountToRefund, payment.refundAmount || 0, payment.amount) ||
    !payment.providerPaymentId
  ) {
    throw PAYMENT_ERRORS.PAYMENT_FAILED;
  }

  // Process refund via Razorpay
  const razorpay = getRazorpayClient();
  let refund: {
    id: string;
    payment_id: string;
    amount?: number;
    status: 'pending' | 'processed' | 'failed';
  };

  try {
    refund = await razorpay.payments.refund(payment.providerPaymentId, {
      amount: amountToRefund,
      notes: {
        reason: reason || 'Customer requested refund',
      },
    });
  } catch (error) {
    console.error('Razorpay refund failed:', error);
    throw PAYMENT_ERRORS.REFUND_FAILED;
  }

  if (
    !refund.id ||
    refund.payment_id !== payment.providerPaymentId ||
    refund.amount !== amountToRefund ||
    refund.status === 'failed'
  ) {
    throw PAYMENT_ERRORS.REFUND_FAILED;
  }

  let updatedPayment = (await Payment.findOneAndUpdate(
    {
      _id: payment._id,
      status: { $in: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_REFUNDED] },
      processedRefundIds: { $ne: refund.id },
      $expr: {
        $lte: [
          { $add: [{ $ifNull: ['$refundAmount', 0] }, amountToRefund] },
          '$amount',
        ],
      },
    },
    {
      $inc: { refundAmount: refund.amount },
      $addToSet: { processedRefundIds: refund.id },
    },
    { new: true },
  )) as IPayment | null;
  if (!updatedPayment) {
    updatedPayment = (await Payment.findOne({
      _id: payment._id,
      processedRefundIds: refund.id,
    })) as IPayment | null;
  }
  if (!updatedPayment) {
    throw PAYMENT_ERRORS.REFUND_FAILED;
  }
  updatedPayment.status = refund.status === 'processed' &&
    (updatedPayment.refundAmount || 0) >= updatedPayment.amount
    ? PAYMENT_STATUS.REFUNDED
    : PAYMENT_STATUS.PARTIALLY_REFUNDED;
  await updatedPayment.save();
  await syncRefundStatusToBooking(updatedPayment);
  await recordAuditEvent({
    actor,
    action: 'PAYMENT_REFUNDED',
    entityType: 'Payment',
    entityId: updatedPayment._id.toString(),
    metadata: { amount: refund.amount, reason: reason || 'Customer requested refund' },
  });

  return updatedPayment;
}

/**
 * Handle webhook payment event
 * Updates payment status based on Razorpay events
 */
export async function handleWebhookEvent(
  event: string,
  data: Record<string, unknown>,
  eventId: string,
): Promise<void> {
  await connectDB();

  const existingEvent = await WebhookEvent.findOne({ eventId });
  if (existingEvent?.status === 'PROCESSED' || existingEvent?.status === 'PROCESSING') {
    return;
  }

  if (existingEvent) {
    existingEvent.status = 'PROCESSING';
    existingEvent.attempts += 1;
    existingEvent.lastError = undefined;
    await existingEvent.save();
  } else {
    await WebhookEvent.create({ eventId, event, status: 'PROCESSING', attempts: 1 });
  }

  try {
    switch (event) {
    case 'payment.captured': {
      const paymentData = data.payment as Record<string, unknown> | undefined;
      const paymentId = paymentData?.id;
      const orderId = paymentData?.order_id;
      const amount = paymentData?.amount;
      const currency = paymentData?.currency;

      if (
        !paymentData ||
        typeof paymentId !== 'string' ||
        typeof orderId !== 'string' ||
        typeof amount !== 'number' ||
        typeof currency !== 'string' ||
        !isProviderPaymentCaptured(paymentData)
      ) {
        throw PAYMENT_ERRORS.INVALID_PAYMENT;
      }

      const storedPayment = await Payment.findOne({ providerOrderId: orderId });
      if (!storedPayment) {
        throw PAYMENT_ERRORS.PAYMENT_NOT_FOUND;
      }
      if (!isProviderPaymentMatching(
        { order_id: orderId, amount, currency },
        { orderId, amount: storedPayment.amount, currency: storedPayment.currency },
      )) {
        throw PAYMENT_ERRORS.AMOUNT_MISMATCH;
      }
      if (
        storedPayment.status === PAYMENT_STATUS.PAID &&
        storedPayment.providerPaymentId !== paymentId
      ) {
        throw PAYMENT_ERRORS.INVALID_PAYMENT;
      }

      const payment = await Payment.findOneAndUpdate(
        {
          _id: storedPayment._id,
          $or: [
            { status: { $in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.AUTHORIZED, PAYMENT_STATUS.FAILED] } },
            { status: PAYMENT_STATUS.PAID, providerPaymentId: paymentId },
          ],
        },
        {
          $set: {
            providerPaymentId: paymentId,
            status: PAYMENT_STATUS.PAID,
            paidAt: storedPayment.paidAt || new Date(),
          },
        },
        { new: true },
      );
      if (!payment) {
        throw PAYMENT_ERRORS.INVALID_PAYMENT;
      }

      if (payment.booking) {
        const bookingUpdate = await Booking.updateOne(
          {
            _id: payment.booking,
            status: BOOKING_STATUS.PENDING,
            paymentStatus: { $ne: PAYMENT_STATUS.PAID },
            holdExpiresAt: { $gt: new Date() },
          },
          { $set: { paymentStatus: PAYMENT_STATUS.PAID, status: BOOKING_STATUS.CONFIRMED, holdExpiresAt: null } },
        );
        if (bookingUpdate.modifiedCount === 0) {
          console.error('Captured payment could not confirm an expired or non-pending booking', {
            bookingId: payment.booking.toString(),
            eventId,
          });
        }
        const confirmedBooking = await Booking.exists({
          _id: payment.booking,
          status: BOOKING_STATUS.CONFIRMED,
          paymentStatus: PAYMENT_STATUS.PAID,
        });
        if (confirmedBooking) {
          await notifyBookingConfirmed(payment.booking.toString());
          await notifyPaymentSuccess(payment.booking.toString());
        }
      }
      break;
    }

    case 'payment.failed': {
      const paymentData = data.payment as Record<string, unknown> | undefined;
      const orderId = paymentData?.order_id;

      if (typeof orderId === 'string') {
        await Payment.updateOne(
          {
            providerOrderId: orderId,
            status: { $in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.AUTHORIZED] },
          },
          { $set: { status: PAYMENT_STATUS.FAILED } },
        );
      }
      break;
    }

    case 'refund.created': {
      // Refund initiated
      const refundData = data.refund as Record<string, unknown> | undefined;
      const paymentId = refundData?.payment_id;
      const refundId = refundData?.id;
      const refundAmount = refundData?.amount;

      if (
        typeof paymentId === 'string' &&
        typeof refundId === 'string' &&
        typeof refundAmount === 'number' &&
        Number.isSafeInteger(refundAmount) &&
        refundAmount > 0
      ) {
        let payment = await Payment.findOneAndUpdate(
          {
            providerPaymentId: paymentId,
            processedRefundIds: { $ne: refundId },
            $expr: {
              $lte: [
                { $add: [{ $ifNull: ['$refundAmount', 0] }, refundAmount] },
                '$amount',
              ],
            },
          },
          {
            $inc: { refundAmount },
            $addToSet: { processedRefundIds: refundId },
            $set: { status: PAYMENT_STATUS.PARTIALLY_REFUNDED },
          },
          { new: true },
        );
        if (!payment) {
          payment = await Payment.findOne({
            providerPaymentId: paymentId,
            processedRefundIds: refundId,
          });
          if (!payment) {
            throw PAYMENT_ERRORS.PAYMENT_FAILED;
          }
        }
        await syncRefundStatusToBooking(payment);
      }
      break;
    }

    case 'refund.processed': {
      const refundData = data.refund as Record<string, unknown> | undefined;
      const paymentId = refundData?.payment_id;
      const refundId = refundData?.id;
      const refundAmount = refundData?.amount;

      if (
        typeof paymentId !== 'string' ||
        typeof refundId !== 'string' ||
        typeof refundAmount !== 'number' ||
        !Number.isSafeInteger(refundAmount) ||
        refundAmount <= 0
      ) {
        throw PAYMENT_ERRORS.INVALID_PAYMENT;
      }

      await Payment.updateOne(
        {
          providerPaymentId: paymentId,
          processedRefundIds: { $ne: refundId },
          $expr: {
            $lte: [
              { $add: [{ $ifNull: ['$refundAmount', 0] }, refundAmount] },
              '$amount',
            ],
          },
        },
        {
          $inc: { refundAmount },
          $addToSet: { processedRefundIds: refundId },
        },
      );

      const payment = await Payment.findOne({
        providerPaymentId: paymentId,
        processedRefundIds: refundId,
      });
      if (!payment) {
        throw PAYMENT_ERRORS.PAYMENT_FAILED;
      }
      payment.status = (payment.refundAmount || 0) >= payment.amount
        ? PAYMENT_STATUS.REFUNDED
        : PAYMENT_STATUS.PARTIALLY_REFUNDED;
      await payment.save();
      await syncRefundStatusToBooking(payment);
      break;
    }
    }
    await WebhookEvent.updateOne({ eventId }, { $set: { status: 'PROCESSED', processedAt: new Date() } });
  } catch (error) {
    await WebhookEvent.updateOne(
      { eventId },
      { $set: { status: 'FAILED', lastError: error instanceof Error ? error.message : 'Webhook processing failed' } },
    );
    throw error;
  }
}
