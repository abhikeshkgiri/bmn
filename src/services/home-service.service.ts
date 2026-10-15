import { Types } from 'mongoose';
import Booking, { HomeServiceStatus, type IBooking } from '@/models/Booking';
import Barber from '@/models/Barber';
import Salon from '@/models/Salon';
import Service from '@/models/Service';
import CustomerAddress from '@/models/CustomerAddress';
import Leave from '@/models/Leave';
import { connectDB } from '@/lib/db';
import type { AuthUser } from '@/types';
import { BOOKING_STATUS, BOOKING_TYPE, PAYMENT_STATUS } from '@/constants/booking';
import { calculateCheckoutPrice } from '@/services/pricing.service';
import { generateBookingNumber } from '@/services/booking.service';
import { generateOtp, hashOtp, verifyOtpHash } from '@/services/auth.service';
import { sendOtp } from '@/lib/otp-provider';
import { recordAuditEvent } from '@/services/audit.service';
import { isFeature22DemoRecord } from '@/utils/transaction-eligibility';
import { isFeature22Booking } from '@/services/demo-booking-guard.service';
import {
  notifyBookingCancelled,
  notifyBookingCompleted,
  notifyBookingCreated,
  runNotificationSafely,
} from '@/services/notification.service';

const REQUEST_TIMEOUT_MINUTES = Number(process.env.HOME_SERVICE_REQUEST_TIMEOUT_MINUTES ?? 15);
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

export const HOME_SERVICE_ERRORS = {
  INVALID_REQUEST: { code: 'INVALID_HOME_SERVICE_REQUEST', message: 'Invalid home-service request' },
  ADDRESS_NOT_OWNED: { code: 'ADDRESS_NOT_OWNED', message: 'Address does not belong to the customer' },
  LOCATION_REQUIRED: { code: 'LOCATION_REQUIRED', message: 'A saved address with coordinates is required' },
  OUTSIDE_SERVICE_AREA: { code: 'OUTSIDE_SERVICE_AREA', message: 'This address is outside the barber service area' },
  BARBER_UNAVAILABLE: { code: 'BARBER_UNAVAILABLE', message: 'Barber is unavailable for this request' },
  DEMO_TRANSACTION_NOT_ALLOWED: { code: 'DEMO_TRANSACTION_NOT_ALLOWED', message: 'Demo listings cannot be booked' },
  INVALID_TRANSITION: { code: 'INVALID_HOME_SERVICE_TRANSITION', message: 'Invalid home-service state transition' },
  OTP_INVALID: { code: 'INVALID_START_OTP', message: 'Invalid or expired service OTP' },
  OTP_LIMIT: { code: 'START_OTP_ATTEMPTS_EXCEEDED', message: 'Too many OTP attempts' },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', message: 'Not authorized for this home-service booking' },
} as const;

type Coordinates = { latitude: number; longitude: number };

