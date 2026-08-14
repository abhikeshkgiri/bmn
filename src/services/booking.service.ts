/**
 * Booking service layer
 * Core business logic for booking operations
 * All server-side validation and authorization happens here
 */

import { Types } from 'mongoose';
import Booking, { type IBooking } from '@/models/Booking';
import Salon, { type ISalon } from '@/models/Salon';
import Barber, { type IBarber } from '@/models/Barber';
import Service, { type IService } from '@/models/Service';
import { connectDB } from '@/lib/db';
import type { AuthUser } from '@/types';
import { BOOKING_STATUS, PAYMENT_STATUS, BOOKING_TYPE } from '@/constants/booking';
import { USER_ROLES } from '@/constants/roles';
import {
  BOOKING_CANCELLATION_MINUTES,
  BOOKING_MAX_DAYS_AHEAD,
  BOOKING_MIN_DAYS_AHEAD,
} from '@/constants/booking-config';
import {
  generateTimeSlots,
  isDateBookable,
  isAppointmentInPast,
  calculateEndTime,
  isTimeOverlap,
  generateBookingNumberFormat,
  isValidTimeRange,
} from '@/utils/booking';

/**
 * Error codes for booking operations
 */
export const BOOKING_ERRORS = {
  INVALID_SALON: { code: 'INVALID_SALON', message: 'Salon not found or inactive' },
  INVALID_BARBER: { code: 'INVALID_BARBER', message: 'Barber not found or inactive' },
  INVALID_SERVICE: { code: 'INVALID_SERVICE', message: 'Service not found or inactive' },
  BARBER_NOT_IN_SALON: { code: 'BARBER_NOT_IN_SALON', message: 'Barber does not belong to this salon' },
  BARBER_DOES_NOT_OFFER_SERVICE: { code: 'BARBER_DOES_NOT_OFFER_SERVICE', message: 'Barber does not offer this service' },
  INVALID_DATE: { code: 'INVALID_DATE', message: 'Appointment date is not bookable' },
  DATE_IN_PAST: { code: 'DATE_IN_PAST', message: 'Appointment date and time are in the past' },
  INVALID_TIME: { code: 'INVALID_TIME', message: 'Invalid appointment time' },
  SLOT_UNAVAILABLE: { code: 'SLOT_UNAVAILABLE', message: 'Selected time slot is not available' },
  OVERLAPPING_BOOKING: { code: 'OVERLAPPING_BOOKING', message: 'Time slot overlaps with an existing booking' },
  HOME_SERVICE_NOT_AVAILABLE: { code: 'HOME_SERVICE_NOT_AVAILABLE', message: 'Barber does not offer home service' },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', message: 'Not authorized to perform this action' },
  BOOKING_NOT_FOUND: { code: 'BOOKING_NOT_FOUND', message: 'Booking not found' },
  CANNOT_CANCEL: { code: 'CANNOT_CANCEL', message: 'Cannot cancel booking within cancellation window' },
  INVALID_STATUS_TRANSITION: { code: 'INVALID_STATUS_TRANSITION', message: 'Invalid status transition' },
} as const;

export type BookingError = (typeof BOOKING_ERRORS)[keyof typeof BOOKING_ERRORS];

interface BookingCreatePayload {
  salonId: string;
  barberId: string;
  serviceId: string;
  appointmentDate: string;
  startTime: string;
  bookingType: string;
  customerNotes?: string;
  currentUser: AuthUser;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

interface AvailabilityResponse {
  date: string;
  serviceDuration: number;
  slots: TimeSlot[];
}

/**
 * Generate next available booking number
 * Format: BMN-YYYY-XXXXXX
 */
async function generateBookingNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const lastBooking = await Booking.findOne()
    .sort({ createdAt: -1 })
    .select('bookingNumber')
    .exec();

  let sequence = 1;

