import { z } from 'zod';
import {
  BOOKING_STATUS_ARRAY,
  BOOKING_TYPE_ARRAY,
  PAYMENT_STATUS_ARRAY,
  PAYMENT_METHOD_ARRAY,
  PAYMENT_PROVIDER_ARRAY,
  PAYMENT_CURRENCY_ARRAY,
} from '@/constants/booking';

/**
 * MongoDB ObjectId validation (24 hex characters)
 */
const mongoIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format');

/**
 * Time format validation (HH:MM)
 */
const timeFormatSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Time must be in HH:MM format (24-hour)');

// ============================================
// PHASE 8: BOOKING CREATION SCHEMA
// ============================================

/**
 * Booking creation schema for customers
 * Minimal input - server calculates everything else
 */
export const BookingCreateSchema = z
  .object({
    salonId: mongoIdSchema,
    barberId: mongoIdSchema,
    serviceId: mongoIdSchema,
    appointmentDate: z
      .string()
      .refine(
        (date) => {
          const d = new Date(date);
          return d instanceof Date && !isNaN(d.getTime());
        },
        'Invalid date format'
      ),
    startTime: timeFormatSchema,
    bookingType: z.enum(BOOKING_TYPE_ARRAY as [string, ...string[]]),
    customerNotes: z.string().max(500, 'Notes must be 500 characters or less').optional(),
    couponCode: z.string().trim().min(3).max(50).optional(),
    loyaltyPoints: z.number().int().min(0).optional(),
  })
  .strict();

export type BookingCreateInput = z.infer<typeof BookingCreateSchema>;

/**
 * Booking update schema (for admin/salon staff status updates)
 */
export const BookingUpdateSchema = z.object({
  status: z.enum(BOOKING_STATUS_ARRAY as [string, ...string[]]).optional(),
  paymentStatus: z.enum(PAYMENT_STATUS_ARRAY as [string, ...string[]]).optional(),
  customerNotes: z.string().optional(),
  cancellationReason: z.string().optional(),
});

export type BookingUpdateInput = z.infer<typeof BookingUpdateSchema>;

/**
 * Booking cancellation schema
 */
export const BookingCancelSchema = z.object({
  cancellationReason: z.string().max(200, 'Reason must be 200 characters or less').optional(),
});

export type BookingCancelInput = z.infer<typeof BookingCancelSchema>;

/**
 * Booking reschedule schema
 * Customer reschedules their appointment
 */
export const BookingRescheduleSchema = z
  .object({
    appointmentDate: z
      .string()
      .refine(
        (date) => {
          const d = new Date(date);
          return d instanceof Date && !isNaN(d.getTime());
        },
        'Invalid date format'
      ),
    startTime: timeFormatSchema,
  })
  .strict();

export type BookingRescheduleInput = z.infer<typeof BookingRescheduleSchema>;

/**
 * Booking status update schema
 */
export const BookingStatusUpdateSchema = z.object({
  status: z.enum(BOOKING_STATUS_ARRAY as [string, ...string[]]),
});

export type BookingStatusUpdateInput = z.infer<typeof BookingStatusUpdateSchema>;

/**
 * Availability query schema
 */
export const AvailabilityQuerySchema = z.object({
  salonId: mongoIdSchema,
  barberId: mongoIdSchema,
  serviceId: mongoIdSchema,
  date: z
    .string()
    .refine(
      (date) => {
        const d = new Date(date);
        return d instanceof Date && !isNaN(d.getTime());
      },
      'Invalid date format'
    ),
});

export type AvailabilityQueryInput = z.infer<typeof AvailabilityQuerySchema>;

/**
 * Booking list query schema
 */
export const BookingListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(BOOKING_STATUS_ARRAY as [string, ...string[]]).optional(),
  paymentStatus: z.enum(PAYMENT_STATUS_ARRAY as [string, ...string[]]).optional(),
  sortBy: z.enum(['appointmentDate', 'createdAt']).default('appointmentDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type BookingListQueryInput = z.infer<typeof BookingListQuerySchema>;

/**
 * Pagination data type
 */
export const PaginationSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export type PaginationData = z.infer<typeof PaginationSchema>;

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
