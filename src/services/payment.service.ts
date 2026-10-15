/**
 * Payment Service Layer
 * Core business logic for payment operations
 * All server-side validation and authorization happens here
 */

import Payment, { type IPayment } from '@/models/Payment';
import { randomUUID } from 'node:crypto';
import Booking, { type IBooking } from '@/models/Booking';
import { isFeature22Booking } from '@/services/demo-booking-guard.service';
import {
  isBookingHoldExpired,
} from '@/utils/booking';
import {
  canTransitionPaymentToFailed,
  isBookingEligibleForCapturedPayment,
  isRefundPending,
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
  notifyPaymentRefunded,
  notifyPaymentSuccess,
  runNotificationSafely,
} from '@/services/notification.service';
import { recordAuditEvent } from '@/services/audit.service';
import mongoose from 'mongoose';

const PAYMENT_FAILURE_SOURCE_STATUSES = Object.values(PAYMENT_STATUS)
  .filter(canTransitionPaymentToFailed);

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
  ORDER_CREATION_IN_PROGRESS: {
    code: 'ORDER_CREATION_IN_PROGRESS',
    message: 'A payment order is being created. Please retry shortly.',
  },
  ORDER_CREATION_UNKNOWN: {
    code: 'ORDER_CREATION_UNKNOWN',
    message: 'Payment order creation needs reconciliation. Please contact support before retrying.',
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
  DEMO_TRANSACTION_NOT_ALLOWED: {
    code: 'DEMO_TRANSACTION_NOT_ALLOWED',
    message: 'Demo listings cannot participate in payments',
  },
};

