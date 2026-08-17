/**
 * Payment Service Layer
 * Core business logic for payment operations
 * All server-side validation and authorization happens here
 */

import Payment, { type IPayment } from '@/models/Payment';
import Booking, { type IBooking } from '@/models/Booking';
import { connectDB } from '@/lib/db';
import { getRazorpayClient, verifyPaymentSignature } from '@/lib/razorpay';
import type { AuthUser } from '@/types';
import { PAYMENT_STATUS, PAYMENT_METHOD, PAYMENT_PROVIDER, BOOKING_STATUS } from '@/constants/booking';
import {
  notifyPaymentFailed,
  notifyPaymentSuccess,
} from '@/services/notification.service';

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

  // Verify booking is not cancelled
  if (booking.status === BOOKING_STATUS.CANCELLED) {
    throw PAYMENT_ERRORS.BOOKING_CANCELLED;
  }

  // Check if payment already completed
  const existingPayment = await Payment.findOne({
    booking: bookingId,
    status: PAYMENT_STATUS.PAID,
  });

  if (existingPayment) {
    throw PAYMENT_ERRORS.PAYMENT_ALREADY_COMPLETED;
  }

  // Get or create payment record
  let payment = await Payment.findOne({
    booking: bookingId,
    status: { $in: [PAYMENT_STATUS.PENDING, PAYMENT_STATUS.AUTHORIZED] },
  });

  // Create Razorpay order
  const razorpay = getRazorpayClient();
  let razorpayOrder;

  try {
    razorpayOrder = await razorpay.orders.create({
      amount: booking.totalAmount, // Already in paise
      currency: 'INR',
      receipt: `booking_${bookingId}`,
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
  if (!payment) {
    payment = new Payment({
      booking: bookingId,
      customer: currentUser._id,
      amount: booking.totalAmount,
      currency: 'INR',
      method: PAYMENT_METHOD.CARD,
      provider: PAYMENT_PROVIDER.RAZORPAY,
      providerOrderId: razorpayOrder.id,
      status: PAYMENT_STATUS.PENDING,
    });
  } else {
    // Update existing payment with new order
    payment.providerOrderId = razorpayOrder.id;
    payment.status = PAYMENT_STATUS.PENDING;
  }

  await payment.save();

  return {
    orderId: razorpayOrder.id,
    amount: booking.totalAmount,
    currency: 'INR',
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
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

  // Fetch payment record
  const payment = (await Payment.findOne({
    booking: bookingId,
    providerOrderId: orderId,
  })) as IPayment | null;

  if (!payment) {
    throw PAYMENT_ERRORS.PAYMENT_NOT_FOUND;
  }

  // Idempotency: if already paid, return existing payment
  if (payment.status === PAYMENT_STATUS.PAID) {
    return payment;
  }

  // Verify Razorpay signature
  const isSignatureValid = verifyPaymentSignature(orderId, paymentId, signature);
  if (!isSignatureValid) {
    // Mark payment as failed
    payment.status = PAYMENT_STATUS.FAILED;
    await payment.save();
    throw PAYMENT_ERRORS.INVALID_SIGNATURE;
  }

  // Verify amount matches
  if (payment.amount !== booking.totalAmount) {
    throw PAYMENT_ERRORS.AMOUNT_MISMATCH;
  }

  // Update payment record
  payment.providerPaymentId = paymentId;
  payment.providerSignature = signature;
  payment.status = PAYMENT_STATUS.PAID;
  await payment.save();

  // Update booking status to CONFIRMED and paymentStatus to PAID
  await Booking.updateOne(
    { _id: bookingId },
    {
      paymentStatus: PAYMENT_STATUS.PAID,
      status: BOOKING_STATUS.CONFIRMED,
    }
  );

  await notifyPaymentSuccess(bookingId);

  return payment;
}

/**
 * Record payment failure
 */
export async function recordPaymentFailure(
  bookingId: string,
  orderId: string,
  errorCode?: string,
  errorDescription?: string
): Promise<void> {
  await connectDB();

  // Find payment by order ID
  const payment = await Payment.findOne({
    booking: bookingId,
    providerOrderId: orderId,
  });

  if (payment) {
    payment.status = PAYMENT_STATUS.FAILED;
    if (errorCode || errorDescription) {
      payment.metadata = {
        ...(payment.metadata || {}),
        errorCode,
        errorDescription,
      };
    }
    await payment.save();
    await notifyPaymentFailed(bookingId, errorDescription || 'Payment failed');
  }
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
  })) as IPayment | null;

  return payment;
}

