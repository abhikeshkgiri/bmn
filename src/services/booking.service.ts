/**
 * Booking service layer
 * Core business logic for booking operations
 * All server-side validation and authorization happens here
 * ⚠️ CRITICAL: All booking creation uses atomic operations to prevent race conditions
 */

import { Types } from 'mongoose';
import Booking, { type IBooking } from '@/models/Booking';
import Salon, { type ISalon } from '@/models/Salon';
import Barber, { type IBarber } from '@/models/Barber';
import Service, { type IService } from '@/models/Service';
import User from '@/models/User';
import Leave from '@/models/Leave';
import { connectDB } from '@/lib/db';
import type { AuthUser } from '@/types';
import { BOOKING_STATUS, PAYMENT_STATUS, BOOKING_TYPE } from '@/constants/booking';
import { USER_ROLES } from '@/constants/roles';
import { isSalonApproved } from '@/utils/salon-approval';
import {
  BOOKING_CANCELLATION_MINUTES,
  BOOKING_MAX_DAYS_AHEAD,
  BOOKING_MIN_DAYS_AHEAD,
} from '@/constants/booking-config';
import {
  activeBookingFilter,
  isDateBookable,
  isAppointmentInPast,
  calculateEndTime,
  isTimeOverlap,
  isValidTimeFormat,
  generateBookingNumberFormat,
  isValidTimeRange,
  createExpiredBookingHoldFilter,
  parseLocalCalendarDate,
  isWithinOpeningHours,
  isBookingStatusTransitionAllowed,
  isBookingHoldExpired,
} from '@/utils/booking';
import { buildAvailabilitySlots } from '@/utils/booking-availability';
import {
  notifyBookingCancelled,
  notifyBookingCreated,
  notifyBookingConfirmed,
  notifyBookingCompleted,
  notifyBookingRescheduled,
} from '@/services/notification.service';
import mongoose from 'mongoose';
import { recordAuditEvent } from '@/services/audit.service';
import { calculateCheckoutPrice, reserveCouponUsage } from '@/services/pricing.service';
import { redeemLoyaltyPoints, awardLoyaltyPoints, refundRedeemedPoints } from '@/services/loyalty.service';
import { releaseCouponUsage } from '@/services/pricing.service';
import {
  getSupportedSalonLocationFilter,
  isSupportedSalonLocation,
} from '@/constants/launch-cities';

const BOOKING_HOLD_MINUTES = 10;

async function releaseExpiredBookingHolds(
  salonId: Types.ObjectId,
  session?: mongoose.ClientSession,
): Promise<void> {
  await Booking.updateMany(
    createExpiredBookingHoldFilter(salonId),
    { $set: { status: BOOKING_STATUS.CANCELLED, cancellationReason: 'Payment hold expired' } },
    session ? { session } : undefined,
  );
}

async function lockEligibleSalonForBooking(
  salonId: Types.ObjectId,
  session: mongoose.ClientSession,
): Promise<ISalon> {
  const eligibilityFilter = {
    _id: salonId,
    isActive: true,
    isVerified: true,
    approvalStatus: { $in: ['APPROVED', null] },
    ...getSupportedSalonLocationFilter(),
  };
  const update = await Salon.updateOne(
    eligibilityFilter,
    { $inc: { bookingLockVersion: 1 } },
    { session },
  );
  if (update.matchedCount !== 1) throw BOOKING_ERRORS.INVALID_SALON;

  const salon = await Salon.findOne(eligibilityFilter).session(session);
  if (!salon) throw BOOKING_ERRORS.INVALID_SALON;
  return salon;
}

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
  couponCode?: string;
  loyaltyPoints?: number;
  currentUser: AuthUser;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  capacity?: number; // Total capacity for this slot
  booked?: number; // Number of booked appointments at this slot
  remaining?: number; // Remaining available slots
}

interface AvailabilityResponse {
  date: string;
  serviceDuration: number;
  salonCapacity: number;
  slots: TimeSlot[];
}

/**
 * Generate next available booking number
 * Format: BMN-YYYY-XXXXXX
 */
