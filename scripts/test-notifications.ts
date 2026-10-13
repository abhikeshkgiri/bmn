import assert from 'node:assert/strict';
import { BOOKING_STATUS } from '../src/constants/booking';
import {
  getBookingNotificationEventKey,
  getCustomerNotificationChannel,
  isAppointmentReminderEligible,
} from '../src/utils/notification';

const appointmentDate = new Date('2030-06-15T00:00:00');
const now = new Date('2030-06-15T12:00:00');

assert.equal(
  getBookingNotificationEventKey('booking-1', 'confirmed'),
  'booking:booking-1:confirmed',
);
assert.equal(
  getBookingNotificationEventKey('booking-1', 'rescheduled', '2030-06-15T10:00'),
  'booking:booking-1:rescheduled:2030-06-15T10:00',
);
assert.equal(
  isAppointmentReminderEligible(BOOKING_STATUS.CONFIRMED, appointmentDate, '13:00', now),
  true,
);
assert.equal(
  isAppointmentReminderEligible(BOOKING_STATUS.CANCELLED, appointmentDate, '13:00', now),
  false,
);
assert.equal(
  isAppointmentReminderEligible(BOOKING_STATUS.PENDING, appointmentDate, '13:00', now),
  false,
);
assert.equal(
  isAppointmentReminderEligible(BOOKING_STATUS.CONFIRMED, appointmentDate, '11:00', now),
  false,
);
assert.equal(
  isAppointmentReminderEligible(BOOKING_STATUS.CONFIRMED, appointmentDate, '25:00', now),
  false,
);
assert.equal(
  isAppointmentReminderEligible(BOOKING_STATUS.CONFIRMED, new Date(Number.NaN), '13:00', now),
  false,
);
assert.equal(getCustomerNotificationChannel(false, true), 'PUSH');
assert.equal(getCustomerNotificationChannel(false, false), null);
assert.equal(getCustomerNotificationChannel(undefined, undefined), 'IN_APP');

console.log('Notification eligibility tests passed.');
