import assert from 'node:assert/strict';
import { BOOKING_STATUS } from '../src/constants/booking';
import {
  getBookingNotificationEventKey,
  isAppointmentReminderEligible,
} from '../src/utils/notification';

const appointmentDate = new Date();
appointmentDate.setDate(appointmentDate.getDate() + 2);
appointmentDate.setHours(0, 0, 0, 0);
const now = new Date(appointmentDate);
now.setHours(12, 0, 0, 0);

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

console.log('Notification eligibility tests passed.');
