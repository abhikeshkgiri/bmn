import assert from 'node:assert/strict';
import { BOOKING_STATUS, BOOKING_TYPE } from '../src/constants/booking';
import {
  isBookingStatusTransitionAllowed,
  isTimeOverlap,
  isWithinOpeningHours,
  parseLocalCalendarDate,
} from '../src/utils/booking';
import { buildAvailabilitySlots } from '../src/utils/booking-availability';
import {
  BookingStatusUpdateSchema,
  BookingCreateSchema,
  BookingListQuerySchema,
  BookingRescheduleSchema,
} from '../src/validations/booking.schema';
import { canConfirmPaidBooking, isFeature22DemoRecord } from '../src/utils/transaction-eligibility';

const validBooking = {
  salonId: '64b000000000000000000001',
  barberId: '64b000000000000000000002',
  serviceId: '64b000000000000000000003',
  appointmentDate: '2026-10-11',
  startTime: '09:30',
  bookingType: BOOKING_TYPE.SALON,
};

assert.equal(BookingCreateSchema.safeParse(validBooking).success, true);
assert.equal(
  BookingCreateSchema.safeParse({ ...validBooking, bookingType: BOOKING_TYPE.HOME_SERVICE }).success,
  false,
);
assert.equal(BookingCreateSchema.safeParse({ ...validBooking, appointmentDate: '2026-02-30' }).success, false);
assert.equal(BookingCreateSchema.safeParse({ ...validBooking, appointmentDate: '2026-10-11T00:00:00Z' }).success, false);
assert.equal(BookingCreateSchema.safeParse({ ...validBooking, startTime: '24:00' }).success, false);
assert.equal(BookingCreateSchema.safeParse({ ...validBooking, price: 1 }).success, false);
assert.equal(BookingStatusUpdateSchema.safeParse({ status: BOOKING_STATUS.CONFIRMED }).success, true);
assert.equal(BookingStatusUpdateSchema.safeParse({
  status: BOOKING_STATUS.CONFIRMED,
  paymentStatus: 'PAID',
  amount: 1,
}).success, false);
assert.deepEqual(BookingListQuerySchema.parse({
  page: undefined,
  limit: undefined,
  status: undefined,
  paymentStatus: undefined,
  sortBy: undefined,
  sortOrder: undefined,
}), {
  page: 1,
  limit: 10,
  status: undefined,
  paymentStatus: undefined,
  sortBy: 'appointmentDate',
  sortOrder: 'desc',
});
assert.equal(BookingListQuerySchema.safeParse({ page: 10001 }).success, false);
assert.equal(BookingRescheduleSchema.safeParse({ appointmentDate: '2026-10-11', startTime: '09:30' }).success, true);
assert.equal(BookingRescheduleSchema.safeParse({ appointmentDate: '2026-02-30', startTime: '09:30' }).success, false);

assert.equal(parseLocalCalendarDate('2026-10-11')?.getDate(), 11);
assert.equal(parseLocalCalendarDate('2026-02-30'), null);
assert.equal(parseLocalCalendarDate('2026/10/11'), null);

assert.equal(isWithinOpeningHours(true, '09:00', '18:00', '09:30', 60, 30), true);
assert.equal(isWithinOpeningHours(false, '09:00', '18:00', '09:30', 60, 30), false);
assert.equal(isWithinOpeningHours(true, '09:00', '18:00', '17:30', 60, 30), false);
assert.equal(isWithinOpeningHours(true, '09:00', '18:00', '09:15', 30, 30), false);
assert.equal(isTimeOverlap('09:00', '09:30', '09:30', '10:00'), false);
assert.equal(isTimeOverlap('09:00', '09:45', '09:30', '10:00'), true);

assert.equal(isBookingStatusTransitionAllowed(BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED), true);
assert.equal(isBookingStatusTransitionAllowed(BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED), false);
assert.equal(isBookingStatusTransitionAllowed(BOOKING_STATUS.CANCELLED, BOOKING_STATUS.CONFIRMED), false);

const paidConfirmation = {
  bookingStatus: BOOKING_STATUS.PENDING,
  bookingPaymentStatus: 'PAID',
  paymentStatus: 'PAID',
  providerPaymentId: 'pay_verified',
  bookingAmount: 12500,
  paymentAmount: 12500,
  currency: 'INR',
};
assert.equal(canConfirmPaidBooking({
  ...paidConfirmation,
  holdExpiresAt: new Date(2000),
}, new Date(1000)), true);
assert.equal(canConfirmPaidBooking({
  ...paidConfirmation,
  bookingPaymentStatus: 'PENDING',
  holdExpiresAt: new Date(2000),
}, new Date(1000)), false);
assert.equal(canConfirmPaidBooking({
  ...paidConfirmation,
  holdExpiresAt: new Date(1000),
}, new Date(1000)), false);
assert.equal(canConfirmPaidBooking({
  ...paidConfirmation,
  holdExpiresAt: null,
}, new Date(1000)), false);
assert.equal(canConfirmPaidBooking({
  ...paidConfirmation,
  providerPaymentId: undefined,
  holdExpiresAt: new Date(2000),
}, new Date(1000)), false);
assert.equal(canConfirmPaidBooking({
  ...paidConfirmation,
  paymentAmount: 12499,
  holdExpiresAt: new Date(2000),
}, new Date(1000)), false);
assert.equal(canConfirmPaidBooking({
  ...paidConfirmation,
  currency: 'USD',
  holdExpiresAt: new Date(2000),
}, new Date(1000)), false);

for (const marker of ['feature22:salon:demo', 'feature22:barber:demo', 'feature22:service:demo']) {
  assert.equal(isFeature22DemoRecord(marker), true);
}
assert.equal(isFeature22DemoRecord('ordinary-record-key'), false);

const sameDay = new Date(2026, 9, 11);
const slots = buildAvailabilitySlots({
  isOpen: true,
  openingTime: '09:00',
  closingTime: '10:00',
  serviceDuration: 30,
  salonCapacity: 2,
  slotIntervalMinutes: 30,
  bookings: [],
  barberUnavailable: false,
  appointmentDate: sameDay,
  now: new Date(2026, 9, 11, 9, 20),
});
assert.deepEqual(slots.map(({ startTime, available }) => [startTime, available]), [
  ['09:00', false],
  ['09:30', true],
]);

console.log('Booking validation and schedule tests passed.');
