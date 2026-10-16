/**
 * Booking-related constants
 */

export const BOOKING_STATUS = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const;

export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export const BOOKING_STATUS_ARRAY = Object.values(BOOKING_STATUS);

export const BOOKING_TYPE = {
  SALON: 'SALON',
  HOME_SERVICE: 'HOME_SERVICE',
} as const;

export type BookingType = (typeof BOOKING_TYPE)[keyof typeof BOOKING_TYPE];

export const BOOKING_TYPE_ARRAY = Object.values(BOOKING_TYPE);

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  AUTHORIZED: 'AUTHORIZED',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
} as const;

export type PaymentStatus = (typeof PAYMENT_STATUS)[keyof typeof PAYMENT_STATUS];

export const PAYMENT_STATUS_ARRAY = Object.values(PAYMENT_STATUS);

export const PAYMENT_METHOD = {
  ONLINE: 'ONLINE',
  UPI: 'UPI',
  CARD: 'CARD',
  NET_BANKING: 'NET_BANKING',
  CASH: 'CASH',
} as const;

export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

export const PAYMENT_METHOD_ARRAY = Object.values(PAYMENT_METHOD);

export const PAYMENT_PROVIDER = {
  RAZORPAY: 'RAZORPAY',
} as const;

export type PaymentProvider = (typeof PAYMENT_PROVIDER)[keyof typeof PAYMENT_PROVIDER];

export const PAYMENT_PROVIDER_ARRAY = Object.values(PAYMENT_PROVIDER);

export const PAYMENT_CURRENCY = {
  INR: 'INR',
} as const;

export type PaymentCurrency = (typeof PAYMENT_CURRENCY)[keyof typeof PAYMENT_CURRENCY];

export const PAYMENT_CURRENCY_ARRAY = Object.values(PAYMENT_CURRENCY);