  if (lastBooking && lastBooking.bookingNumber) {
    const parts = lastBooking.bookingNumber.split('-');
    if (parts.length === 3) {
      const lastSequence = parseInt(parts[2], 10);
      if (!isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }
  }

  return generateBookingNumberFormat(year, sequence);
}

/**
 * Validate all booking prerequisites
 * Throws error if validation fails
 */
async function validateBookingRequest(payload: BookingCreatePayload): Promise<{
  salon: ISalon & { _id: Types.ObjectId };
  barber: IBarber & { _id: Types.ObjectId };
  service: IService & { _id: Types.ObjectId };
  appointmentDate: Date;
}> {
  // Validate salon
  const salon = await Salon.findById(payload.salonId).select('+openingHours');
  if (!salon || !salon.isActive) {
    throw BOOKING_ERRORS.INVALID_SALON;
  }

  // Validate barber
  const barber = await Barber.findById(payload.barberId).populate('salon');
  if (!barber || !barber.isActive) {
    throw BOOKING_ERRORS.INVALID_BARBER;
  }

  // Validate barber belongs to salon
  if (barber.salon._id.toString() !== payload.salonId) {
    throw BOOKING_ERRORS.BARBER_NOT_IN_SALON;
  }

  // Validate service
  const service = await Service.findById(payload.serviceId);
  if (!service || !service.isActive) {
    throw BOOKING_ERRORS.INVALID_SERVICE;
  }

  // Validate service belongs to salon
  if (service.salon.toString() !== payload.salonId) {
    throw BOOKING_ERRORS.INVALID_SERVICE;
  }

  // Validate barber offers service
  if (!barber.services.some((s: Types.ObjectId) => s.toString() === payload.serviceId)) {
    throw BOOKING_ERRORS.BARBER_DOES_NOT_OFFER_SERVICE;
  }

  // Validate booking type
  if (payload.bookingType === BOOKING_TYPE.HOME_SERVICE) {
    if (!barber.offersHomeService) {
      throw BOOKING_ERRORS.HOME_SERVICE_NOT_AVAILABLE;
    }
  }

  // Validate time format
  if (!isValidTimeRange(payload.startTime, calculateEndTime(payload.startTime, service.duration))) {
    throw BOOKING_ERRORS.INVALID_TIME;
  }

  // Validate appointment date
  const appointmentDate = new Date(payload.appointmentDate);
  if (!isDateBookable(appointmentDate, BOOKING_MIN_DAYS_AHEAD, BOOKING_MAX_DAYS_AHEAD)) {
    throw BOOKING_ERRORS.INVALID_DATE;
  }

  // Validate date and time are not in past
  if (isAppointmentInPast(appointmentDate, payload.startTime)) {
    throw BOOKING_ERRORS.DATE_IN_PAST;
  }

  return {
    salon,
    barber,
    service,
    appointmentDate,
  };
}

/**
 * Check for overlapping bookings
 */
async function checkOverlappingBookings(
  barberId: string,
  appointmentDate: Date,
  startTime: string,
  endTime: string
): Promise<boolean> {
  const existingBooking = await Booking.findOne({
    barber: new Types.ObjectId(barberId),
    appointmentDate: {
      $gte: new Date(appointmentDate.toDateString()),
      $lt: new Date(new Date(appointmentDate).setDate(appointmentDate.getDate() + 1)),
    },
    startTime: { $exists: true },
    endTime: { $exists: true },
    status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.IN_PROGRESS] },
  });

  if (!existingBooking) {
    return false;
  }

  return isTimeOverlap(existingBooking.startTime, existingBooking.endTime, startTime, endTime);
}