async function syncRefundStatusToBooking(payment: IPayment): Promise<void> {
  if (!payment.booking) return;
  const booking = await Booking.findById(payment.booking);
  if (!booking || await isFeature22Booking(booking)) return;
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
  const booking = (await Booking.findById(bookingId).lean()) as IBooking | null;

  if (!booking) {
    throw PAYMENT_ERRORS.BOOKING_NOT_FOUND;
  }

  // Verify booking belongs to current customer
  if (booking.customer.toString() !== currentUser._id) {
    throw PAYMENT_ERRORS.FORBIDDEN;
  }
  if (await isFeature22Booking(booking)) throw PAYMENT_ERRORS.DEMO_TRANSACTION_NOT_ALLOWED;

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
  const payment = (await Payment.findOne({ booking: bookingId })
    .sort({ updatedAt: -1 })) as IPayment | null;

  if (payment?.status === PAYMENT_STATUS.PAID) {
    throw PAYMENT_ERRORS.PAYMENT_ALREADY_COMPLETED;
  }

  if (payment?.status === PAYMENT_STATUS.AUTHORIZED) {
    throw PAYMENT_ERRORS.INVALID_PAYMENT;
  }

  if (payment?.status === PAYMENT_STATUS.PENDING) {
    const metadata = payment.metadata as Record<string, unknown> | undefined;
    if (metadata?.orderCreationUnknown === true) {
      throw PAYMENT_ERRORS.ORDER_CREATION_UNKNOWN;
    }
    if (metadata?.orderCreationPending === true) {
      throw PAYMENT_ERRORS.ORDER_CREATION_IN_PROGRESS;
    }
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

  const razorpay = getRazorpayClient();
  const reservationId = randomUUID();
  const reservation = new Payment({
    booking: booking._id,
    activeBookingKey: booking._id,
    customer: currentUser._id,
    amount: booking.totalAmount,
    currency: 'INR',
    method: PAYMENT_METHOD.CARD,
    provider: PAYMENT_PROVIDER.RAZORPAY,
    providerOrderId: `order_pending_${reservationId}`,
    status: PAYMENT_STATUS.PENDING,
    metadata: {
      orderCreationPending: true,
      orderCreationStartedAt: new Date(),
    },
  });

  try {
    if (await isFeature22Booking(booking)) {
      throw PAYMENT_ERRORS.DEMO_TRANSACTION_NOT_ALLOWED;
    }
    await reservation.save();
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      const activePayment = await Payment.findOne({
        activeBookingKey: booking._id,
        status: PAYMENT_STATUS.PENDING,
      }) as IPayment | null;
      if (activePayment) {
        const metadata = activePayment.metadata as Record<string, unknown> | undefined;
        if (metadata?.orderCreationUnknown === true) {
          throw PAYMENT_ERRORS.ORDER_CREATION_UNKNOWN;
        }
        if (metadata?.orderCreationPending === true) {
          throw PAYMENT_ERRORS.ORDER_CREATION_IN_PROGRESS;
        }
        return {
          orderId: activePayment.providerOrderId,
          amount: activePayment.amount,
          currency: activePayment.currency,
          keyId,
        };
      }
    }
    throw error;
  }

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
  } catch {
    await Payment.updateOne(
      { _id: reservation._id, activeBookingKey: booking._id },
      {
        $set: {
          'metadata.orderCreationUnknown': true,
          'metadata.orderCreationErrorAt': new Date(),
        },
      },
    );
    console.error('Razorpay order creation failed; the order reservation requires reconciliation.');
    throw PAYMENT_ERRORS.RAZORPAY_ERROR;
  }

  if (!/^order_[A-Za-z0-9]+$/.test(razorpayOrder.id)) {
    throw PAYMENT_ERRORS.INVALID_PAYMENT;
  }

  const linkedPayment = await Payment.findOneAndUpdate(
    {
      _id: reservation._id,
      activeBookingKey: booking._id,
      providerOrderId: reservation.providerOrderId,
    },
    {
      $set: {
        providerOrderId: razorpayOrder.id,
        'metadata.orderCreationPending': false,
      },
      $unset: { 'metadata.orderCreationStartedAt': 1 },
    },
    { new: true },
  );
  if (!linkedPayment) {
    await Payment.updateOne(
      { _id: reservation._id, activeBookingKey: booking._id },
      {
        $set: {
          'metadata.orderCreationUnknown': true,
          'metadata.providerOrderIdForReconciliation': razorpayOrder.id,
          'metadata.orderCreationErrorAt': new Date(),
        },
      },
    );
    throw new Error('Provider order was created but could not be linked to its payment record.');
  }

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
  if (await isFeature22Booking(booking)) throw PAYMENT_ERRORS.DEMO_TRANSACTION_NOT_ALLOWED;

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
    if (
      booking.status !== BOOKING_STATUS.CONFIRMED ||
      booking.paymentStatus !== PAYMENT_STATUS.PAID
    ) {
      throw PAYMENT_ERRORS.PAYMENT_CAPTURED_BOOKING_UNCONFIRMED;
    }
    return payment;
  }

  if (
    payment.status !== PAYMENT_STATUS.PENDING &&
    payment.status !== PAYMENT_STATUS.AUTHORIZED &&
    payment.status !== PAYMENT_STATUS.FAILED
  ) {
    throw PAYMENT_ERRORS.INVALID_PAYMENT;
  }

  let providerPayment;
  try {
    providerPayment = await getRazorpayClient().payments.fetch(paymentId);
  } catch {
    console.error('Razorpay payment lookup failed.');
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
  let bookingConfirmed = false;
  let shouldNotifyBooking = false;
  let reconciliationRequired = false;
  try {
    await session.withTransaction(async () => {
      const currentBooking = await Booking.findById(bookingId).session(session);
      if (currentBooking && await isFeature22Booking(currentBooking, session)) {
        throw PAYMENT_ERRORS.DEMO_TRANSACTION_NOT_ALLOWED;
      }
      const canConfirmBooking = currentBooking != null &&
        isBookingEligibleForCapturedPayment(
          currentBooking.status,
          currentBooking.paymentStatus,
          currentBooking.holdExpiresAt,
          currentBooking.totalAmount === payment.amount && payment.currency === 'INR',
        );
      const alreadyConfirmed = currentBooking?.status === BOOKING_STATUS.CONFIRMED &&
        currentBooking.paymentStatus === PAYMENT_STATUS.PAID;
      let paymentAlreadyPaid = false;

      verifiedPayment = await Payment.findOneAndUpdate(
        {
          _id: payment._id,
          status: { $in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.AUTHORIZED, PAYMENT_STATUS.FAILED] },
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
          $unset: { activeBookingKey: 1 },
        },
        { new: true, session },
      ) as IPayment | null;

      if (!verifiedPayment) {
        verifiedPayment = await Payment.findById(payment._id).session(session) as IPayment | null;
        if (
          verifiedPayment?.status !== PAYMENT_STATUS.PAID ||
          verifiedPayment.providerPaymentId !== paymentId
        ) {
          throw PAYMENT_ERRORS.INVALID_PAYMENT;
        }
        paymentAlreadyPaid = true;
      }

      if (canConfirmBooking) {
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
        shouldNotifyBooking = bookingUpdate.modifiedCount === 1;
        bookingConfirmed = bookingUpdate.modifiedCount === 1 ||
          (alreadyConfirmed && paymentAlreadyPaid);
      } else {
        bookingConfirmed = alreadyConfirmed && paymentAlreadyPaid;
      }

      reconciliationRequired = !bookingConfirmed;
      if (reconciliationRequired) {
        await Payment.updateOne(
          { _id: payment._id, providerPaymentId: paymentId },
          {
            $set: {
              'metadata.reconciliationRequired': true,
              'metadata.reconciliationReason': currentBooking
                ? 'BOOKING_NOT_ELIGIBLE'
                : 'BOOKING_MISSING',
              'metadata.reconciliationAt': new Date(),
            },
          },
          { session },
        );
        verifiedPayment = await Payment.findById(payment._id).session(session) as IPayment | null;
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

  if (reconciliationRequired) {
    console.error('Captured payment requires booking reconciliation.', {
      paymentId: paymentToReturn._id.toString(),
      bookingId,
    });
    throw PAYMENT_ERRORS.PAYMENT_CAPTURED_BOOKING_UNCONFIRMED;
  }

  if (shouldNotifyBooking) {
    await runNotificationSafely('payment-verified-booking-confirmation', async () => {
      await notifyBookingConfirmed(bookingId);
      await notifyPaymentSuccess(bookingId);
    });
  }
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
    if (payment.status === PAYMENT_STATUS.PAID) {
      throw PAYMENT_ERRORS.PAYMENT_ALREADY_COMPLETED;
    }
    if (await isFeature22Booking(booking)) throw PAYMENT_ERRORS.DEMO_TRANSACTION_NOT_ALLOWED;
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
  if (await isFeature22Booking(booking)) throw PAYMENT_ERRORS.DEMO_TRANSACTION_NOT_ALLOWED;

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

  const payment = (await Payment.findById(paymentId).lean()) as IPayment | null;

  if (!payment) {
    throw PAYMENT_ERRORS.PAYMENT_NOT_FOUND;
  }
  if (currentUser.role !== 'CUSTOMER') {
    throw PAYMENT_ERRORS.UNAUTHORIZED;
  }
  if (payment.booking) {
    const booking = await Booking.findById(payment.booking);
    if (!booking || booking.customer.toString() !== currentUser._id) {
      throw PAYMENT_ERRORS.FORBIDDEN;
    }
    if (await isFeature22Booking(booking)) {
      throw PAYMENT_ERRORS.DEMO_TRANSACTION_NOT_ALLOWED;
    }
  }
  if (!payment.booking) {
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

  const payment = await Payment.findById(paymentId) as IPayment | null;

  if (!payment) {
    throw PAYMENT_ERRORS.PAYMENT_NOT_FOUND;
  }

  if (
    payment.status !== PAYMENT_STATUS.PAID &&
    payment.status !== PAYMENT_STATUS.PARTIALLY_REFUNDED
  ) {
    throw PAYMENT_ERRORS.INVALID_PAYMENT;
  }
  if (payment.booking) {
    const booking = await Booking.findById(payment.booking);
    if (booking && await isFeature22Booking(booking)) {
      throw PAYMENT_ERRORS.DEMO_TRANSACTION_NOT_ALLOWED;
    }
  }

  // Use full amount if not specified
  const amountToRefund = refundAmount === undefined
    ? payment.amount - (payment.refundAmount || 0)
    : refundAmount;
  if (!isRefundWithinBalance(amountToRefund, payment.refundAmount || 0, payment.amount) || !payment.providerPaymentId) {
    throw PAYMENT_ERRORS.PAYMENT_FAILED;
  }
  if (isRefundPending(payment.refundRequestStatus)) {
    throw PAYMENT_ERRORS.PAYMENT_FAILED;
  }

  const razorpay = getRazorpayClient();
  const requestId = randomUUID();
  const reservedPayment = await Payment.findOneAndUpdate(
    {
      _id: payment._id,
      status: { $in: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_REFUNDED] },
      refundRequestId: null,
      providerPaymentId: payment.providerPaymentId,
      $expr: {
        $lte: [
          { $add: [{ $ifNull: ['$refundAmount', 0] }, amountToRefund] },
          '$amount',
        ],
      },
    },
    {
      $set: {
        refundRequestId: requestId,
        refundRequestAmount: amountToRefund,
        refundRequestStatus: 'REQUESTED',
      },
    },
    { new: true },
  ) as IPayment | null;

  if (!reservedPayment) {
    throw PAYMENT_ERRORS.PAYMENT_FAILED;
  }

  let refund: {
    id: string;
    payment_id: string;
    amount?: number;
    status: 'pending' | 'processed' | 'failed';
  };

  try {
    refund = await razorpay.payments.refund(payment.providerPaymentId, {
      amount: amountToRefund,
      receipt: requestId,
      notes: {
        reason: reason || 'Customer requested refund',
        requestId,
      },
    });
  } catch {
    await Payment.updateOne(
      { _id: payment._id, refundRequestId: requestId },
      { $set: { refundRequestStatus: 'UNKNOWN' } },
    );
    console.error('Razorpay refund outcome is unknown; refund reservation retained for reconciliation.');
    throw PAYMENT_ERRORS.REFUND_FAILED;
  }

  if (
    !refund.id ||
    refund.payment_id !== payment.providerPaymentId ||
    refund.amount !== amountToRefund
  ) {
    await Payment.updateOne(
      { _id: payment._id, refundRequestId: requestId },
      {
        $set: {
          refundRequestStatus: 'UNKNOWN',
          ...(refund.id ? { refundProviderId: refund.id } : {}),
        },
      },
    );
    throw PAYMENT_ERRORS.REFUND_FAILED;
  }

  if (refund.status === 'failed') {
    await Payment.updateOne(
      { _id: payment._id, refundRequestId: requestId },
      {
        $set: {
          refundRequestId: null,
          refundRequestAmount: null,
          refundProviderId: null,
          refundRequestStatus: null,
        },
      },
    );
    throw PAYMENT_ERRORS.REFUND_FAILED;
  }

  if (refund.status !== 'pending' && refund.status !== 'processed') {
    await Payment.updateOne(
      { _id: payment._id, refundRequestId: requestId },
      { $set: { refundRequestStatus: 'UNKNOWN', refundProviderId: refund.id } },
    );
    throw PAYMENT_ERRORS.REFUND_FAILED;
  }

  let updatedPayment = refund.status === 'processed'
    ? await finalizeReservedRefund(payment._id, requestId, refund.id, amountToRefund)
    : await Payment.findOneAndUpdate(
      { _id: payment._id, refundRequestId: requestId },
      {
        $set: {
          refundProviderId: refund.id,
          refundRequestStatus: 'PENDING',
        },
      },
      { new: true },
    ) as IPayment | null;

  if (!updatedPayment) {
    updatedPayment = await Payment.findOne({
      _id: payment._id,
      processedRefundIds: refund.id,
    }) as IPayment | null;
  }
  if (!updatedPayment) {
    throw PAYMENT_ERRORS.REFUND_FAILED;
  }

  if (refund.status === 'processed') {
    await syncRefundStatusToBooking(updatedPayment);
    if (updatedPayment.status === PAYMENT_STATUS.REFUNDED && updatedPayment.booking) {
      await runNotificationSafely('payment-refunded', () =>
        notifyPaymentRefunded(updatedPayment!.booking!.toString()),
      );
    }
    await recordAuditEvent({
      actor,
      action: 'PAYMENT_REFUNDED',
      entityType: 'Payment',
      entityId: updatedPayment._id.toString(),
      metadata: { amount: amountToRefund, reason: reason || 'Customer requested refund' },
    });
  }

  return updatedPayment;
}

async function finalizeReservedRefund(
  paymentId: unknown,
  requestId: string,
  refundId: string,
  amount: number,
): Promise<IPayment | null> {
  const payment = await Payment.findOneAndUpdate(
    {
      _id: paymentId,
      refundRequestId: requestId,
      refundRequestAmount: amount,
      processedRefundIds: { $ne: refundId },
      $expr: {
        $lte: [
          { $add: [{ $ifNull: ['$refundAmount', 0] }, amount] },
          '$amount',
        ],
      },
    },
    {
      $inc: { refundAmount: amount },
      $addToSet: { processedRefundIds: refundId },
      $set: {
        refundRequestId: null,
        refundRequestAmount: null,
        refundProviderId: null,
        refundRequestStatus: null,
      },
    },
    { new: true },
  ) as IPayment | null;

  if (!payment) {
    return await Payment.findOne({
      _id: paymentId,
      processedRefundIds: refundId,
    }) as IPayment | null;
  }

  return updateConfirmedRefundStatus(payment._id);
}

async function updateConfirmedRefundStatus(
  paymentId: IPayment['_id'],
): Promise<IPayment | null> {
  await Payment.updateOne(
    {
      _id: paymentId,
      $expr: {
        $gte: [{ $ifNull: ['$refundAmount', 0] }, '$amount'],
      },
    },
    { $set: { status: PAYMENT_STATUS.REFUNDED } },
  );
  await Payment.updateOne(
    {
      _id: paymentId,
      status: { $in: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_REFUNDED] },
      $expr: {
        $lt: [{ $ifNull: ['$refundAmount', 0] }, '$amount'],
      },
    },
    { $set: { status: PAYMENT_STATUS.PARTIALLY_REFUNDED } },
  );
  return await Payment.findById(paymentId) as IPayment | null;
}

async function recordRefundReconciliation(
  paymentId: unknown,
  reason: string,
): Promise<void> {
  await Payment.updateOne(
    { _id: paymentId },
    {
      $set: {
        'metadata.reconciliationRequired': true,
        'metadata.reconciliationReason': reason,
        'metadata.reconciliationAt': new Date(),
      },
    },
  );
}

/**
 * Handle webhook payment event
 * Updates payment status based on Razorpay events
 */
const WEBHOOK_PROCESSING_LEASE_MS = 15 * 60 * 1000;

async function claimWebhookEvent(
  eventId: string,
  event: string,
): Promise<string | null> {
  const claimToken = randomUUID();
  const now = new Date();
  try {
    await WebhookEvent.create({
      eventId,
      event,
      status: 'PROCESSING',
      attempts: 1,
      claimToken,
      leaseExpiresAt: new Date(now.getTime() + WEBHOOK_PROCESSING_LEASE_MS),
    });
    return claimToken;
  } catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) {
      throw error;
    }
  }

  const reclaimed = await WebhookEvent.findOneAndUpdate(
    {
      eventId,
      $or: [
        { status: 'FAILED' },
        { status: 'PROCESSING', leaseExpiresAt: { $lte: now } },
        { status: 'PROCESSING', leaseExpiresAt: null },
      ],
    },
    {
      $set: {
        event,
        status: 'PROCESSING',
        claimToken,
        leaseExpiresAt: new Date(now.getTime() + WEBHOOK_PROCESSING_LEASE_MS),
        lastError: null,
        processedAt: null,
      },
      $inc: { attempts: 1 },
    },
    { new: true },
  );

  return reclaimed ? claimToken : null;
}

