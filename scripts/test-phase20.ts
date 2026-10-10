import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { generateOtp, hashOtp, verifyOtpHash } from '@/services/auth.service';
import { calculateEndTime, isTimeOverlap } from '@/utils/booking';
import { rateLimiter } from '@/lib/rate-limit';
import { verifyPaymentSignature, verifyWebhookSignature } from '@/lib/razorpay';
import Booking from '@/models/Booking';
import OtpVerification from '@/models/OtpVerification';
import Salon from '@/models/Salon';
import User from '@/models/User';
import WebhookEvent from '@/models/WebhookEvent';
import { AUTH_ERRORS, OTP_CONFIG } from '@/constants/auth';
import { verifyOtpAndGetUser } from '@/services/auth.service';

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

async function testOtpAttemptAndConsumptionAreAtomic(): Promise<void> {
  const db = require('../src/lib/db') as { connectDB: () => Promise<unknown> };
  const devAuthStore = require('../src/lib/dev-auth-store') as Record<string, unknown>;
  const otpModel = OtpVerification as unknown as Record<string, unknown>;
  const userModel = User as unknown as Record<string, unknown>;
  const originals: Array<() => void> = [];

  function stub(target: Record<string, unknown>, key: string, replacement: unknown): void {
    const original = target[key];
    target[key] = replacement;
    originals.push(() => {
      target[key] = original;
    });
  }

  try {
    stub(db as unknown as Record<string, unknown>, 'connectDB', async () => undefined);
    stub(devAuthStore, 'shouldUseDevAuthFallback', () => false);
    const record = {
      _id: 'otp-record',
      expiresAt: new Date(Date.now() + 60_000),
      attempts: 0,
      verified: false,
      otpHash: hashOtp('123456'),
      signupRole: 'CUSTOMER',
    };
    stub(otpModel, 'findOne', () => ({ select: async () => record }));

    let wrongAttemptFilter: Record<string, unknown> | undefined;
    let wrongAttemptUpdate: Record<string, unknown> | undefined;
    let userLookupCount = 0;
    stub(otpModel, 'updateOne', async (filter: Record<string, unknown>, update: Record<string, unknown>) => {
      if ('$inc' in update) {
        wrongAttemptFilter = filter;
        wrongAttemptUpdate = update;
      }
      return { modifiedCount: 1 };
    });
    stub(userModel, 'findOne', async () => {
      userLookupCount += 1;
      return {
        _id: { toString: () => 'user-id' },
        name: 'Customer',
        phone: '+911234567890',
        role: 'CUSTOMER',
        isActive: true,
        isVerified: true,
      };
    });

    await assert.rejects(
      verifyOtpAndGetUser('+911234567890', '000000'),
      new RegExp(AUTH_ERRORS.OTP_INVALID),
    );
    assert.ok(wrongAttemptFilter);
    assert.deepEqual(wrongAttemptFilter.attempts, { $lt: OTP_CONFIG.MAX_ATTEMPTS });
    assert.deepEqual(wrongAttemptUpdate, { $inc: { attempts: 1 } });
    assert.equal(userLookupCount, 0);

    let consumeFilter: Record<string, unknown> | undefined;
    let consumeUpdate: Record<string, unknown> | undefined;
    stub(otpModel, 'updateOne', async (filter: Record<string, unknown>, update: Record<string, unknown>) => {
      consumeFilter = filter;
      consumeUpdate = update;
      return { modifiedCount: 1 };
    });
    const result = await verifyOtpAndGetUser('+911234567890', '123456');
    assert.equal(result.user.role, 'CUSTOMER');
    assert.ok(consumeFilter);
    assert.equal(consumeFilter.verified, false);
    assert.ok((consumeFilter.expiresAt as { $gt: Date }).$gt instanceof Date);
    assert.deepEqual(consumeFilter.attempts, { $lt: OTP_CONFIG.MAX_ATTEMPTS });
    assert.deepEqual(consumeUpdate, { $set: { verified: true } });

    stub(otpModel, 'updateOne', async () => ({ modifiedCount: 0 }));
    await assert.rejects(
      verifyOtpAndGetUser('+911234567890', '123456'),
      new RegExp(AUTH_ERRORS.OTP_INVALID),
    );
  } finally {
    for (const restore of originals.reverse()) restore();
  }
}

async function testBookingRoleBoundaries(): Promise<void> {
  const db = require('../src/lib/db') as { connectDB: () => Promise<unknown> };
  const bookingModel = Booking as unknown as Record<string, unknown>;
  const salonModel = Salon as unknown as Record<string, unknown>;
  const originals: Array<() => void> = [];

  function stub(target: Record<string, unknown>, key: string, replacement: unknown): void {
    const original = target[key];
    target[key] = replacement;
    originals.push(() => {
      target[key] = original;
    });
  }

  try {
    stub(db as unknown as Record<string, unknown>, 'connectDB', async () => undefined);
    let bookingLookupCount = 0;
    stub(bookingModel, 'findById', () => {
      bookingLookupCount += 1;
      throw new Error('Unauthorized role must not load booking data.');
    });

    const bookingService = require('../src/services/booking.service') as {
      getBookingById: (id: string, user: { _id: string; role: string }) => Promise<unknown>;
      getSalonDashboardStats: (id: string, user: { _id: string; role: string }) => Promise<unknown>;
    };
    await assert.rejects(
      bookingService.getBookingById('booking-id', { _id: 'staff-id', role: 'SALON_STAFF' }),
      (error: unknown) => typeof error === 'object' && error !== null && 'code' in error && error.code === 'UNAUTHORIZED',
    );
    assert.equal(bookingLookupCount, 0);

    stub(salonModel, 'findById', async () => ({ owner: { toString: () => 'another-owner' } }));
    await assert.rejects(
      bookingService.getSalonDashboardStats('salon-id', { _id: 'owner-id', role: 'SALON_OWNER' }),
      (error: unknown) => typeof error === 'object' && error !== null && 'code' in error && error.code === 'UNAUTHORIZED',
    );
  } finally {
    for (const restore of originals.reverse()) restore();
  }
}

testOtpValidation();
testAvailabilityRules();
testRateLimits();
testSignatures();
testCriticalIndexes();
testOtpAttemptAndConsumptionAreAtomic()
  .then(() => testBookingRoleBoundaries())
  .then(() => console.log('Phase 20 critical tests passed'))
  .catch((error) => {
    console.error('Phase 20 critical tests failed:', error);
    process.exitCode = 1;
  });