export function calculateHomeServiceDistanceKm(from: Coordinates, to: Coordinates): number {
  const earthRadius = 6371;
  const latDelta = ((to.latitude - from.latitude) * Math.PI) / 180;
  const lngDelta = ((to.longitude - from.longitude) * Math.PI) / 180;
  const a = Math.sin(latDelta / 2) ** 2 + Math.cos((from.latitude * Math.PI) / 180) * Math.cos((to.latitude * Math.PI) / 180) * Math.sin(lngDelta / 2) ** 2;
  return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isValidHomeServiceTransition(from: HomeServiceStatus, to: HomeServiceStatus): boolean {
  return transitions[from]?.includes(to) ?? false;
}

function activeHomeServiceStatuses() {
  return [HomeServiceStatus.REQUESTED, HomeServiceStatus.ACCEPTED, HomeServiceStatus.ON_THE_WAY, HomeServiceStatus.ARRIVED, HomeServiceStatus.SERVICE_STARTED];
}

async function expireStaleRequests() {
  const staleFilter = {
    bookingType: BOOKING_TYPE.HOME_SERVICE,
    homeServiceStatus: HomeServiceStatus.REQUESTED,
    requestedAt: { $lt: new Date(Date.now() - REQUEST_TIMEOUT_MINUTES * 60 * 1000) },
  };
  const staleBookings = await Booking.find(staleFilter).select('_id salon barber service');
  const eligibleBookingIds: Types.ObjectId[] = [];
  for (const booking of staleBookings) {
    if (!await isFeature22Booking(booking)) eligibleBookingIds.push(booking._id);
  }
  if (eligibleBookingIds.length > 0) {
    await Booking.updateMany(
      { ...staleFilter, _id: { $in: eligibleBookingIds } },
      { $set: { homeServiceStatus: HomeServiceStatus.EXPIRED, status: BOOKING_STATUS.CANCELLED, cancellationReason: 'Home-service request expired' } },
    );
  }
}

export async function createHomeServiceBooking(input: {
  currentUser: AuthUser;
  salonId: string;
  barberId: string;
  serviceId: string;
  addressId: string;
  appointmentDate: string;
  startTime: string;
  customerNotes?: string;
  couponCode?: string;
  loyaltyPoints?: number;
}): Promise<IBooking> {
  await connectDB();
  if (input.currentUser.role !== 'CUSTOMER') throw HOME_SERVICE_ERRORS.UNAUTHORIZED;
  if (![input.salonId, input.barberId, input.serviceId, input.addressId].every(Types.ObjectId.isValid)) throw HOME_SERVICE_ERRORS.INVALID_REQUEST;

  const [salon, barber, service, address] = await Promise.all([
    Salon.findOne({ _id: input.salonId, isActive: true, demoKey: { $not: /^feature22:/ } }).select('location bookingLockVersion +demoKey'),
    Barber.findOne({ _id: input.barberId, salon: input.salonId, isActive: true, isAvailable: true, offersHomeService: true, demoKey: { $not: /^feature22:/ } }).select('salon homeServiceRadius services user +demoKey'),
    Service.findOne({ _id: input.serviceId, salon: input.salonId, isActive: true, demoKey: { $not: /^feature22:/ } }).select('duration +demoKey'),
    CustomerAddress.findOne({ _id: input.addressId, customer: input.currentUser._id }),
  ]);
  if (!salon || !barber || !service) throw HOME_SERVICE_ERRORS.BARBER_UNAVAILABLE;
  if (isFeature22DemoRecord(salon.demoKey, barber.demoKey, service.demoKey)) {
    throw HOME_SERVICE_ERRORS.DEMO_TRANSACTION_NOT_ALLOWED;
  }
  if (!address) throw HOME_SERVICE_ERRORS.ADDRESS_NOT_OWNED;
  if (address.latitude === undefined || address.longitude === undefined || !salon.location?.coordinates) throw HOME_SERVICE_ERRORS.LOCATION_REQUIRED;
  if (!(barber.services ?? []).some((id: Types.ObjectId) => id.toString() === input.serviceId)) throw HOME_SERVICE_ERRORS.BARBER_UNAVAILABLE;

  const customerLocation = { latitude: address.latitude, longitude: address.longitude };
  const salonLocation = { latitude: salon.location.coordinates[1], longitude: salon.location.coordinates[0] };
  const radius = barber.homeServiceRadius ?? 10;
  if (calculateHomeServiceDistanceKm(customerLocation, salonLocation) > radius) throw HOME_SERVICE_ERRORS.OUTSIDE_SERVICE_AREA;

  const appointmentDate = new Date(input.appointmentDate);
  if (Number.isNaN(appointmentDate.getTime())) throw HOME_SERVICE_ERRORS.INVALID_REQUEST;
  const price = await calculateCheckoutPrice({ salonId: input.salonId, serviceId: input.serviceId, customerId: input.currentUser._id, couponCode: input.couponCode, loyaltyPoints: input.loyaltyPoints });
  const endMinutes = Number(input.startTime.split(':')[0]) * 60 + Number(input.startTime.split(':')[1]) + service.duration;
  const endTime = `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`;
  const session = await (await import('mongoose')).default.startSession();
  let createdId: Types.ObjectId | null = null;
  try {
    await session.withTransaction(async () => {
      const salonLock = await Salon.updateOne(
        { _id: input.salonId, isActive: true, demoKey: { $not: /^feature22:/ } },
        { $inc: { bookingLockVersion: 1 } },
        { session },
      );
      const barberLock = await Barber.updateOne(
        { _id: input.barberId, salon: input.salonId, isActive: true, isAvailable: true, offersHomeService: true, demoKey: { $not: /^feature22:/ } },
        { $inc: { bookingLockVersion: 1 } },
        { session },
      );
      const currentService = await Service.exists({
        _id: input.serviceId,
        salon: input.salonId,
        isActive: true,
        demoKey: { $not: /^feature22:/ },
      }).session(session);
      if (salonLock.matchedCount !== 1 || barberLock.matchedCount !== 1 || !currentService) {
        throw HOME_SERVICE_ERRORS.BARBER_UNAVAILABLE;
      }
      const dayStart = new Date(appointmentDate.toDateString());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const onLeave = await Leave.exists({ salon: input.salonId, active: true, startDate: { $lt: dayEnd }, endDate: { $gt: dayStart }, $or: [{ barber: null }, { barber: input.barberId }] }).session(session);
      if (onLeave) throw HOME_SERVICE_ERRORS.BARBER_UNAVAILABLE;
      const overlap = await Booking.exists({ barber: input.barberId, appointmentDate: { $gte: dayStart, $lt: dayEnd }, startTime: { $lt: endTime }, endTime: { $gt: input.startTime }, status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.IN_PROGRESS, BOOKING_STATUS.PENDING] } }).session(session);
      if (overlap) throw HOME_SERVICE_ERRORS.BARBER_UNAVAILABLE;
      const booking = await Booking.create([{
        bookingNumber: await generateBookingNumber(session), customer: input.currentUser._id, salon: input.salonId, barber: input.barberId, service: input.serviceId,
        appointmentDate, startTime: input.startTime, endTime, duration: service.duration, servicePrice: price.servicePrice, discountAmount: price.discountAmount, taxAmount: price.taxAmount, totalAmount: price.totalAmount,
        couponCode: price.couponCode, loyaltyPointsRedeemed: price.loyaltyPoints, membershipDiscountAmount: price.membershipDiscount, status: BOOKING_STATUS.PENDING, paymentStatus: PAYMENT_STATUS.PENDING,
        holdExpiresAt: new Date(Date.now() + REQUEST_TIMEOUT_MINUTES * 60 * 1000), bookingType: BOOKING_TYPE.HOME_SERVICE, customerAddress: input.addressId, serviceLocation: customerLocation, homeServiceRadius: radius,
        homeServiceStatus: HomeServiceStatus.REQUESTED, requestedAt: new Date(), customerNotes: input.customerNotes || null,
      }], { session });
      createdId = booking[0]._id;
    });
  } finally {
    await session.endSession();
  }
  if (!createdId) throw HOME_SERVICE_ERRORS.INVALID_REQUEST;
  const created = await Booking.findById(createdId);
  if (!created) throw HOME_SERVICE_ERRORS.INVALID_REQUEST;
  await runNotificationSafely('home-service-booking-created', () =>
    notifyBookingCreated(created._id.toString()),
  );
  return created;
}

