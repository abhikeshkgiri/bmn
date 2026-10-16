import assert from 'node:assert/strict';
import { Types } from 'mongoose';
import { BOOKING_STATUS } from '@/constants/booking';
import {
  activeBookingFilter,
  createExpiredBookingHoldFilter,
  isBookingHoldExpired,
  unexpiredPendingBookingFilter,
} from '@/utils/booking';
import { buildAvailabilitySlots } from '@/utils/booking-availability';

const baseAvailability = {
  isOpen: true,
  openingTime: '09:00',
  closingTime: '10:00',
  serviceDuration: 30,
  salonCapacity: 2,
  slotIntervalMinutes: 30,
  bookings: [],
  barberUnavailable: false,
};

const defaultSlots = buildAvailabilitySlots(baseAvailability);
assert.deepEqual(
  defaultSlots.map(({ startTime, endTime }) => [startTime, endTime]),
  [['09:00', '09:30'], ['09:30', '10:00']],
);
assert.equal(buildAvailabilitySlots({ ...baseAvailability, isOpen: false }).length, 0);

const longServiceSlots = buildAvailabilitySlots({
  ...baseAvailability,
  closingTime: '10:15',
  serviceDuration: 45,
});
assert.deepEqual(
  longServiceSlots.map(({ startTime, endTime }) => [startTime, endTime]),
  [['09:00', '09:45'], ['09:30', '10:15']],
);

const leaveSlots = buildAvailabilitySlots({ ...baseAvailability, barberUnavailable: true });
assert.equal(leaveSlots.every((slot) => !slot.available), true);
assert.equal(leaveSlots.every((slot) => slot.remaining === baseAvailability.salonCapacity), true);

const fullCapacitySlots = buildAvailabilitySlots({
  ...baseAvailability,
  bookings: [
    { startTime: '09:00', endTime: '09:30' },
    { startTime: '09:00', endTime: '09:30' },
  ],
});
assert.equal(fullCapacitySlots[0].available, false);
assert.equal(fullCapacitySlots[0].remaining, 0);
assert.equal(fullCapacitySlots[1].available, true);

const testSalonId = new Types.ObjectId();
const unrelatedSalonId = new Types.ObjectId();
const now = new Date('2026-10-09T12:00:00.000Z');
const expiredHoldFilter = createExpiredBookingHoldFilter(testSalonId, now);
assert.equal(expiredHoldFilter.salon, testSalonId);
assert.notEqual(expiredHoldFilter.salon, unrelatedSalonId);
assert.equal(expiredHoldFilter.status, BOOKING_STATUS.PENDING);
assert.equal(expiredHoldFilter.holdExpiresAt.$lte, now);

const testHolds = [
  { id: 'test-expired', salon: testSalonId, status: BOOKING_STATUS.PENDING, holdExpiresAt: new Date(now.getTime() - 1) },
  { id: 'other-salon-expired', salon: unrelatedSalonId, status: BOOKING_STATUS.PENDING, holdExpiresAt: new Date(now.getTime() - 1) },
  { id: 'test-salon-confirmed', salon: testSalonId, status: BOOKING_STATUS.CONFIRMED, holdExpiresAt: new Date(now.getTime() - 1) },
  { id: 'test-salon-active', salon: testSalonId, status: BOOKING_STATUS.PENDING, holdExpiresAt: new Date(now.getTime() + 1) },
];
const cleanupCandidates = testHolds.filter((hold) =>
  hold.salon.equals(expiredHoldFilter.salon) &&
  hold.status === expiredHoldFilter.status &&
  hold.holdExpiresAt <= expiredHoldFilter.holdExpiresAt.$lte
);
assert.deepEqual(cleanupCandidates.map((hold) => hold.id), ['test-expired']);

const activeFilter = activeBookingFilter(now);
assert.deepEqual(activeFilter.$or[2], {
  status: BOOKING_STATUS.PENDING,
  holdExpiresAt: { $gt: now },
});
assert.equal(isBookingHoldExpired(new Date(now.getTime() - 1), now), true);
assert.equal(isBookingHoldExpired(now, now), true);
assert.equal(isBookingHoldExpired(new Date(now.getTime() + 1), now), false);
assert.equal(isBookingHoldExpired(undefined, now), false);
assert.deepEqual(unexpiredPendingBookingFilter(now), {
  status: BOOKING_STATUS.PENDING,
  holdExpiresAt: { $gt: now },
});

console.log('Booking availability and expired-hold scope tests passed');
