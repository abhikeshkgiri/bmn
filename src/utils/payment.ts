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
): boolean {
  return Number.isSafeInteger(refundAmount) &&
    refundAmount > 0 &&
    refundedAmount + refundAmount <= paymentAmount;
}