async function getAuthorizedBooking(id: string, actor: AuthUser) {
  await expireStaleRequests();
  const booking = await Booking.findOne({ _id: id, bookingType: BOOKING_TYPE.HOME_SERVICE }).select('+startOtpHash +startOtpExpiresAt +startOtpAttempts');
  if (!booking) throw HOME_SERVICE_ERRORS.INVALID_REQUEST;
  const barber = await Barber.findById(booking.barber).select('user');
  const allowed = actor.role === 'ADMIN' || actor.role === 'SUPER_ADMIN' || booking.customer.toString() === actor._id || barber?.user?.toString() === actor._id;
  if (!allowed) throw HOME_SERVICE_ERRORS.UNAUTHORIZED;
  if (isFeature22DemoRecord(
    (await Salon.findById(booking.salon).select('+demoKey'))?.demoKey,
    (await Barber.findById(booking.barber).select('+demoKey'))?.demoKey,
    (await Service.findById(booking.service).select('+demoKey'))?.demoKey,
  )) {
    throw HOME_SERVICE_ERRORS.DEMO_TRANSACTION_NOT_ALLOWED;
  }
  return booking;
}

const transitions: Record<string, HomeServiceStatus[]> = {
  [HomeServiceStatus.REQUESTED]: [HomeServiceStatus.ACCEPTED, HomeServiceStatus.REJECTED, HomeServiceStatus.CANCELLED],
  [HomeServiceStatus.ACCEPTED]: [HomeServiceStatus.ON_THE_WAY, HomeServiceStatus.CANCELLED],
  [HomeServiceStatus.ON_THE_WAY]: [HomeServiceStatus.ARRIVED, HomeServiceStatus.CANCELLED],
  [HomeServiceStatus.ARRIVED]: [HomeServiceStatus.SERVICE_STARTED, HomeServiceStatus.CANCELLED],
  [HomeServiceStatus.SERVICE_STARTED]: [HomeServiceStatus.SERVICE_COMPLETED],
};

