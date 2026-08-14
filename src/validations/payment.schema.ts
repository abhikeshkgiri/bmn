/**
 * Payment validation schemas
 * Zod schemas for all payment API inputs
 */

import { z } from 'zod';

// MongoDB ObjectID validation
const mongoIdSchema = z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid MongoDB ID');

/**
 * Schema for creating a Razorpay payment order
 * POST /api/payments/create-order
 */
export const CreatePaymentOrderSchema = z.object({
  bookingId: mongoIdSchema,
});

export type CreatePaymentOrderInput = z.infer<typeof CreatePaymentOrderSchema>;

/**
 * Schema for verifying Razorpay payment
 * POST /api/payments/verify
 */
export const VerifyPaymentSchema = z.object({
  bookingId: mongoIdSchema,
  razorpay_order_id: z.string().min(1, 'Order ID required'),
  razorpay_payment_id: z.string().min(1, 'Payment ID required'),
  razorpay_signature: z.string().min(1, 'Signature required'),
});

export type VerifyPaymentInput = z.infer<typeof VerifyPaymentSchema>;

/**
 * Schema for payment failure
 * POST /api/payments/failure
 */
export const PaymentFailureSchema = z.object({
  bookingId: mongoIdSchema,
  razorpay_order_id: z.string().min(1, 'Order ID required'),
  error_code: z.string().optional(),
  error_description: z.string().optional(),
});

export type PaymentFailureInput = z.infer<typeof PaymentFailureSchema>;

/**
 * Schema for refund request
 * POST /api/payments/refund
 */
export const RefundSchema = z.object({
  paymentId: mongoIdSchema,
  amount: z.number().int().min(1, 'Amount must be at least 1 paise'),
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional(),
});

export type RefundInput = z.infer<typeof RefundSchema>;

/**
 * Schema for getting payment details by booking ID
 * GET /api/payments/booking/[bookingId]
 */
export const PaymentDetailsQuerySchema = z.object({
  bookingId: mongoIdSchema,
});

export type PaymentDetailsQuery = z.infer<typeof PaymentDetailsQuerySchema>;