/**
 * Get payment by ID
 * Verifies customer ownership or admin/owner access
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

  // Check authorization
  if (currentUser.role === 'CUSTOMER') {
    if (!payment.booking || (payment.booking as { customer?: { toString: () => string } }).customer?.toString() !== currentUser._id) {
      throw PAYMENT_ERRORS.FORBIDDEN;
    }
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
  reason?: string
): Promise<IPayment> {
  await connectDB();

  const payment = (await Payment.findById(paymentId)) as IPayment | null;

  if (!payment) {
    throw PAYMENT_ERRORS.PAYMENT_NOT_FOUND;
  }

  // Verify payment is PAID
  if (payment.status !== PAYMENT_STATUS.PAID) {
    throw PAYMENT_ERRORS.INVALID_PAYMENT;
  }

  // Use full amount if not specified
  const amountToRefund = refundAmount || payment.amount;

  // Verify refund amount does not exceed payment amount
  const totalRefunded = (payment.refundAmount || 0) + amountToRefund;
  if (totalRefunded > payment.amount) {
    throw PAYMENT_ERRORS.PAYMENT_FAILED;
  }

  // Process refund via Razorpay
  const razorpay = getRazorpayClient();

  try {
    await razorpay.payments.refund(payment.providerPaymentId || '', {
      amount: amountToRefund,
      notes: {
        reason: reason || 'Customer requested refund',
      },
    });
  } catch (error) {
    console.error('Razorpay refund failed:', error);
    throw PAYMENT_ERRORS.REFUND_FAILED;
  }

  // Update payment record
  payment.refundAmount = (payment.refundAmount || 0) + amountToRefund;

  // Update status based on refund amount
  if (payment.refundAmount >= payment.amount) {
    payment.status = PAYMENT_STATUS.REFUNDED;
  } else {
    payment.status = PAYMENT_STATUS.PARTIALLY_REFUNDED;
  }

  await payment.save();

  return payment;
}

/**
 * Handle webhook payment event
 * Updates payment status based on Razorpay events
 */
export async function handleWebhookEvent(
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  await connectDB();

  switch (event) {
    case 'payment.captured': {
      // Payment captured successfully
      const paymentData = data.payment as Record<string, string> | undefined;
      const paymentId = paymentData?.id;
      const orderId = paymentData?.order_id;

      if (paymentId && orderId) {
        await Payment.updateOne(
          { providerOrderId: orderId },
          {
            providerPaymentId: paymentId,
            status: PAYMENT_STATUS.PAID,
          }
        );
      }
      break;
    }

    case 'payment.failed': {
      // Payment failed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orderId = (data.payment as any)?.order_id;

      if (orderId) {
        await Payment.updateOne(
          { providerOrderId: orderId },
          {
            status: PAYMENT_STATUS.FAILED,
            metadata: data.payment,
          }
        );
      }
      break;
    }

    case 'refund.created': {
      // Refund initiated
      const refundData = data.refund as Record<string, string | number> | undefined;
      const paymentId = refundData?.payment_id as string | undefined;
      const refundAmount = refundData?.amount as number | undefined;

      if (paymentId && refundAmount) {
        await Payment.updateOne(
          { providerPaymentId: paymentId },
          {
            $set: {
              refundAmount: refundAmount,
              status: PAYMENT_STATUS.PARTIALLY_REFUNDED,
            },
          }
        );
      }
      break;
    }

    case 'refund.processed': {
      // Refund completed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paymentId = (data.refund as any)?.payment_id;

      if (paymentId) {
        const payment = (await Payment.findOne({
          providerPaymentId: paymentId,
        })) as IPayment | null;

        if (payment) {
          if ((payment.refundAmount || 0) >= payment.amount) {
            payment.status = PAYMENT_STATUS.REFUNDED;
          }
          await payment.save();
        }
      }
      break;
    }
  }
}