export async function getSalonDashboardStats(salonId: string, currentUser: AuthUser): Promise<{
  salon: ISalon | null;
  stats: {
    todayBookings: number;
    upcomingBookings: number;
    completedBookings: number;
    cancelledBookings: number;
    todayRevenue: number;
    totalBookings: number;
    pendingBookings: number;
  };
  todayAppointments: IBooking[];
  upcomingAppointments: IBooking[];
}> {
  await connectDB();

  const salon = await Salon.findById(salonId);
  if (!salon) {
    throw BOOKING_ERRORS.INVALID_SALON;
  }

  const isOwner = salon.owner.toString() === currentUser._id;
  const isAdmin = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(currentUser.role as typeof USER_ROLES.ADMIN);
  if (currentUser.role !== USER_ROLES.SALON_OWNER && !isAdmin && !isOwner) {
    throw BOOKING_ERRORS.UNAUTHORIZED;
  }

  const allBookings = await Booking.find({ salon: salon._id })
    .populate(['customer', 'barber', 'service'])
    .sort({ appointmentDate: 1, startTime: 1 });

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStart = new Date(today);
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const todayAppointments = allBookings.filter((booking) => {
    const bookingDate = new Date(booking.appointmentDate);
    return bookingDate >= todayStart && bookingDate < todayEnd;
  });

  const upcomingAppointments = allBookings.filter((booking) => {
    const bookingDate = new Date(booking.appointmentDate);
    return bookingDate >= todayEnd && booking.status !== BOOKING_STATUS.CANCELLED;
  });

  const todayRevenue = todayAppointments.reduce((sum, booking) => {
    return booking.paymentStatus === PAYMENT_STATUS.PAID ? sum + (booking.totalAmount || 0) : sum;
  }, 0);

  const stats = {
    todayBookings: todayAppointments.length,
    upcomingBookings: upcomingAppointments.length,
    completedBookings: allBookings.filter((booking) => booking.status === BOOKING_STATUS.COMPLETED).length,
    cancelledBookings: allBookings.filter((booking) => booking.status === BOOKING_STATUS.CANCELLED).length,
    todayRevenue,
    totalBookings: allBookings.length,
    pendingBookings: allBookings.filter((booking) => booking.status === BOOKING_STATUS.PENDING).length,
  };

  return {
    salon,
    stats,
    todayAppointments: todayAppointments.slice(0, 10),
    upcomingAppointments: upcomingAppointments.slice(0, 10),
  };
}

export async function getSalonBookings(
  ownerId: string,
  currentUser: AuthUser,
  options: { page: number; limit: number; status?: string; paymentStatus?: string; barberId?: string }
): Promise<{ bookings: IBooking[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  await connectDB();

  const salon = await Salon.findOne({ owner: new Types.ObjectId(ownerId) });
  if (!salon && currentUser.role !== USER_ROLES.ADMIN && currentUser.role !== USER_ROLES.SUPER_ADMIN) {
    throw BOOKING_ERRORS.UNAUTHORIZED;
  }

  const targetSalonId = salon ? salon._id : undefined;
  const query: Record<string, unknown> = {};

  if (currentUser.role === USER_ROLES.SALON_OWNER) {
    query.salon = salon!._id;
  } else if (currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.SUPER_ADMIN) {
    if (options.barberId) { query.barber = new Types.ObjectId(options.barberId); }
  }

  if (targetSalonId) {
    query.salon = targetSalonId;
  }

  if (options.status) query.status = options.status;
  if (options.paymentStatus) query.paymentStatus = options.paymentStatus;
  if (options.barberId && currentUser.role === USER_ROLES.SALON_OWNER) {
    query.barber = new Types.ObjectId(options.barberId);
  }

  const total = await Booking.countDocuments(query);
  const totalPages = Math.ceil(total / options.limit);

  const bookings = await Booking.find(query)
    .populate(['customer', 'salon', 'barber', 'service'])
    .sort({ appointmentDate: -1, startTime: -1 })
    .skip((options.page - 1) * options.limit)
    .limit(options.limit);

  return {
    bookings,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages,
    },
  };
}

