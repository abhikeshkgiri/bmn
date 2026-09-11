import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { generateOtp, hashOtp, verifyOtpHash } from '@/services/auth.service';
import { calculateEndTime, isTimeOverlap } from '@/utils/booking';
import { rateLimiter } from '@/lib/rate-limit';
import { verifyPaymentSignature, verifyWebhookSignature } from '@/lib/razorpay';
import Booking from '@/models/Booking';
import WebhookEvent from '@/models/WebhookEvent';

function testOtpValidation(): void {
  const otp = generateOtp();
  assert.equal(otp.length, 6);
  assert.equal(verifyOtpHash(otp, hashOtp(otp)), true);
  assert.equal(verifyOtpHash('000000', hashOtp(otp)), false);
}

function testAvailabilityRules(): void {
  assert.equal(calculateEndTime('09:30', 45), '10:15');
  assert.equal(isTimeOverlap('09:00', '10:00', '09:30', '10:30'), true);
  assert.equal(isTimeOverlap('09:00', '10:00', '10:00', '10:30'), false);
}

function testRateLimits(): void {
  rateLimiter.clear();
  assert.equal(rateLimiter.isAllowed('phase20', 2, 60_000), true);
  assert.equal(rateLimiter.isAllowed('phase20', 2, 60_000), true);
  assert.equal(rateLimiter.isAllowed('phase20', 2, 60_000), false);
  rateLimiter.clear();
}

function testSignatures(): void {
  process.env.RAZORPAY_KEY_SECRET = 'payment-secret';
  process.env.RAZORPAY_WEBHOOK_SECRET = 'webhook-secret';
  const paymentSignature = crypto.createHmac('sha256', 'payment-secret').update('order|payment').digest('hex');
  const webhookSignature = crypto.createHmac('sha256', 'webhook-secret').update('{"event":"payment.captured"}').digest('hex');
  assert.equal(verifyPaymentSignature('order', 'payment', paymentSignature), true);
  assert.equal(verifyPaymentSignature('order', 'payment', 'invalid'), false);
  assert.equal(verifyWebhookSignature('{"event":"payment.captured"}', webhookSignature), true);
}

function testCriticalIndexes(): void {
  const bookingIndexes = Booking.schema.indexes().map(([fields]) => Object.keys(fields).join(','));
  assert.equal(bookingIndexes.some((index) => index.includes('holdExpiresAt')), true);
  assert.equal(WebhookEvent.schema.path('eventId').options.unique, true);
}

testOtpValidation();
testAvailabilityRules();
testRateLimits();
testSignatures();
testCriticalIndexes();
console.log('Phase 20 critical tests passed');
