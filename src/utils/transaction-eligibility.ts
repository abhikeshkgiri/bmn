export const FEATURE22_DEMO_KEY_PREFIX = 'feature22:';

export function isFeature22DemoRecord(...demoKeys: Array<string | null | undefined>): boolean {
  return demoKeys.some((demoKey) => demoKey?.startsWith(FEATURE22_DEMO_KEY_PREFIX) ?? false);
}

export function canConfirmPaidBooking(input: {
  bookingStatus: string;
  bookingPaymentStatus: string;
  paymentStatus: string;
  providerPaymentId: string | null | undefined;
  bookingAmount: number;
  paymentAmount: number;
  currency: string;
  holdExpiresAt: Date | null | undefined;
}, now = new Date()): boolean {
  return input.bookingStatus === 'PENDING' &&
    input.bookingPaymentStatus === 'PAID' &&
    input.paymentStatus === 'PAID' &&
    typeof input.providerPaymentId === 'string' &&
    input.providerPaymentId.trim().length > 0 &&
    Number.isSafeInteger(input.bookingAmount) &&
    input.bookingAmount > 0 &&
    input.paymentAmount === input.bookingAmount &&
    input.currency === 'INR' &&
    input.holdExpiresAt instanceof Date &&
    Number.isFinite(input.holdExpiresAt.getTime()) &&
    input.holdExpiresAt > now;
}
