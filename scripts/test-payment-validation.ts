import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  verifyPaymentSignatureWithSecret,
  verifyWebhookSignatureWithSecret,
} from '../src/lib/razorpay';
import {
  canTransitionPaymentToFailed,
  isBookingEligibleForCapturedPayment,
  isRefundPending,
  isWebhookLeaseExpired,
  isProviderPaymentCaptured,
  isProviderPaymentMatching,
  isRefundWithinBalance,
} from '../src/utils/payment';
import {
  CreatePaymentOrderSchema,
  PaymentFailureSchema,
  VerifyPaymentSchema,
} from '../src/validations/payment.schema';
import Payment from '../src/models/Payment';
import WebhookEvent from '../src/models/WebhookEvent';
import { isFeature22DemoRecord } from '../src/utils/transaction-eligibility';

const orderId = 'order_abc123';
const paymentId = 'pay_xyz789';
const secret = 'unit-test-only-secret';
const signatureFor = (data: string) =>
  crypto.createHmac('sha256', secret).update(data).digest('hex');
const paymentSignature = signatureFor(`${orderId}|${paymentId}`);
const webhookBody = '{"event":"payment.captured"}';
const webhookSignature = signatureFor(webhookBody);

assert.equal(verifyPaymentSignatureWithSecret(orderId, paymentId, paymentSignature, secret), true);
assert.equal(verifyPaymentSignatureWithSecret(orderId, paymentId, paymentSignature, 'wrong-secret'), false);
assert.equal(verifyPaymentSignatureWithSecret(orderId, paymentId, 'bad-signature', secret), false);
assert.equal(verifyWebhookSignatureWithSecret(webhookBody, webhookSignature, secret), true);
assert.equal(verifyWebhookSignatureWithSecret(webhookBody, webhookSignature.toUpperCase(), secret), true);
assert.equal(verifyWebhookSignatureWithSecret(webhookBody, '0'.repeat(64), secret), false);

assert.equal(VerifyPaymentSchema.safeParse({
  bookingId: '64b000000000000000000001',
  razorpay_order_id: orderId,
  razorpay_payment_id: paymentId,
  razorpay_signature: paymentSignature,
}).success, true);
assert.equal(VerifyPaymentSchema.safeParse({
  bookingId: '64b000000000000000000001',
  razorpay_order_id: orderId,
  razorpay_payment_id: paymentId,
  razorpay_signature: 'not-a-signature',
}).success, false);
assert.equal(PaymentFailureSchema.safeParse({
  bookingId: '64b000000000000000000001',
  razorpay_order_id: orderId,
  error_description: 'x'.repeat(501),
}).success, false);
assert.equal(CreatePaymentOrderSchema.safeParse({
  bookingId: '64b000000000000000000001',
  amount: 1,
}).success, false);
assert.equal(PaymentFailureSchema.safeParse({
  bookingId: '64b000000000000000000001',
  razorpay_order_id: orderId,
  paymentStatus: 'PAID',
}).success, false);

const expectedPayment = { orderId, amount: 12500, currency: 'INR' };
assert.equal(isProviderPaymentMatching({
  order_id: orderId,
  amount: 12500,
  currency: 'INR',
}, expectedPayment), true);
assert.equal(isProviderPaymentMatching({
  order_id: orderId,
  amount: 12501,
  currency: 'INR',
}, expectedPayment), false);
assert.equal(isProviderPaymentMatching({
  order_id: orderId,
  amount: 12500,
  currency: 'USD',
}, expectedPayment), false);
assert.equal(isProviderPaymentCaptured({ status: 'captured', captured: true }), true);
assert.equal(isProviderPaymentCaptured({ status: 'authorized', captured: false }), false);

assert.equal(isRefundWithinBalance(300, 200, 500), true);
assert.equal(isRefundWithinBalance(301, 200, 500), false);
assert.equal(isRefundWithinBalance(0, 0, 500), false);
assert.equal(isRefundWithinBalance(1.5, 0, 500), false);
assert.equal(isRefundWithinBalance(100, 300, 500, 100), true);
assert.equal(isRefundWithinBalance(101, 300, 500, 100), false);
assert.equal(isBookingEligibleForCapturedPayment(
  'PENDING',
  'PENDING',
  new Date(2000),
  true,
  new Date(1000),
), true);
assert.equal(isBookingEligibleForCapturedPayment(
  'PENDING',
  'PENDING',
  new Date(1000),
  true,
  new Date(1000),
), false);
assert.equal(isBookingEligibleForCapturedPayment(
  'CANCELLED',
  'PENDING',
  new Date(2000),
  true,
  new Date(1000),
), false);
assert.equal(isBookingEligibleForCapturedPayment(
  'PENDING',
  'PENDING',
  new Date(2000),
  false,
  new Date(1000),
), false);
assert.equal(canTransitionPaymentToFailed('PENDING'), true);
assert.equal(canTransitionPaymentToFailed('AUTHORIZED'), true);
assert.equal(canTransitionPaymentToFailed('PAID'), false);
assert.equal(isWebhookLeaseExpired(new Date(1000), new Date(1000)), true);
assert.equal(isWebhookLeaseExpired(new Date(1001), new Date(1000)), false);
assert.equal(isWebhookLeaseExpired(null, new Date(1000)), true);
assert.equal(isFeature22DemoRecord('feature22:salon:demo'), true);
assert.equal(isFeature22DemoRecord('feature22:barber:demo'), true);
assert.equal(isFeature22DemoRecord('feature22:service:demo'), true);
assert.equal(isFeature22DemoRecord('salon:ordinary', 'barber:ordinary', 'service:ordinary'), false);
assert.equal(isRefundPending('REQUESTED'), true);
assert.equal(isRefundPending('UNKNOWN'), true);
assert.equal(isRefundPending(null), false);
assert.equal(Payment.schema.indexes().some(([keys, options]) =>
  'activeBookingKey' in keys && options?.unique === true && options?.sparse === true,
), true);
assert.equal(WebhookEvent.schema.path('eventId').options.unique, true);
assert.equal(WebhookEvent.schema.path('leaseExpiresAt') != null, true);

console.log('Payment validation and provider-integrity tests passed.');