export async function getBarberDashboardStats(barberId: string, currentUser: AuthUser): Promise<{
  barber: IBarber | null;
  stats: {
    todayAppointments: number;
    upcomingAppointments: number;
    completedAppointments: number;
    remainingAppointments: number;
  };
  todayAppointments: IBooking[];
  upcomingAppointments: IBooking[];
}> {
  await connectDB();

  const barber = await Barber.findById(barberId).populate(['salon', 'services']);
  if (!barber) {
    throw BOOKING_ERRORS.INVALID_BARBER;
  }

  if (currentUser.role === USER_ROLES.BARBER) {
    const matchingBarber = await Barber.findOne({ _id: barberId, user: currentUser._id });
    if (!matchingBarber) {
      throw BOOKING_ERRORS.UNAUTHORIZED;
    }
  }

  const allBookings = await Booking.find({ barber: barber._id })
    .populate(['customer', 'salon', 'service'])
    .sort({ appointmentDate: 1, startTime: 1 });

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  const todayAppointments = allBookings.filter((booking) => {
    const bookingDate = new Date(booking.appointmentDate);
    return bookingDate >= todayStart && bookingDate < todayEnd;
  });

  const upcomingAppointments = allBookings.filter((booking) => {
    const bookingDate = new Date(booking.appointmentDate);
    return bookingDate >= todayEnd && booking.status !== BOOKING_STATUS.CANCELLED;
  });

  return {
    barber,
    stats: {
      todayAppointments: todayAppointments.length,
      upcomingAppointments: upcomingAppointments.length,
      completedAppointments: allBookings.filter((booking) => booking.status === BOOKING_STATUS.COMPLETED).length,
      remainingAppointments: todayAppointments.filter((booking) => booking.status !== BOOKING_STATUS.COMPLETED && booking.status !== BOOKING_STATUS.CANCELLED).length,
    },
    todayAppointments: todayAppointments.slice(0, 10),
    upcomingAppointments: upcomingAppointments.slice(0, 10),
  };
}

export async function getBarberBookings(
  barberId: string,
  currentUser: AuthUser,
  options: { page: number; limit: number; status?: string }
): Promise<{ bookings: IBooking[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  await connectDB();

  const barber = await Barber.findById(barberId);
  if (!barber) {
    throw BOOKING_ERRORS.INVALID_BARBER;
  }

  if (currentUser.role === USER_ROLES.BARBER) {
    const matchedBarber = await Barber.findOne({ _id: barberId, user: currentUser._id });
    if (!matchedBarber) {
      throw BOOKING_ERRORS.UNAUTHORIZED;
    }
  }

  const query: Record<string, unknown> = { barber: new Types.ObjectId(barberId) };
  if (options.status) query.status = options.status;

  const total = await Booking.countDocuments(query);
  const totalPages = Math.ceil(total / options.limit);

  const bookings = await Booking.find(query)
    .populate(['customer', 'salon', 'barber', 'service'])
    .sort({ appointmentDate: -1, startTime: -1 })
    .skip((options.page - 1) * options.limit)
    .limit(options.limit);

  return {
    bookings,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages,
    },
  };
}

/**
 * Create a new booking
 * Performs all validation and creates booking atomically
 */