async function finishWebhookEvent(
  eventId: string,
  claimToken: string,
  status: 'PROCESSED' | 'FAILED',
): Promise<boolean> {
  const result = await WebhookEvent.updateOne(
    { eventId, claimToken, status: 'PROCESSING' },
    {
      $set: {
        status,
        ...(status === 'PROCESSED' ? { processedAt: new Date(), lastError: null } : {
          lastError: 'Webhook processing failed',
        }),
      },
      $unset: { claimToken: 1, leaseExpiresAt: 1 },
    },
  );
  return result.modifiedCount === 1;
}

export async function handleWebhookEvent(
  event: string,
  data: Record<string, unknown>,
  eventId: string,
): Promise<'PROCESSED' | 'BUSY'> {
  await connectDB();

  const claimToken = await claimWebhookEvent(eventId, event);
  if (!claimToken) {
    const existingEvent = await WebhookEvent.findOne({ eventId }).select('status').lean();
    return existingEvent?.status === 'PROCESSED' ? 'PROCESSED' : 'BUSY';
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
          !Number.isSafeInteger(amount) ||
          typeof currency !== 'string' ||
          !isProviderPaymentCaptured(paymentData)
        ) {
          throw PAYMENT_ERRORS.INVALID_PAYMENT;
        }

        const session = await mongoose.startSession();
        let bookingConfirmed = false;
        let shouldNotifyBooking = false;
        let bookingId: string | null = null;
        try {
          await session.withTransaction(async () => {
            const storedPayment = await Payment.findOne({ providerOrderId: orderId }).session(session);
            if (!storedPayment) throw PAYMENT_ERRORS.PAYMENT_NOT_FOUND;

            if (!isProviderPaymentMatching(
              { order_id: orderId, amount, currency },
              { orderId, amount: storedPayment.amount, currency: storedPayment.currency },
            )) {
              await Payment.updateOne(
                { _id: storedPayment._id },
                {
                  $set: {
                    'metadata.reconciliationRequired': true,
                    'metadata.reconciliationReason': 'PROVIDER_AMOUNT_OR_CURRENCY_MISMATCH',
                    'metadata.providerCapturedPaymentId': paymentId,
                    'metadata.reconciliationAt': new Date(),
                  },
                },
                { session },
              );
              return;
            }
            if (
              storedPayment.status === PAYMENT_STATUS.PAID &&
              storedPayment.providerPaymentId !== paymentId
            ) {
              await Payment.updateOne(
                { _id: storedPayment._id },
                {
                  $set: {
                    'metadata.reconciliationRequired': true,
                    'metadata.reconciliationReason': 'MULTIPLE_CAPTURED_PAYMENTS',
                    'metadata.additionalCapturedPaymentId': paymentId,
                    'metadata.reconciliationAt': new Date(),
                  },
                },
                { session },
              );
              return;
            }

            let booking = null;
            let canConfirmBooking = false;
            let bookingAlreadyConfirmed = false;
            let reconciliationReason: string | null = null;
            if (storedPayment.booking) {
              booking = await Booking.findById(storedPayment.booking).session(session);
              bookingId = storedPayment.booking.toString();
              if (!booking) {
                reconciliationReason = 'BOOKING_MISSING';
              } else if (await isFeature22Booking(booking, session)) {
                reconciliationReason = 'DEMO_RECORD_PAYMENT';
              } else if (
                booking.totalAmount !== storedPayment.amount ||
                storedPayment.currency !== 'INR'
              ) {
                reconciliationReason = 'BOOKING_AMOUNT_OR_CURRENCY_MISMATCH';
              } else {
                canConfirmBooking = isBookingEligibleForCapturedPayment(
                  booking.status,
                  booking.paymentStatus,
                  booking.holdExpiresAt,
                  booking.totalAmount === storedPayment.amount &&
                    storedPayment.currency === 'INR',
                );
                bookingAlreadyConfirmed =
                  booking.status === BOOKING_STATUS.CONFIRMED &&
                  booking.paymentStatus === PAYMENT_STATUS.PAID;
                if (!canConfirmBooking && !bookingAlreadyConfirmed) {
                  reconciliationReason = 'BOOKING_NOT_ELIGIBLE';
                }
              }
            }

            const payment = await Payment.findOneAndUpdate(
              {
                _id: storedPayment._id,
                $or: [
                  {
                    status: {
                      $in: [
                        PAYMENT_STATUS.PENDING,
                        PAYMENT_STATUS.AUTHORIZED,
                        PAYMENT_STATUS.FAILED,
                      ],
                    },
                    $or: [
                      { providerPaymentId: null },
                      { providerPaymentId: { $exists: false } },
                      { providerPaymentId: paymentId },
                    ],
                  },
                  { status: PAYMENT_STATUS.PAID, providerPaymentId: paymentId },
                ],
              },
              {
                $set: {
                  providerPaymentId: paymentId,
                  status: PAYMENT_STATUS.PAID,
                  paidAt: storedPayment.paidAt || new Date(),
                  ...(reconciliationReason
                    ? {
                      'metadata.reconciliationRequired': true,
                      'metadata.reconciliationReason': reconciliationReason,
                      'metadata.reconciliationAt': new Date(),
                    }
                    : {}),
                },
                $unset: { activeBookingKey: 1 },
              },
              { new: true, session },
            );
            if (!payment) throw PAYMENT_ERRORS.INVALID_PAYMENT;

            if (canConfirmBooking && booking) {
              const bookingUpdate = await Booking.updateOne(
                {
                  _id: booking._id,
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
              bookingConfirmed = bookingUpdate.modifiedCount === 1;
              shouldNotifyBooking = bookingConfirmed;
              if (!bookingConfirmed) {
                await Payment.updateOne(
                  { _id: payment._id },
                  {
                    $set: {
                      'metadata.reconciliationRequired': true,
                      'metadata.reconciliationReason': 'BOOKING_CONFIRMATION_RACE',
                      'metadata.reconciliationAt': new Date(),
                    },
                  },
                  { session },
                );
              }
            } else {
              bookingConfirmed = bookingAlreadyConfirmed;
            }
          });
        } finally {
          await session.endSession();
        }

        if (shouldNotifyBooking && bookingId) {
          try {
            await notifyBookingConfirmed(bookingId);
            await notifyPaymentSuccess(bookingId);
          } catch {
            console.error('Payment confirmation notification failed.');
          }
        }
        break;
      }

      case 'payment.failed': {
        const paymentData = data.payment as Record<string, unknown> | undefined;
        if (
          !paymentData ||
          typeof paymentData.id !== 'string' ||
          typeof paymentData.order_id !== 'string' ||
          paymentData.status !== 'failed'
        ) {
          throw PAYMENT_ERRORS.INVALID_PAYMENT;
        }
        await Payment.updateOne(
          {
            providerOrderId: paymentData.order_id,
            status: { $in: PAYMENT_FAILURE_SOURCE_STATUSES },
            $or: [
              { providerPaymentId: null },
              { providerPaymentId: { $exists: false } },
              { providerPaymentId: paymentData.id },
            ],
          },
          {
            $set: { status: PAYMENT_STATUS.FAILED },
            $unset: { activeBookingKey: 1 },
          },
        );
        break;
      }

      case 'refund.created': {
        const refundData = data.refund as Record<string, unknown> | undefined;
        const paymentId = refundData?.payment_id;
        const refundId = refundData?.id;
        const amount = refundData?.amount;
        if (
          typeof paymentId !== 'string' ||
          typeof refundId !== 'string' ||
          typeof amount !== 'number' ||
          !Number.isSafeInteger(amount) ||
          amount <= 0 ||
          refundData?.status !== 'pending'
        ) {
          throw PAYMENT_ERRORS.INVALID_PAYMENT;
        }

        const payment = await Payment.findOne({ providerPaymentId: paymentId });
        if (!payment) throw PAYMENT_ERRORS.PAYMENT_NOT_FOUND;
        if (payment.processedRefundIds.includes(refundId)) break;
        if (
          payment.refundRequestId &&
          payment.refundRequestAmount === amount &&
          (!payment.refundProviderId || payment.refundProviderId === refundId)
        ) {
          await Payment.updateOne(
            { _id: payment._id, refundRequestId: payment.refundRequestId },
            {
              $set: {
                refundProviderId: refundId,
                refundRequestStatus: 'PENDING',
              },
            },
          );
        } else {
          const externalReservation = await Payment.findOneAndUpdate(
            {
              _id: payment._id,
              refundRequestId: null,
              status: { $in: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_REFUNDED] },
              $expr: {
                $lte: [
                  { $add: [{ $ifNull: ['$refundAmount', 0] }, amount] },
                  '$amount',
                ],
              },
            },
            {
              $set: {
                refundRequestId: `provider-${refundId}`,
                refundRequestAmount: amount,
                refundProviderId: refundId,
                refundRequestStatus: 'PENDING',
              },
            },
            { new: true },
          );
          await recordRefundReconciliation(
            payment._id,
            externalReservation ? 'UNMATCHED_PROVIDER_REFUND' : 'UNMATCHED_PROVIDER_REFUND_CONFLICT',
          );
        }
        break;
      }

      case 'refund.processed': {
        const refundData = data.refund as Record<string, unknown> | undefined;
        const paymentId = refundData?.payment_id;
        const refundId = refundData?.id;
        const amount = refundData?.amount;
        if (
          typeof paymentId !== 'string' ||
          typeof refundId !== 'string' ||
          typeof amount !== 'number' ||
          !Number.isSafeInteger(amount) ||
          amount <= 0 ||
          refundData?.status !== 'processed'
        ) {
          throw PAYMENT_ERRORS.INVALID_PAYMENT;
        }

        const payment = await Payment.findOne({ providerPaymentId: paymentId });
        if (!payment) throw PAYMENT_ERRORS.PAYMENT_NOT_FOUND;
        if (payment.processedRefundIds.includes(refundId)) break;

        let updatedPayment: IPayment | null = null;
        if (
          payment.refundRequestId &&
          payment.refundRequestAmount === amount &&
          (!payment.refundProviderId || payment.refundProviderId === refundId)
        ) {
          updatedPayment = await finalizeReservedRefund(
            payment._id,
            payment.refundRequestId,
            refundId,
            amount,
          );
        } else {
          updatedPayment = await Payment.findOneAndUpdate(
            {
              _id: payment._id,
              processedRefundIds: { $ne: refundId },
              status: { $in: [PAYMENT_STATUS.PAID, PAYMENT_STATUS.PARTIALLY_REFUNDED] },
              $expr: {
                $lte: [
                  {
                    $add: [
                      { $ifNull: ['$refundAmount', 0] },
                      { $ifNull: ['$refundRequestAmount', 0] },
                      amount,
                    ],
                  },
                  '$amount',
                ],
              },
            },
            {
              $inc: { refundAmount: amount },
              $addToSet: { processedRefundIds: refundId },
            },
            { new: true },
          ) as IPayment | null;
          if (updatedPayment) {
            updatedPayment = await updateConfirmedRefundStatus(updatedPayment._id);
            if (!updatedPayment) throw PAYMENT_ERRORS.PAYMENT_NOT_FOUND;
            await recordRefundReconciliation(updatedPayment._id, 'UNMATCHED_PROCESSED_REFUND');
          }
        }
        if (!updatedPayment) {
          const concurrentDuplicate = await Payment.findOne({
            _id: payment._id,
            processedRefundIds: refundId,
          });
          if (concurrentDuplicate) break;
          await recordRefundReconciliation(payment._id, 'REFUND_AMOUNT_EXCEEDS_REMAINING_BALANCE');
          break;
        }
        await syncRefundStatusToBooking(updatedPayment);
        if (updatedPayment.status === PAYMENT_STATUS.REFUNDED && updatedPayment.booking) {
          await runNotificationSafely('webhook-payment-refunded', () =>
            notifyPaymentRefunded(updatedPayment!.booking!.toString()),
          );
        }
        break;
      }

      default:
        break;
    }

    const finished = await finishWebhookEvent(eventId, claimToken, 'PROCESSED');
    return finished ? 'PROCESSED' : 'BUSY';
  } catch (error) {
    await finishWebhookEvent(eventId, claimToken, 'FAILED');
    throw error;
  }
}