export async function transitionHomeService(actor: AuthUser, id: string, next: HomeServiceStatus) {
  const booking = await getAuthorizedBooking(id, actor);
  const barber = await Barber.findById(booking.barber).select('user');
  const barberAction = actor.role === 'BARBER' && barber?.user?.toString() === actor._id;
  if (next === HomeServiceStatus.CANCELLED && booking.customer.toString() === actor._id) {
    if (![HomeServiceStatus.REQUESTED, HomeServiceStatus.ACCEPTED, HomeServiceStatus.ON_THE_WAY, HomeServiceStatus.ARRIVED].includes(booking.homeServiceStatus as HomeServiceStatus)) throw HOME_SERVICE_ERRORS.INVALID_TRANSITION;
  } else if (!barberAction && actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN') {
    throw HOME_SERVICE_ERRORS.UNAUTHORIZED;
  }
  if (!isValidHomeServiceTransition(booking.homeServiceStatus as HomeServiceStatus, next)) throw HOME_SERVICE_ERRORS.INVALID_TRANSITION;
  if (next === HomeServiceStatus.SERVICE_STARTED || next === HomeServiceStatus.SERVICE_COMPLETED) throw HOME_SERVICE_ERRORS.INVALID_TRANSITION;
  const timestamp: Record<string, Date> = { ACCEPTED: new Date(), ON_THE_WAY: new Date(), ARRIVED: new Date(), CANCELLED: new Date() };
  const timestampField: Record<string, string> = { ACCEPTED: 'acceptedAt', ON_THE_WAY: 'onTheWayAt', ARRIVED: 'arrivedAt' };
  const updated = await Booking.findOneAndUpdate({ _id: id, homeServiceStatus: booking.homeServiceStatus }, { $set: { homeServiceStatus: next, ...([HomeServiceStatus.CANCELLED, HomeServiceStatus.REJECTED].includes(next) ? { status: BOOKING_STATUS.CANCELLED } : {}), ...(timestampField[next] && timestamp[next] ? { [timestampField[next]]: timestamp[next] } : {}) } }, { new: true });
  if (!updated) throw HOME_SERVICE_ERRORS.INVALID_TRANSITION;
  if (next === HomeServiceStatus.CANCELLED || next === HomeServiceStatus.REJECTED) {
    await runNotificationSafely('home-service-booking-cancelled', () =>
      notifyBookingCancelled(id),
    );
  }
  await recordAuditEvent({ actor, action: `HOME_SERVICE_${next}`, entityType: 'Booking', entityId: id });
  return updated;
}

export async function completeHomeService(actor: AuthUser, id: string) {
  const booking = await getAuthorizedBooking(id, actor);
  const barber = await Barber.findById(booking.barber).select('user');
  if (actor.role !== 'BARBER' || barber?.user?.toString() !== actor._id) throw HOME_SERVICE_ERRORS.UNAUTHORIZED;
  if (booking.homeServiceStatus !== HomeServiceStatus.SERVICE_STARTED) throw HOME_SERVICE_ERRORS.INVALID_TRANSITION;
  const updated = await Booking.findOneAndUpdate(
    { _id: id, homeServiceStatus: HomeServiceStatus.SERVICE_STARTED },
    { $set: { homeServiceStatus: HomeServiceStatus.SERVICE_COMPLETED, status: BOOKING_STATUS.COMPLETED, completedAt: new Date() }, $unset: { latestBarberLocation: 1 } },
    { new: true },
  );
  if (!updated) throw HOME_SERVICE_ERRORS.INVALID_TRANSITION;
  await runNotificationSafely('home-service-booking-completed', () =>
    notifyBookingCompleted(id),
  );
  await recordAuditEvent({ actor, action: 'HOME_SERVICE_COMPLETED', entityType: 'Booking', entityId: id });
  return updated;
}