export async function createBooking(payload: BookingCreatePayload): Promise<IBooking> {
  await connectDB();

  // Validate user is customer
  if (payload.currentUser.role !== 'CUSTOMER') {
    throw BOOKING_ERRORS.UNAUTHORIZED;
  }

  // Validate all prerequisites
  const { salon, barber, service, appointmentDate } = await validateBookingRequest(payload);

  // Calculate end time and validate against service duration
  const endTime = calculateEndTime(payload.startTime, service.duration);

  // Check for overlapping bookings (CRITICAL: must re-check before creating)
  const hasOverlap = await checkOverlappingBookings(
    payload.barberId,
    appointmentDate,
    payload.startTime,
    endTime
  );

  if (hasOverlap) {
    throw BOOKING_ERRORS.OVERLAPPING_BOOKING;
  }

  // Generate booking number
  const bookingNumber = await generateBookingNumber();

  // Calculate price (from database, never trust frontend)
  const servicePrice = service.discountPrice || service.price;
  const discountAmount = 0; // No discount in Phase 8
  const taxAmount = 0; // No tax in Phase 8
  const totalAmount = servicePrice - discountAmount + taxAmount;

  // Create booking
  const booking = await Booking.create({
    bookingNumber,
    customer: new Types.ObjectId(payload.currentUser._id),
    salon: new Types.ObjectId(payload.salonId),
    barber: new Types.ObjectId(payload.barberId),
    service: new Types.ObjectId(payload.serviceId),
    appointmentDate,
    startTime: payload.startTime,
    endTime,
    duration: service.duration,
    servicePrice,
    discountAmount,
    taxAmount,
    totalAmount,
    status: BOOKING_STATUS.PENDING,
    paymentStatus: PAYMENT_STATUS.PENDING,
    bookingType: payload.bookingType,
    customerNotes: payload.customerNotes || null,
  });

  return booking.populate(['customer', 'salon', 'barber', 'service']);
}

/**
 * Get available time slots for a specific date
 */
export async function getAvailableSlots(
  salonId: string,
  barberId: string,
  serviceId: string,
  appointmentDate: string
): Promise<AvailabilityResponse> {
  await connectDB();

  // Validate inputs
  const salon = await Salon.findById(salonId).select('openingHours');
  if (!salon) {
    throw BOOKING_ERRORS.INVALID_SALON;
  }

  const barberExists = await Barber.exists({ _id: barberId });
  if (!barberExists) {
    throw BOOKING_ERRORS.INVALID_BARBER;
  }

  const service = await Service.findById(serviceId);
  if (!service) {
    throw BOOKING_ERRORS.INVALID_SERVICE;
  }

  // Parse date
  const date = new Date(appointmentDate);
  if (isNaN(date.getTime())) {
    throw { code: 'INVALID_DATE', message: 'Invalid date format' };
  }

  // Get existing bookings for the date that are not cancelled
  const existingBookings = await Booking.find({
    barber: new Types.ObjectId(barberId),
    appointmentDate: {
      $gte: new Date(date.toDateString()),
      $lt: new Date(new Date(date).setDate(date.getDate() + 1)),
    },
    status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.IN_PROGRESS] },
  }).select('startTime endTime');

  // Get salon opening hours
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
  const dayHours = salon.openingHours?.[dayOfWeek as keyof typeof salon.openingHours];

  const openingTime = dayHours?.startTime || '09:00';
  const closingTime = dayHours?.endTime || '18:00';

  // Generate slots
  const slots = generateTimeSlots(
    openingTime,
    closingTime,
    service.duration,
    existingBookings.map((b) => ({
      startTime: b.startTime,
      endTime: b.endTime,
    }))
  );

  return {
    date: appointmentDate,
    serviceDuration: service.duration,
    slots,
  };
}

/**
 * Get customer's bookings
 */
export async function getCustomerBookings(
  customerId: string,
  options: { page: number; limit: number; status?: string }
): Promise<{ bookings: IBooking[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  await connectDB();

  const query: Record<string, unknown> = { customer: new Types.ObjectId(customerId) };
  if (options.status) {
    query.status = options.status;
  }

  const total = await Booking.countDocuments(query);
  const totalPages = Math.ceil(total / options.limit);

  const bookings = await Booking.find(query)
    .populate(['salon', 'barber', 'service'])
    .sort({ appointmentDate: -1 })
    .skip((options.page - 1) * options.limit)
    .limit(options.limit);

  return {
    bookings,
    pagination: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages,
    },
  };
}

/**
 * Get single booking with authorization
 */
