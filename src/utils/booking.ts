/**
 * Booking utilities
 * Reusable functions for booking operations: time validation, slot generation, overlap detection, etc.
 */

import { DEFAULT_SLOT_INTERVAL_MINUTES, DEFAULT_OPENING_TIME, DEFAULT_CLOSING_TIME } from '@/constants/booking-config';

/**
 * Validate time format (HH:MM)
 * Returns true if valid, false otherwise
 */
export function isValidTimeFormat(time: string): boolean {
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(time);
}

/**
 * Convert time string (HH:MM) to minutes since midnight
 */
export function timeToMinutes(time: string): number {
  if (!isValidTimeFormat(time)) {
    throw new Error(`Invalid time format: ${time}. Expected HH:MM`);
  }
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Convert minutes since midnight to time string (HH:MM)
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Calculate end time given start time and duration in minutes
 */
export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = startMinutes + durationMinutes;
  return minutesToTime(endMinutes);
}

/**
 * Check if two time intervals overlap
 * Overlap occurs when:
 * existing.startTime < requestedEndTime AND existing.endTime > requestedStartTime
 */
export function isTimeOverlap(
  existingStart: string,
  existingEnd: string,
  requestedStart: string,
  requestedEnd: string
): boolean {
  const existingStartMin = timeToMinutes(existingStart);
  const existingEndMin = timeToMinutes(existingEnd);
  const requestedStartMin = timeToMinutes(requestedStart);
  const requestedEndMin = timeToMinutes(requestedEnd);

  return existingStartMin < requestedEndMin && existingEndMin > requestedStartMin;
}

/**
 * Generate available time slots for a given date
 * Returns array of slots with startTime, endTime, and available flag
 * 
 * Parameters:
 * - openingTime: salon opening time (HH:MM)
 * - closingTime: salon closing time (HH:MM)
 * - serviceDuration: service duration in minutes
 * - existingBookings: array of { startTime, endTime } for the day
 * 
 * Returns array of slots that may or may not be available
 */
export function generateTimeSlots(
  openingTime: string = DEFAULT_OPENING_TIME,
  closingTime: string = DEFAULT_CLOSING_TIME,
  serviceDuration: number = 30,
  existingBookings: Array<{ startTime: string; endTime: string }> = []
): Array<{
  startTime: string;
  endTime: string;
  available: boolean;
}> {
  if (!isValidTimeFormat(openingTime) || !isValidTimeFormat(closingTime)) {
    throw new Error('Invalid opening or closing time format');
  }

  const openingMinutes = timeToMinutes(openingTime);
  const closingMinutes = timeToMinutes(closingTime);

  if (serviceDuration <= 0 || serviceDuration > 480) {
    throw new Error('Service duration must be between 1 and 480 minutes');
  }

  const slots: Array<{
    startTime: string;
    endTime: string;
    available: boolean;
  }> = [];

  // Generate all possible slots
  for (let currentMinutes = openingMinutes; currentMinutes + serviceDuration <= closingMinutes; currentMinutes += DEFAULT_SLOT_INTERVAL_MINUTES) {
    const slotStartTime = minutesToTime(currentMinutes);
    const slotEndTime = minutesToTime(currentMinutes + serviceDuration);

    // Check if this slot overlaps with any existing booking
    const isAvailable = !existingBookings.some((booking) => isTimeOverlap(booking.startTime, booking.endTime, slotStartTime, slotEndTime));

    slots.push({
      startTime: slotStartTime,
      endTime: slotEndTime,
      available: isAvailable,
    });
  }

  return slots;
}

/**
 * Check if a date is valid for booking
 * Returns true if date is valid, false if past or invalid
 */
export function isDateBookable(appointmentDate: Date | string, minDaysAhead: number = 0, maxDaysAhead: number = 30): boolean {
  const date = typeof appointmentDate === 'string' ? new Date(appointmentDate) : appointmentDate;

  // Reset time to midnight for fair date comparison
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bookingDate = new Date(date);
  bookingDate.setHours(0, 0, 0, 0);

  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() + minDaysAhead);

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + maxDaysAhead);

  return bookingDate >= minDate && bookingDate <= maxDate;
}

/**
 * Generate a unique booking number
 * Format: BMN-YYYY-XXXXXX
 * Example: BMN-2026-000001
 */
export function generateBookingNumberFormat(year: number = new Date().getFullYear(), sequence: number): string {
  const paddedSequence = String(sequence).padStart(6, '0');
  return `BMN-${year}-${paddedSequence}`;
}

/**
 * Validate that appointment date is not in the past
 * Accounts for the start time as well
 */
export function isAppointmentInPast(appointmentDate: Date | string, startTime: string): boolean {
  const date = typeof appointmentDate === 'string' ? new Date(appointmentDate) : appointmentDate;
  
  // Parse start time
  if (!isValidTimeFormat(startTime)) {
    throw new Error('Invalid time format');
  }

  const [hours, minutes] = startTime.split(':').map(Number);
  const appointmentDateTime = new Date(date);
  appointmentDateTime.setHours(hours, minutes, 0, 0);

  return appointmentDateTime <= new Date();
}

/**
 * Validate that start time is before end time
 */
export function isValidTimeRange(startTime: string, endTime: string): boolean {
  if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
    return false;
  }

  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);

  return startMinutes < endMinutes;
}

/**
 * Get the day of week from a date
 * Returns: 'monday', 'tuesday', etc.
 */
export function getDayOfWeek(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[d.getDay()];
}
