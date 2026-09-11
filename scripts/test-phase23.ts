import assert from 'node:assert/strict';
import { HomeServiceStatus } from '@/models/Booking';
import { hashOtp, verifyOtpHash } from '@/services/auth.service';
import { calculateHomeServiceDistanceKm, isValidHomeServiceTransition } from '@/services/home-service.service';

const otpHash = hashOtp('123456');
assert.notEqual(otpHash, '123456');
assert.equal(verifyOtpHash('123456', otpHash), true);
assert.equal(verifyOtpHash('000000', otpHash), false);

assert.equal(calculateHomeServiceDistanceKm({ latitude: 28.6139, longitude: 77.209 }, { latitude: 28.6139, longitude: 77.209 }), 0);
assert.ok(calculateHomeServiceDistanceKm({ latitude: 28.6139, longitude: 77.209 }, { latitude: 28.7041, longitude: 77.1025 }) > 10);
assert.equal(isValidHomeServiceTransition(HomeServiceStatus.REQUESTED, HomeServiceStatus.ACCEPTED), true);
assert.equal(isValidHomeServiceTransition(HomeServiceStatus.REQUESTED, HomeServiceStatus.SERVICE_COMPLETED), false);
assert.equal(isValidHomeServiceTransition(HomeServiceStatus.SERVICE_STARTED, HomeServiceStatus.SERVICE_COMPLETED), true);

console.log('Phase 23 critical tests passed');