export async function getBookingById(bookingId: string, currentUser: AuthUser): Promise<IBooking | null> {
  await connectDB();

  const booking = await Booking.findById(bookingId).populate(['customer', 'salon', 'barber', 'service']);

  if (!booking) {
    return null;
  }

  if (currentUser.role === USER_ROLES.CUSTOMER && booking.customer._id.toString() !== currentUser._id) {
    throw BOOKING_ERRORS.UNAUTHORIZED;
  }

  if (currentUser.role === USER_ROLES.SALON_OWNER) {
    const salon = await Salon.findOne({
      _id: booking.salon._id,
      owner: new Types.ObjectId(currentUser._id),
    });
    if (!salon) {
      throw BOOKING_ERRORS.UNAUTHORIZED;
    }
  }

  if (currentUser.role === USER_ROLES.BARBER) {
    const barber = await Barber.findOne({
      _id: booking.barber._id,
      user: new Types.ObjectId(currentUser._id),
    });
    if (!barber) {
      throw BOOKING_ERRORS.UNAUTHORIZED;
    }
  }

  if (![USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(currentUser.role)) {
    // Admin/super-admin can view any booking
  }

  return booking;
}

/**
 * Cancel booking with authorization
 * Integrates with payment refund if booking is paid
 */
export async function cancelBooking(
  bookingId: string,
  currentUser: AuthUser,
  reason?: string
): Promise<IBooking> {
  await connectDB();

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw BOOKING_ERRORS.BOOKING_NOT_FOUND;
  }

  // Authorization: customer can only cancel their own booking
  if (currentUser.role === 'CUSTOMER' && booking.customer.toString() !== currentUser._id) {
    throw BOOKING_ERRORS.UNAUTHORIZED;
  }

  // Check if cancellation is within allowed window
  const appointmentDateTime = new Date(booking.appointmentDate);
  const [hours, minutes] = booking.startTime.split(':').map(Number);
  appointmentDateTime.setHours(hours, minutes, 0, 0);

  const now = new Date();
  const minutesUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60);

  if (minutesUntilAppointment < BOOKING_CANCELLATION_MINUTES) {
    throw BOOKING_ERRORS.CANNOT_CANCEL;
  }

  // Update booking
  booking.status = BOOKING_STATUS.CANCELLED;
  booking.cancellationReason = reason || 'Customer cancelled';
  await booking.save();

  return booking.populate(['customer', 'salon', 'barber', 'service']);
}

/**
 * Update booking status (admin/staff only)
 */
export async function updateBookingStatus(
  bookingId: string,
  newStatus: string,
  currentUser: AuthUser
): Promise<IBooking> {
  await connectDB();

  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw BOOKING_ERRORS.BOOKING_NOT_FOUND;
  }

  const isAdmin = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(currentUser.role as typeof USER_ROLES.ADMIN);
  const isSalonOwner = currentUser.role === USER_ROLES.SALON_OWNER;
  const isBarber = currentUser.role === USER_ROLES.BARBER;

  if (!isAdmin && !isSalonOwner && !isBarber) {
    throw BOOKING_ERRORS.UNAUTHORIZED;
  }

  if (isSalonOwner) {
    const salon = await Salon.findOne({
      _id: booking.salon,
      owner: new Types.ObjectId(currentUser._id),
    });
    if (!salon) {
      throw BOOKING_ERRORS.UNAUTHORIZED;
    }
  }

  if (isBarber) {
    const barber = await Barber.findOne({
      _id: booking.barber,
      user: new Types.ObjectId(currentUser._id),
    });
    if (!barber) {
      throw BOOKING_ERRORS.UNAUTHORIZED;
    }
  }

  const validTransitions: Record<string, string[]> = {
    [BOOKING_STATUS.PENDING]: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CANCELLED],
    [BOOKING_STATUS.CONFIRMED]: [BOOKING_STATUS.IN_PROGRESS, BOOKING_STATUS.CANCELLED, BOOKING_STATUS.NO_SHOW],
    [BOOKING_STATUS.IN_PROGRESS]: [BOOKING_STATUS.COMPLETED, BOOKING_STATUS.NO_SHOW],
    [BOOKING_STATUS.COMPLETED]: [],
    [BOOKING_STATUS.CANCELLED]: [],
    [BOOKING_STATUS.NO_SHOW]: [],
  };

  if (!validTransitions[booking.status]?.includes(newStatus)) {
    throw BOOKING_ERRORS.INVALID_STATUS_TRANSITION;
  }

  booking.status = newStatus;
  await booking.save();

  return booking.populate(['customer', 'salon', 'barber', 'service']);
}

