import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  verifyPaymentSignatureWithSecret,
  verifyWebhookSignatureWithSecret,
} from '../src/lib/razorpay';
import {
  isProviderPaymentCaptured,
  isProviderPaymentMatching,
  isRefundWithinBalance,
} from '../src/utils/payment';
import {
  PaymentFailureSchema,
  VerifyPaymentSchema,
} from '../src/validations/payment.schema';

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

console.log('Payment validation and provider-integrity tests passed.');
