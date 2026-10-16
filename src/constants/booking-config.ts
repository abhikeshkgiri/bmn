/**
 * Booking configuration constants
 * Centralized rules for booking system behavior
 */

// How many minutes before appointment start can customer cancel
export const BOOKING_CANCELLATION_MINUTES = 60;

// How many days in the future can bookings be made
export const BOOKING_MAX_DAYS_AHEAD = 30;

// Minimum days in future to allow booking (must be at least this many days away)
export const BOOKING_MIN_DAYS_AHEAD = 0; // Allow same-day bookings

// Default slot interval in minutes (slots are generated at this interval)
export const DEFAULT_SLOT_INTERVAL_MINUTES = 30;

// Default working hours for salons if none specified
export const DEFAULT_OPENING_TIME = '09:00';
export const DEFAULT_CLOSING_TIME = '18:00';

// Break times (if needed in future)
// export const DEFAULT_BREAK_TIMES = [];