export async function issueStartOtp(actor: AuthUser, id: string) {
  const booking = await getAuthorizedBooking(id, actor);
  if (actor.role !== 'CUSTOMER' || booking.customer.toString() !== actor._id || booking.homeServiceStatus !== HomeServiceStatus.ARRIVED) throw HOME_SERVICE_ERRORS.UNAUTHORIZED;
  const customer = await (await import('@/models/User')).default.findById(actor._id).select('phone');
  if (!customer) throw HOME_SERVICE_ERRORS.UNAUTHORIZED;
  const otp = generateOtp();
  await Booking.updateOne({ _id: id }, { $set: { startOtpHash: hashOtp(otp), startOtpExpiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000), startOtpAttempts: 0 } });
  await sendOtp(customer.phone, otp);
  return { sent: true, expiresInSeconds: OTP_EXPIRY_MINUTES * 60 };
}

export async function verifyStartOtp(actor: AuthUser, id: string, otp: string) {
  const booking = await getAuthorizedBooking(id, actor);
  const barber = await Barber.findById(booking.barber).select('user');
  if (actor.role !== 'BARBER' || barber?.user?.toString() !== actor._id || booking.homeServiceStatus !== HomeServiceStatus.ARRIVED) throw HOME_SERVICE_ERRORS.UNAUTHORIZED;
  if ((booking.startOtpAttempts ?? 0) >= MAX_OTP_ATTEMPTS) throw HOME_SERVICE_ERRORS.OTP_LIMIT;
  const valid = Boolean(booking.startOtpHash && booking.startOtpExpiresAt && booking.startOtpExpiresAt > new Date() && /^\d{6}$/.test(otp) && verifyOtpHash(otp, booking.startOtpHash));
  if (!valid) {
    await Booking.updateOne({ _id: id }, { $inc: { startOtpAttempts: 1 } });
    throw HOME_SERVICE_ERRORS.OTP_INVALID;
  }
  const updated = await Booking.findOneAndUpdate({ _id: id, homeServiceStatus: HomeServiceStatus.ARRIVED }, { $set: { homeServiceStatus: HomeServiceStatus.SERVICE_STARTED, serviceStartedAt: new Date() }, $unset: { startOtpHash: 1, startOtpExpiresAt: 1 } }, { new: true });
  if (!updated) throw HOME_SERVICE_ERRORS.INVALID_TRANSITION;
  return updated;
}

export async function updateBarberLocation(actor: AuthUser, id: string, location: Coordinates) {
  const booking = await getAuthorizedBooking(id, actor);
  const barber = await Barber.findById(booking.barber).select('user');
  if (actor.role !== 'BARBER' || barber?.user?.toString() !== actor._id || !activeHomeServiceStatuses().includes(booking.homeServiceStatus as HomeServiceStatus)) throw HOME_SERVICE_ERRORS.UNAUTHORIZED;
  if (!Number.isFinite(location.latitude) || !Number.isFinite(location.longitude) || location.latitude < -90 || location.latitude > 90 || location.longitude < -180 || location.longitude > 180) throw HOME_SERVICE_ERRORS.INVALID_REQUEST;
  return Booking.findOneAndUpdate({ _id: id, bookingType: BOOKING_TYPE.HOME_SERVICE }, { $set: { latestBarberLocation: { ...location, updatedAt: new Date() } } }, { new: true }).select('latestBarberLocation homeServiceStatus');
}

export async function getHomeServiceBooking(actor: AuthUser, id: string) {
  const booking = await getAuthorizedBooking(id, actor);
  if (booking.homeServiceStatus === HomeServiceStatus.SERVICE_COMPLETED) booking.latestBarberLocation = undefined;
  return booking.populate(['customerAddress', 'barber', 'service']);
}

export async function listHomeServiceRequests(actor: AuthUser) {
  await expireStaleRequests();
  if (actor.role !== 'BARBER') throw HOME_SERVICE_ERRORS.UNAUTHORIZED;
  const barber = await Barber.findOne({ user: actor._id }).select('_id');
  if (!barber) throw HOME_SERVICE_ERRORS.UNAUTHORIZED;
  return Booking.find({ barber: barber._id, bookingType: BOOKING_TYPE.HOME_SERVICE, homeServiceStatus: { $in: activeHomeServiceStatuses() } }).sort({ appointmentDate: 1, startTime: 1 }).populate(['customerAddress', 'service']);
}
