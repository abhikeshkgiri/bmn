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
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  bookingType: BookingType;
  customerNotes?: string;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
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
    bookingType: {
      type: String,
      enum: Object.values(BOOKING_TYPE),
      required: true,
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

// Prevent OverwriteModelError
const Booking = mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);

export type { IBooking };
export default Booking;
