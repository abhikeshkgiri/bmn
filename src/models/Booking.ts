import mongoose, { Schema, Document, Types } from 'mongoose';
import {
  BOOKING_STATUS,
  BOOKING_TYPE,
  PAYMENT_STATUS,
  type BookingStatus,
  type BookingType,
  type PaymentStatus,
} from '@/constants/booking';

interface IBooking extends Document {
  _id: Types.ObjectId;
  bookingNumber: string;
  customer: Types.ObjectId; // Reference to User (CUSTOMER role)
  salon: Types.ObjectId; // Reference to Salon
  barber: Types.ObjectId; // Reference to Barber
  service: Types.ObjectId; // Reference to Service
  appointmentDate: Date;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  duration: number; // in minutes
  servicePrice: number; // in paise
  discountAmount?: number; // in paise
  taxAmount?: number; // in paise
  totalAmount: number; // in paise
  couponCode?: string;
  loyaltyPointsRedeemed?: number;
  membershipDiscountAmount?: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  holdExpiresAt?: Date;
  bookingType: BookingType;
  customerAddress?: Types.ObjectId;
  serviceLocation?: { latitude: number; longitude: number };
  homeServiceRadius?: number;
  homeServiceStatus?: HomeServiceStatus;
  requestedAt?: Date;
  acceptedAt?: Date;
  onTheWayAt?: Date;
  arrivedAt?: Date;
  serviceStartedAt?: Date;
  completedAt?: Date;
  startOtpHash?: string;
  startOtpExpiresAt?: Date;
  startOtpAttempts?: number;
  latestBarberLocation?: { latitude: number; longitude: number; updatedAt: Date };
  customerNotes?: string;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum HomeServiceStatus {
  REQUESTED = 'REQUESTED',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  ON_THE_WAY = 'ON_THE_WAY',
  ARRIVED = 'ARRIVED',
  SERVICE_STARTED = 'SERVICE_STARTED',
  SERVICE_COMPLETED = 'SERVICE_COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

const BookingSchema = new Schema<IBooking>(
  {
    bookingNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    salon: {
      type: Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
      index: true,
    },
    barber: {
      type: Schema.Types.ObjectId,
      ref: 'Barber',
      required: true,
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    appointmentDate: {
      type: Date,
      required: true,
      index: true,
    },
    startTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:MM format'],
    },
    endTime: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):([0-5]\d)$/, 'End time must be in HH:MM format'],
    },
    duration: {
      type: Number,
      required: true,
      min: [15, 'Duration must be at least 15 minutes'],
      max: [480, 'Duration must not exceed 480 minutes'],
    },
    servicePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    couponCode: { type: String, default: null, trim: true },
    loyaltyPointsRedeemed: { type: Number, default: 0, min: 0 },
    membershipDiscountAmount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: Object.values(BOOKING_STATUS),
      default: BOOKING_STATUS.PENDING,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    holdExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    bookingType: {
      type: String,
      enum: Object.values(BOOKING_TYPE),
      required: true,
    },
    customerAddress: { type: Schema.Types.ObjectId, ref: 'CustomerAddress', default: null, index: true },
    serviceLocation: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
    },
    homeServiceRadius: { type: Number, min: 0 },
    homeServiceStatus: { type: String, enum: Object.values(HomeServiceStatus), default: null, index: true },
    requestedAt: { type: Date, default: null, index: true },
    acceptedAt: { type: Date, default: null },
    onTheWayAt: { type: Date, default: null },
    arrivedAt: { type: Date, default: null },
    serviceStartedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    startOtpHash: { type: String, default: null, select: false },
    startOtpExpiresAt: { type: Date, default: null, select: false },
    startOtpAttempts: { type: Number, default: 0, min: 0, select: false },
    latestBarberLocation: {
      latitude: { type: Number, min: -90, max: 90 },
      longitude: { type: Number, min: -180, max: 180 },
      updatedAt: { type: Date },
    },
    customerNotes: {
      type: String,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for optimal query performance
// For fetching bookings by salon + date + status (capacity checks)
BookingSchema.index({ salon: 1, appointmentDate: 1, status: 1 });
// For fetching bookings by barber + date + status (conflict checks)
BookingSchema.index({ barber: 1, appointmentDate: 1, status: 1 });
// For fetching customer bookings
BookingSchema.index({ customer: 1, appointmentDate: 1 });
BookingSchema.index({ salon: 1, appointmentDate: 1, holdExpiresAt: 1 });
BookingSchema.index({ bookingType: 1, homeServiceStatus: 1, appointmentDate: 1 });
BookingSchema.index({ barber: 1, bookingType: 1, homeServiceStatus: 1, appointmentDate: 1 });

// Prevent OverwriteModelError
const Booking = mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);

export type { IBooking };
export default Booking;
