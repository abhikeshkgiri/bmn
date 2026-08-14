import { z } from 'zod';
import {
  BOOKING_STATUS_ARRAY,
  BOOKING_TYPE_ARRAY,
  PAYMENT_STATUS_ARRAY,
  PAYMENT_METHOD_ARRAY,
  PAYMENT_PROVIDER_ARRAY,
  PAYMENT_CURRENCY_ARRAY,
} from '@/constants/booking';

// Booking schemas
export const BookingCreateSchema = z.object({
  appointmentDate: z.string().datetime(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  duration: z.number().min(15).max(480),
  bookingType: z.enum(BOOKING_TYPE_ARRAY as [string, ...string[]]),
  customerNotes: z.string().optional(),
});

export const BookingUpdateSchema = z.object({
  status: z.enum(BOOKING_STATUS_ARRAY as [string, ...string[]]).optional(),
  paymentStatus: z.enum(PAYMENT_STATUS_ARRAY as [string, ...string[]]).optional(),
  customerNotes: z.string().optional(),
  cancellationReason: z.string().optional(),
});

export type BookingCreateInput = z.infer<typeof BookingCreateSchema>;
export type BookingUpdateInput = z.infer<typeof BookingUpdateSchema>;

// Payment schemas
export const PaymentCreateSchema = z.object({
  amount: z.number().min(1),
  currency: z.enum(PAYMENT_CURRENCY_ARRAY as [string, ...string[]]).default('INR'),
  method: z.enum(PAYMENT_METHOD_ARRAY as [string, ...string[]]),
  provider: z.enum(PAYMENT_PROVIDER_ARRAY as [string, ...string[]]).default('RAZORPAY'),
  providerOrderId: z.string(),
});

export const PaymentUpdateSchema = z.object({
  status: z.enum(PAYMENT_STATUS_ARRAY as [string, ...string[]]).optional(),
  providerPaymentId: z.string().optional(),
  providerSignature: z.string().optional(),
  refundAmount: z.number().min(0).optional(),
});

export type PaymentCreateInput = z.infer<typeof PaymentCreateSchema>;
export type PaymentUpdateInput = z.infer<typeof PaymentUpdateSchema>;