export async function generateBookingNumber(session?: mongoose.ClientSession): Promise<string> {
  const year = new Date().getFullYear();
  const query = Booking.findOne()
    .sort({ createdAt: -1 })
    .select('bookingNumber');
  if (session) query.session(session);
  const lastBooking = await query.exec();

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
  if (
    !salon ||
    !salon.isActive ||
    !salon.isVerified ||
    !isSalonApproved(salon) ||
    !isSupportedSalonLocation(salon.address.city, salon.address.state)
  ) {
    throw BOOKING_ERRORS.INVALID_SALON;
  }

  // Validate barber
  const barber = await Barber.findById(payload.barberId).populate('salon');
  if (!barber || !barber.isActive || !barber.isVerified || !barber.isAvailable) {
    throw BOOKING_ERRORS.INVALID_BARBER;
  }
  const barberAccount = await User.findOne({
    _id: barber.user,
    role: USER_ROLES.BARBER,
    isActive: true,
  }).select('_id');
  if (!barberAccount) throw BOOKING_ERRORS.INVALID_BARBER;

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
  if (!barber.services?.some((s: Types.ObjectId) => s.toString() === payload.serviceId)) {
    throw BOOKING_ERRORS.BARBER_DOES_NOT_OFFER_SERVICE;
  }

  // Validate booking type
  if (payload.bookingType !== BOOKING_TYPE.SALON) {
    throw BOOKING_ERRORS.HOME_SERVICE_NOT_AVAILABLE;
  }

  // Validate time format
  if (!isValidTimeFormat(payload.startTime)) {
    throw BOOKING_ERRORS.INVALID_TIME;
  }
  if (!isValidTimeRange(payload.startTime, calculateEndTime(payload.startTime, service.duration))) {
    throw BOOKING_ERRORS.INVALID_TIME;
  }

  // Validate appointment date
  const appointmentDate = parseLocalCalendarDate(payload.appointmentDate);
  if (!appointmentDate) throw BOOKING_ERRORS.INVALID_DATE;
  if (!isDateBookable(appointmentDate, BOOKING_MIN_DAYS_AHEAD, BOOKING_MAX_DAYS_AHEAD)) {
    throw BOOKING_ERRORS.INVALID_DATE;
  }

  // Validate date and time are not in past
  if (isAppointmentInPast(appointmentDate, payload.startTime)) {
    throw BOOKING_ERRORS.DATE_IN_PAST;
  }

  const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][appointmentDate.getDay()];
  const dayHours = salon.openingHours?.[weekday as keyof typeof salon.openingHours];
  if (!dayHours || !isWithinOpeningHours(
    dayHours.isOpen,
    dayHours.openTime || '09:00',
    dayHours.closeTime || '18:00',
    payload.startTime,
    service.duration,
    salon.slotIntervalMinutes,
  )) {
    throw BOOKING_ERRORS.SLOT_UNAVAILABLE;
  }

  const dayStart = new Date(appointmentDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const activeLeave = await Leave.findOne({
    salon: salon._id,
    active: true,
    startDate: { $lt: dayEnd },
    endDate: { $gt: dayStart },
    $or: [{ barber: null }, { barber: barber._id }],
  }).select('_id');
  if (activeLeave) throw BOOKING_ERRORS.SLOT_UNAVAILABLE;

  return {
    salon,
    barber,
    service,
    appointmentDate,
  };
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
  const isStaff = currentUser.role === USER_ROLES.SALON_STAFF &&
    salon.staff?.some((staffId: Types.ObjectId) => staffId.toString() === currentUser._id);
  if (!isAdmin && !isOwner && !isStaff) {
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

  const isAdmin = currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.SUPER_ADMIN;
  const isOwner = currentUser.role === USER_ROLES.SALON_OWNER;
  const isStaff = currentUser.role === USER_ROLES.SALON_STAFF;
  if ((isOwner || isStaff) && ownerId !== currentUser._id) {
    throw BOOKING_ERRORS.UNAUTHORIZED;
  }
  if (!isAdmin && !isOwner && !isStaff) {
    throw BOOKING_ERRORS.UNAUTHORIZED;
  }

  const salon = isStaff
    ? await Salon.findOne({ staff: new Types.ObjectId(currentUser._id) })
    : await Salon.findOne({ owner: new Types.ObjectId(ownerId) });
  if (!salon && !isAdmin) {
    throw BOOKING_ERRORS.UNAUTHORIZED;
  }

  const targetSalonId = salon ? salon._id : undefined;
  const query: Record<string, unknown> = {};

  if (isOwner || isStaff) {
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

  const isAdmin = currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.SUPER_ADMIN;
  if (!isAdmin && currentUser.role !== USER_ROLES.BARBER) {
    throw BOOKING_ERRORS.UNAUTHORIZED;
  }

  if (!isAdmin) {
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

  const isAdmin = currentUser.role === USER_ROLES.ADMIN || currentUser.role === USER_ROLES.SUPER_ADMIN;
  if (!isAdmin && currentUser.role !== USER_ROLES.BARBER) {
    throw BOOKING_ERRORS.UNAUTHORIZED;
  }

  if (!isAdmin) {
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
 * Create a new booking with atomic capacity check
 * Prevents double-booking and overbooking at database level using atomic operations
 * ⚠️ CRITICAL: This function now uses MongoDB transactions to ensure atomicity
 */
export async function createBooking(payload: BookingCreatePayload): Promise<IBooking> {
  await connectDB();

  // Validate user is customer
  if (payload.currentUser.role !== 'CUSTOMER') {
    throw BOOKING_ERRORS.UNAUTHORIZED;
  }

  // Validate all prerequisites (non-atomic checks)
  const { service, appointmentDate } = await validateBookingRequest(payload);
  const price = await calculateCheckoutPrice({
    salonId: payload.salonId,
    serviceId: payload.serviceId,
    customerId: payload.currentUser._id,
    couponCode: payload.couponCode,
    loyaltyPoints: payload.loyaltyPoints,
  });

  // Calculate end time and validate against service duration
  const endTime = calculateEndTime(payload.startTime, service.duration);

  // ⚠️ ATOMIC OPERATION SECTION: Everything from here uses transactions
  // This ensures that availability checking and booking creation are atomic
  // and no race conditions can occur
  
  const session = await mongoose.startSession();
  let populatedBooking: IBooking | null = null;

  try {
    await session.withTransaction(async () => {
      await releaseExpiredBookingHolds(new Types.ObjectId(payload.salonId), session);

      const transactionSalon = await lockEligibleSalonForBooking(
        new Types.ObjectId(payload.salonId),
        session,
      );
      const currentService = await Service.findOne({
        _id: service._id,
        salon: transactionSalon._id,
        isActive: true,
      }).session(session);
      const currentBarber = await Barber.findOne({
        _id: new Types.ObjectId(payload.barberId),
        salon: transactionSalon._id,
        isActive: true,
        isVerified: true,
        isAvailable: true,
        services: service._id,
      }).session(session);
      const currentBarberUser = currentBarber ? await User.findOne({
        _id: currentBarber.user,
        role: USER_ROLES.BARBER,
        isActive: true,
      }).session(session) : null;
      if (
        !currentService ||
        currentService.duration !== service.duration ||
        currentService.price !== service.price ||
        currentService.discountPrice !== service.discountPrice ||
        !currentBarber ||
        !currentBarberUser
      ) {
        throw BOOKING_ERRORS.INVALID_SERVICE;
      }

      const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][appointmentDate.getDay()];
      const transactionHours = transactionSalon.openingHours?.[weekday as keyof typeof transactionSalon.openingHours];
      if (!transactionHours || !isWithinOpeningHours(
        transactionHours.isOpen,
        transactionHours.openTime || '09:00',
        transactionHours.closeTime || '18:00',
        payload.startTime,
        currentService.duration,
        transactionSalon.slotIntervalMinutes,
      )) {
        throw BOOKING_ERRORS.SLOT_UNAVAILABLE;
      }
      const dayStart = new Date(appointmentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const transactionLeave = await Leave.findOne({
        salon: transactionSalon._id,
        active: true,
        startDate: { $lt: dayEnd },
        endDate: { $gt: dayStart },
        $or: [{ barber: null }, { barber: currentBarber._id }],
      }).session(session);
      if (transactionLeave) throw BOOKING_ERRORS.SLOT_UNAVAILABLE;

      const activeFilter = activeBookingFilter();

      const barberOverlap = await Booking.findOne(
        {
          barber: new Types.ObjectId(payload.barberId),
          appointmentDate: { $gte: dayStart, $lt: dayEnd },
          ...activeFilter,
          startTime: { $lt: endTime },
          endTime: { $gt: payload.startTime },
        },
        {},
        { session },
      );

      if (barberOverlap) {
        throw BOOKING_ERRORS.OVERLAPPING_BOOKING;
      }

      const salonCapacity = transactionSalon.capacity || 4;
      const bookingsAtThisSlot = await Booking.countDocuments(
        {
          salon: new Types.ObjectId(payload.salonId),
          appointmentDate: { $gte: dayStart, $lt: dayEnd },
          ...activeFilter,
          startTime: { $lt: endTime },
          endTime: { $gt: payload.startTime },
        },
        { session },
      );

      if (bookingsAtThisSlot >= salonCapacity) {
        throw BOOKING_ERRORS.SLOT_UNAVAILABLE;
      }

      const bookingNumber = await generateBookingNumber(session);
      const servicePrice = price.servicePrice;
      const discountAmount = price.discountAmount;
      const taxAmount = price.taxAmount;
      const totalAmount = price.totalAmount;

      const bookingDoc = new Booking({
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
        couponCode: price.couponCode,
        loyaltyPointsRedeemed: price.loyaltyPoints,
        membershipDiscountAmount: price.membershipDiscount,
        status: BOOKING_STATUS.PENDING,
        paymentStatus: PAYMENT_STATUS.PENDING,
        holdExpiresAt: new Date(Date.now() + BOOKING_HOLD_MINUTES * 60 * 1000),
        bookingType: payload.bookingType,
        customerNotes: payload.customerNotes || null,
      });

      const booking = await bookingDoc.save({ session });
      if (price.coupon) {
        await reserveCouponUsage(price.coupon, payload.currentUser._id, booking._id.toString(), session);
      }
      if (price.loyaltyPoints > 0) {
        await redeemLoyaltyPoints(payload.currentUser._id, price.loyaltyPoints, session, booking._id.toString());
      }
      populatedBooking = await booking.populate(['customer', 'salon', 'barber', 'service']);
    });

    const bookingToReturn = populatedBooking as IBooking | null;
    if (!bookingToReturn) {
      throw new Error('BOOKING_CREATION_FAILED');
    }

    await notifyBookingCreated(bookingToReturn._id.toString());

    return bookingToReturn;
  } catch (error) {
    throw error;
  } finally {
    await session.endSession();
  }
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
  const salon = await Salon.findById(salonId).select('openingHours capacity slotIntervalMinutes isActive isVerified approvalStatus address.city address.state');
  if (
    !salon ||
    !salon.isActive ||
    !salon.isVerified ||
    !isSalonApproved(salon) ||
    !isSupportedSalonLocation(salon.address.city, salon.address.state)
  ) {
    throw BOOKING_ERRORS.INVALID_SALON;
  }

  const barber = await Barber.findOne({
    _id: barberId,
    salon: salonId,
    isActive: true,
    isVerified: true,
    isAvailable: true,
  }).select('_id services');
  if (!barber) {
    throw BOOKING_ERRORS.INVALID_BARBER;
  }
  const barberAccount = await User.findOne({
    _id: barber.user,
    role: USER_ROLES.BARBER,
    isActive: true,
  }).select('_id');
  if (!barberAccount) throw BOOKING_ERRORS.INVALID_BARBER;

  const service = await Service.findById(serviceId);
  if (!service || !service.isActive || service.salon.toString() !== salonId) {
    throw BOOKING_ERRORS.INVALID_SERVICE;
  }
  if (!barber.services.some((id: Types.ObjectId) => id.toString() === serviceId)) throw BOOKING_ERRORS.BARBER_DOES_NOT_OFFER_SERVICE;

  // Parse date
  const date = parseLocalCalendarDate(appointmentDate);
  if (!date || !isDateBookable(date, BOOKING_MIN_DAYS_AHEAD, BOOKING_MAX_DAYS_AHEAD)) {
    throw BOOKING_ERRORS.INVALID_DATE;
  }

  const dayStart = new Date(date.toDateString());
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const activeLeaves = await Leave.find({
    salon: salonId,
    active: true,
    startDate: { $lt: dayEnd },
    endDate: { $gt: dayStart },
    $or: [{ barber: null }, { barber: barberId }],
  }).select('barber');
  const salonClosed = activeLeaves.some((leave) => !leave.barber);
  const barberUnavailable = activeLeaves.some((leave) => leave.barber);
  if (salonClosed) {
    return { date: appointmentDate, serviceDuration: service.duration, salonCapacity: salon.capacity, slots: [] };
  }

  // Get all confirmed bookings for the date (all barbers, all services)
  // This counts capacity across all barbers in the salon
  const allBookings = await Booking.find({
    salon: new Types.ObjectId(salonId),
    appointmentDate: {
      $gte: dayStart,
      $lt: dayEnd,
    },
    ...activeBookingFilter(),
  }).select('startTime endTime duration');

  // Get salon opening hours
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][date.getDay()];
  const dayHours = salon.openingHours?.[dayOfWeek as keyof typeof salon.openingHours];

  const openingTime = dayHours?.openTime || '09:00';
  const closingTime = dayHours?.closeTime || '18:00';
  const salonCapacity = salon.capacity || 4;
  const slotInterval = salon.slotIntervalMinutes || 30;
  const slots: TimeSlot[] = buildAvailabilitySlots({
    isOpen: Boolean(dayHours?.isOpen),
    openingTime,
    closingTime,
    serviceDuration: service.duration,
    salonCapacity,
    slotIntervalMinutes: slotInterval,
    bookings: allBookings,
    barberUnavailable,
    appointmentDate: date,
  });

  return {
    date: appointmentDate,
    serviceDuration: service.duration,
    salonCapacity,
    slots,
  };
}

/**
 * Get earliest available slot for a salon (for discovery pages)
 * Used to show "Next available: X" on nearby salons
 */
export async function getEarliestAvailableSlot(
  salonId: string,
  daysToCheck: number = 7
): Promise<{ date: string; time: string } | null> {
  await connectDB();

  const salon = await Salon.findById(salonId).select('openingHours capacity slotIntervalMinutes');
  if (!salon) {
    return null;
  }

  // Check next N days for available slots
  for (let dayOffset = 0; dayOffset < daysToCheck; dayOffset++) {
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() + dayOffset);

    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
      checkDate.getDay()
    ];
    const dayHours = salon.openingHours?.[dayOfWeek as keyof typeof salon.openingHours];

    if (!dayHours?.isOpen) {
      continue;
    }

    const openingTime = dayHours.openTime || '09:00';
    const closingTime = dayHours.closeTime || '18:00';
    const salonCapacity = salon.capacity || 4;

    // Get bookings for this date
    const bookingsForDate = await Booking.find({
      salon: new Types.ObjectId(salonId),
      appointmentDate: {
        $gte: new Date(checkDate.toDateString()),
        $lt: new Date(new Date(checkDate).setDate(checkDate.getDate() + 1)),
      },
      ...activeBookingFilter(),
    }).select('startTime endTime');

    const [openHour, openMin] = openingTime.split(':').map(Number);
    const [closeHour, closeMin] = closingTime.split(':').map(Number);

    let currentHour = openHour;
    let currentMin = openMin;
    const closeTotalMin = closeHour * 60 + closeMin;

    // Find first available slot (assuming 30-min service)
    const serviceDefaultDuration = 30;
    while (currentHour * 60 + currentMin + serviceDefaultDuration <= closeTotalMin) {
      const startTime = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
      const endHour = Math.floor((currentHour * 60 + currentMin + serviceDefaultDuration) / 60);
      const endMin = (currentHour * 60 + currentMin + serviceDefaultDuration) % 60;
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

      const overlappingBookings = bookingsForDate.filter((b) =>
        isTimeOverlap(b.startTime, b.endTime, startTime, endTime)
      );

      if (overlappingBookings.length < salonCapacity) {
        // Found an available slot
        return {
          date: checkDate.toISOString().split('T')[0],
          time: startTime,
        };
      }

      currentMin += 30;
      if (currentMin >= 60) {
        currentHour += Math.floor(currentMin / 60);
        currentMin = currentMin % 60;
      }
    }
  }

  return null;
}

/**
 * Get customer's bookings
 */
export async function getCustomerBookings(
  customerId: string,
  options: {
    page: number;
    limit: number;
    status?: string;
    paymentStatus?: string;
    sortBy?: 'appointmentDate' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
  }
): Promise<{ bookings: IBooking[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  await connectDB();

  const query: Record<string, unknown> = { customer: new Types.ObjectId(customerId) };
  if (options.status) {
    query.status = options.status;
  }
  if (options.paymentStatus) query.paymentStatus = options.paymentStatus;

  const total = await Booking.countDocuments(query);
  const totalPages = Math.ceil(total / options.limit);

  const bookings = await Booking.find(query)
    .populate(['salon', 'barber', 'service'])
    .sort({
      [options.sortBy || 'appointmentDate']: options.sortOrder === 'asc' ? 1 : -1,
      startTime: options.sortOrder === 'asc' ? 1 : -1,
    })
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

  const adminRoles = [USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN] as const;
  const isAdmin = adminRoles.includes(currentUser.role as (typeof adminRoles)[number]);
  const bookingReaderRoles: AuthUser['role'][] = [
    USER_ROLES.CUSTOMER,
    USER_ROLES.SALON_OWNER,
    USER_ROLES.SALON_STAFF,
    USER_ROLES.BARBER,
  ];
  if (
    !isAdmin &&
    !bookingReaderRoles.includes(currentUser.role)
  ) {
    throw BOOKING_ERRORS.UNAUTHORIZED;
  }

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

  if (currentUser.role === USER_ROLES.SALON_STAFF) {
    const salon = await Salon.findOne({
      _id: booking.salon._id,
      staff: new Types.ObjectId(currentUser._id),
    });
    if (!salon) throw BOOKING_ERRORS.UNAUTHORIZED;
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

  if (currentUser.role !== USER_ROLES.CUSTOMER) {
    throw BOOKING_ERRORS.UNAUTHORIZED;
  }
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    throw BOOKING_ERRORS.BOOKING_NOT_FOUND;
  }

  // Authorization: customer can only cancel their own booking
  if (booking.customer.toString() !== currentUser._id) {
    throw BOOKING_ERRORS.UNAUTHORIZED;
  }
  if (![BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED].includes(booking.status)) {
    throw BOOKING_ERRORS.INVALID_STATUS_TRANSITION;
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

  const cancelledBooking = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      customer: new Types.ObjectId(currentUser._id),
      status: { $in: [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED] },
    },
    {
      $set: {
        status: BOOKING_STATUS.CANCELLED,
        cancellationReason: reason || 'Customer cancelled',
      },
    },
    { new: true, runValidators: true },
  );
  if (!cancelledBooking) throw BOOKING_ERRORS.INVALID_STATUS_TRANSITION;
  await releaseCouponUsage(bookingId);
  if (cancelledBooking.loyaltyPointsRedeemed && cancelledBooking.loyaltyPointsRedeemed > 0) {
    await refundRedeemedPoints(bookingId, cancelledBooking.customer.toString());
  }

  const populatedBooking = await cancelledBooking.populate(['customer', 'salon', 'barber', 'service']);
  await notifyBookingCancelled(populatedBooking._id.toString());
  void recordAuditEvent({
    actor: currentUser,
    action: 'BOOKING_CANCELLED',
    entityType: 'Booking',
    entityId: bookingId,
    metadata: { reason: reason || 'Customer cancelled' },
  });

  return populatedBooking;
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
  const isSalonStaff = currentUser.role === USER_ROLES.SALON_STAFF;
  const isBarber = currentUser.role === USER_ROLES.BARBER;

  if (!isAdmin && !isSalonOwner && !isSalonStaff && !isBarber) {
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

  if (isSalonStaff) {
    const salon = await Salon.findOne({
      _id: booking.salon,
      staff: new Types.ObjectId(currentUser._id),
    });
    if (!salon) throw BOOKING_ERRORS.UNAUTHORIZED;
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

  if (!isBookingStatusTransitionAllowed(booking.status, newStatus)) {
    throw BOOKING_ERRORS.INVALID_STATUS_TRANSITION;
  }

  const updatedBooking = await Booking.findOneAndUpdate(
    { _id: booking._id, status: booking.status },
    { $set: { status: newStatus } },
    { new: true, runValidators: true },
  );
  if (!updatedBooking) throw BOOKING_ERRORS.INVALID_STATUS_TRANSITION;

  const populatedBooking = await updatedBooking.populate(['customer', 'salon', 'barber', 'service']);

  if (newStatus === BOOKING_STATUS.CONFIRMED) {
    await notifyBookingConfirmed(populatedBooking._id.toString());
  }

  if (newStatus === BOOKING_STATUS.CANCELLED) {
    await notifyBookingCancelled(populatedBooking._id.toString());
  }

  if (newStatus === BOOKING_STATUS.COMPLETED) {
    await notifyBookingCompleted(populatedBooking._id.toString());
  }

  if (newStatus === BOOKING_STATUS.COMPLETED) {
    await awardLoyaltyPoints(bookingId, booking.customer.toString(), booking.totalAmount);
  }

  void recordAuditEvent({
    actor: currentUser,
    action: 'BOOKING_STATUS_CHANGED',
    entityType: 'Booking',
    entityId: bookingId,
    metadata: { status: newStatus },
  });

  return populatedBooking;
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

  if (currentUser.role !== USER_ROLES.CUSTOMER || booking.customer.toString() !== currentUser._id) {
    throw BOOKING_ERRORS.UNAUTHORIZED;
  }

  // Can only reschedule if booking is PENDING or CONFIRMED
  if (![BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED].includes(booking.status)) {
    throw { code: 'CANNOT_RESCHEDULE', message: 'Cannot reschedule completed, cancelled, or in-progress bookings' };
  }
  if (booking.status === BOOKING_STATUS.PENDING && isBookingHoldExpired(booking.holdExpiresAt)) {
    throw BOOKING_ERRORS.INVALID_STATUS_TRANSITION;
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
  const newDate = parseLocalCalendarDate(newAppointmentDate);
  if (!newDate || !isDateBookable(newDate, BOOKING_MIN_DAYS_AHEAD, BOOKING_MAX_DAYS_AHEAD)) {
    throw BOOKING_ERRORS.INVALID_DATE;
  }

  if (!isValidTimeFormat(newStartTime)) throw BOOKING_ERRORS.INVALID_TIME;
  // Validate new date and time are not in past
  if (isAppointmentInPast(newDate, newStartTime)) {
    throw BOOKING_ERRORS.DATE_IN_PAST;
  }

  // Get service (it might have changed, so always fetch fresh)
  const service = await Service.findById(booking.service._id);
  if (!service || !service.isActive || service.salon.toString() !== booking.salon._id.toString()) {
    throw BOOKING_ERRORS.INVALID_SERVICE;
  }
  const salon = await Salon.findOne({
    _id: booking.salon._id,
    isActive: true,
    isVerified: true,
  }).select('+openingHours capacity bookingLockVersion approvalStatus address');
  if (
    !salon ||
    !isSalonApproved(salon) ||
    !isSupportedSalonLocation(salon.address.city, salon.address.state)
  ) {
    throw BOOKING_ERRORS.INVALID_SALON;
  }
  const barber = await Barber.findOne({
    _id: booking.barber._id,
    salon: salon._id,
    isActive: true,
    isVerified: true,
    isAvailable: true,
  }).select('user services');
  const barberAccount = barber ? await User.findOne({
    _id: barber.user,
    role: USER_ROLES.BARBER,
    isActive: true,
  }).select('_id') : null;
  if (!barber || !barberAccount) throw BOOKING_ERRORS.INVALID_BARBER;
  if (!barber.services?.some((id: Types.ObjectId) => id.toString() === service._id.toString())) {
    throw BOOKING_ERRORS.BARBER_DOES_NOT_OFFER_SERVICE;
  }

  // Calculate new end time
  const newEndTime = calculateEndTime(newStartTime, service.duration);

  // Validate time format and range
  if (!isValidTimeRange(newStartTime, newEndTime)) {
    throw BOOKING_ERRORS.INVALID_TIME;
  }
  const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][newDate.getDay()];
  const dayHours = salon.openingHours?.[weekday as keyof typeof salon.openingHours];
  if (!dayHours || !isWithinOpeningHours(
    dayHours.isOpen,
    dayHours.openTime || '09:00',
    dayHours.closeTime || '18:00',
    newStartTime,
    service.duration,
    salon.slotIntervalMinutes,
  )) {
    throw BOOKING_ERRORS.SLOT_UNAVAILABLE;
  }
  const dayStart = new Date(newDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const activeLeave = await Leave.findOne({
    salon: salon._id,
    active: true,
    startDate: { $lt: dayEnd },
    endDate: { $gt: dayStart },
    $or: [{ barber: null }, { barber: barber._id }],
  }).select('_id');
  if (activeLeave) throw BOOKING_ERRORS.SLOT_UNAVAILABLE;

  const session = await mongoose.startSession();
  const transactionResult: { booking: IBooking | null } = { booking: null };
  try {
    await session.withTransaction(async () => {
      const transactionSalon = await lockEligibleSalonForBooking(salon._id, session);
      await releaseExpiredBookingHolds(transactionSalon._id, session);
      const currentBooking = await Booking.findById(bookingId).session(session);
      if (!currentBooking || currentBooking.customer.toString() !== currentUser._id) {
        throw BOOKING_ERRORS.UNAUTHORIZED;
      }
      if (
        ![BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED].includes(currentBooking.status) ||
        (currentBooking.status === BOOKING_STATUS.PENDING && isBookingHoldExpired(currentBooking.holdExpiresAt))
      ) {
        throw BOOKING_ERRORS.INVALID_STATUS_TRANSITION;
      }
      const transactionService = await Service.findOne({
        _id: currentBooking.service,
        salon: transactionSalon._id,
        isActive: true,
      }).session(session);
      const transactionBarber = await Barber.findOne({
        _id: currentBooking.barber,
        salon: transactionSalon._id,
        isActive: true,
        isVerified: true,
        isAvailable: true,
        services: currentBooking.service,
      }).session(session);
      const transactionBarberUser = transactionBarber ? await User.findOne({
        _id: transactionBarber.user,
        role: USER_ROLES.BARBER,
        isActive: true,
      }).session(session) : null;
      if (
        !transactionService ||
        transactionService.duration !== service.duration ||
        !transactionBarber ||
        !transactionBarberUser
      ) {
        throw BOOKING_ERRORS.INVALID_SERVICE;
      }
      const transactionWeekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][newDate.getDay()];
      const transactionHours = transactionSalon.openingHours?.[transactionWeekday as keyof typeof transactionSalon.openingHours];
      if (!transactionHours || !isWithinOpeningHours(
        transactionHours.isOpen,
        transactionHours.openTime || '09:00',
        transactionHours.closeTime || '18:00',
        newStartTime,
        transactionService.duration,
        transactionSalon.slotIntervalMinutes,
      )) {
        throw BOOKING_ERRORS.SLOT_UNAVAILABLE;
      }
      const transactionLeave = await Leave.findOne({
        salon: transactionSalon._id,
        active: true,
        startDate: { $lt: dayEnd },
        endDate: { $gt: dayStart },
        $or: [{ barber: null }, { barber: transactionBarber._id }],
      }).session(session);
      if (transactionLeave) throw BOOKING_ERRORS.SLOT_UNAVAILABLE;
      const activeFilter = activeBookingFilter();
      const existingBookings = await Booking.find({
        _id: { $ne: currentBooking._id },
        barber: currentBooking.barber,
        appointmentDate: { $gte: dayStart, $lt: dayEnd },
        ...activeFilter,
      }).session(session);

      if (existingBookings.some((existingBooking) =>
        isTimeOverlap(existingBooking.startTime, existingBooking.endTime, newStartTime, newEndTime))) {
        throw BOOKING_ERRORS.OVERLAPPING_BOOKING;
      }

      const salonCapacity = transactionSalon.capacity || 4;
      const salonBookings = await Booking.countDocuments({
        _id: { $ne: currentBooking._id },
        salon: transactionSalon._id,
        appointmentDate: { $gte: dayStart, $lt: dayEnd },
        ...activeFilter,
        startTime: { $lt: newEndTime },
        endTime: { $gt: newStartTime },
      }).session(session);
      if (salonBookings >= salonCapacity) {
        throw BOOKING_ERRORS.SLOT_UNAVAILABLE;
      }

      const updateFilter: Record<string, unknown> = {
        _id: currentBooking._id,
        customer: new Types.ObjectId(currentUser._id),
        status: currentBooking.status,
      };
      if (currentBooking.status === BOOKING_STATUS.PENDING) {
        updateFilter.holdExpiresAt = { $gt: new Date() };
      }
      transactionResult.booking = await Booking.findOneAndUpdate(
        updateFilter,
        { $set: { appointmentDate: newDate, startTime: newStartTime, endTime: newEndTime } },
        { new: true, runValidators: true, session },
      );
      if (!transactionResult.booking) throw BOOKING_ERRORS.INVALID_STATUS_TRANSITION;
    });
  } finally {
    await session.endSession();
  }

  void recordAuditEvent({
    actor: currentUser,
    action: 'BOOKING_RESCHEDULED',
    entityType: 'Booking',
    entityId: bookingId,
    metadata: { appointmentDate: newAppointmentDate, startTime: newStartTime },
  });

  if (!transactionResult.booking) throw BOOKING_ERRORS.BOOKING_NOT_FOUND;
  await notifyBookingRescheduled(
    bookingId,
    transactionResult.booking.appointmentDate,
    transactionResult.booking.startTime,
  );
  return transactionResult.booking.populate(['customer', 'salon', 'barber', 'service']);
}