/**
 * Reschedule a booking
 * Customer can change appointment date and time
 */
export async function rescheduleBooking(
  bookingId: string,
  newAppointmentDate: string,
  newStartTime: string,
  currentUser: AuthUser
): Promise<IBooking> {
  await connectDB();

  const booking = await Booking.findById(bookingId).populate(['salon', 'barber', 'service']);
  if (!booking) {
    throw BOOKING_ERRORS.BOOKING_NOT_FOUND;
  }

  // Authorization: customer can only reschedule their own booking
  if (currentUser.role === 'CUSTOMER' && booking.customer.toString() !== currentUser._id) {
    throw BOOKING_ERRORS.UNAUTHORIZED;
  }

  // Can only reschedule if booking is PENDING or CONFIRMED
  if (![BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED].includes(booking.status)) {
    throw { code: 'CANNOT_RESCHEDULE', message: 'Cannot reschedule completed, cancelled, or in-progress bookings' };
  }

  // Check if current appointment is in the future (must not be within cancellation window of old appointment)
  const oldAppointmentDateTime = new Date(booking.appointmentDate);
  const [oldHours, oldMinutes] = booking.startTime.split(':').map(Number);
  oldAppointmentDateTime.setHours(oldHours, oldMinutes, 0, 0);
  const now = new Date();
  const minutesUntilOldAppointment = (oldAppointmentDateTime.getTime() - now.getTime()) / (1000 * 60);

  if (minutesUntilOldAppointment < BOOKING_CANCELLATION_MINUTES) {
    throw BOOKING_ERRORS.CANNOT_CANCEL;
  }

  // Validate new appointment date
  const newDate = new Date(newAppointmentDate);
  if (!isDateBookable(newDate, BOOKING_MIN_DAYS_AHEAD, BOOKING_MAX_DAYS_AHEAD)) {
    throw BOOKING_ERRORS.INVALID_DATE;
  }

  // Validate new date and time are not in past
  if (isAppointmentInPast(newDate, newStartTime)) {
    throw BOOKING_ERRORS.DATE_IN_PAST;
  }

  // Get service (it might have changed, so always fetch fresh)
  const service = await Service.findById(booking.service._id);
  if (!service || !service.isActive) {
    throw BOOKING_ERRORS.INVALID_SERVICE;
  }

  // Calculate new end time
  const newEndTime = calculateEndTime(newStartTime, service.duration);

  // Validate time format and range
  if (!isValidTimeRange(newStartTime, newEndTime)) {
    throw BOOKING_ERRORS.INVALID_TIME;
  }

  // Check for overlapping bookings with the new time (excluding this booking)
  const existingBooking = await Booking.findOne({
    _id: { $ne: new Types.ObjectId(bookingId) },
    barber: booking.barber._id,
    appointmentDate: {
      $gte: new Date(newDate.toDateString()),
      $lt: new Date(new Date(newDate).setDate(newDate.getDate() + 1)),
    },
    startTime: { $exists: true },
    endTime: { $exists: true },
    status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.IN_PROGRESS] },
  });

  if (existingBooking) {
    const hasOverlap = isTimeOverlap(existingBooking.startTime, existingBooking.endTime, newStartTime, newEndTime);
    if (hasOverlap) {
      throw BOOKING_ERRORS.OVERLAPPING_BOOKING;
    }
  }

  // Update booking with new date/time
  booking.appointmentDate = newDate;
  booking.startTime = newStartTime;
  booking.endTime = newEndTime;
  await booking.save();

  return booking.populate(['customer', 'salon', 'barber', 'service']);
}
