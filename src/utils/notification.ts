import { BOOKING_STATUS, type BookingStatus } from '@/constants/booking';

export type AppointmentReminderType = '24H' | '2H' | 'TODAY';

export function getCustomerNotificationChannel(
  inAppPreference: boolean | undefined,
  pushPreference: boolean | undefined,
): 'IN_APP' | 'PUSH' | null {
  if (inAppPreference !== false) return 'IN_APP';
  if (pushPreference !== false) return 'PUSH';
  return null;
}

export function getBookingNotificationEventKey(
  bookingId: string,
  eventType: string,
  discriminator?: string,
): string {
  return `booking:${bookingId}:${eventType}${discriminator ? `:${discriminator}` : ''}`;
}

export function isAppointmentReminderEligible(
  status: BookingStatus,
  appointmentDate: Date,
  startTime: string,
  now = new Date(),
): boolean {
  if (status !== BOOKING_STATUS.CONFIRMED || !Number.isFinite(appointmentDate.getTime())) {
    return false;
  }

  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(startTime);
  if (!match) return false;

  const appointmentAt = new Date(appointmentDate);
  appointmentAt.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return appointmentAt.getTime() > now.getTime();
}
