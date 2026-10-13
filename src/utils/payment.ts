interface ProviderPaymentSnapshot {
  order_id?: unknown;
  amount?: unknown;
  currency?: unknown;
  status?: unknown;
  captured?: unknown;
}

export function isProviderPaymentMatching(
  payment: ProviderPaymentSnapshot,
  expected: { orderId: string; amount: number; currency: string },
): boolean {
  return payment.order_id === expected.orderId &&
    payment.amount === expected.amount &&
    payment.currency === expected.currency;
}

export function isProviderPaymentCaptured(payment: ProviderPaymentSnapshot): boolean {
  return payment.status === 'captured' && payment.captured === true;
}

export function isRefundWithinBalance(
  refundAmount: number,
  refundedAmount: number,
  paymentAmount: number,
  reservedAmount = 0,
): boolean {
  return Number.isSafeInteger(refundAmount) &&
    refundAmount > 0 &&
    Number.isSafeInteger(refundedAmount) &&
    refundedAmount >= 0 &&
    Number.isSafeInteger(paymentAmount) &&
    paymentAmount > 0 &&
    Number.isSafeInteger(reservedAmount) &&
    reservedAmount >= 0 &&
    refundedAmount + reservedAmount + refundAmount <= paymentAmount;
}

export function canTransitionPaymentToFailed(status: string): boolean {
  return status === 'PENDING' || status === 'AUTHORIZED';
}

export function isWebhookLeaseExpired(
  leaseExpiresAt: Date | null | undefined,
  now = new Date(),
): boolean {
  return leaseExpiresAt == null || leaseExpiresAt <= now;
}

export function isRefundPending(status: string | null | undefined): boolean {
  return status === 'REQUESTED' || status === 'PENDING' || status === 'UNKNOWN';
}

export function isBookingEligibleForCapturedPayment(
  bookingStatus: string,
  paymentStatus: string,
  holdExpiresAt: Date | null | undefined,
  amountMatches: boolean,
  now = new Date(),
): boolean {
  return bookingStatus === 'PENDING' &&
    paymentStatus !== 'PAID' &&
    holdExpiresAt != null &&
    holdExpiresAt > now &&
    amountMatches;
}
