import mongoose, { Schema, Document, Types } from 'mongoose';
import {
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  PAYMENT_PROVIDER,
  PAYMENT_CURRENCY,
  type PaymentStatus,
  type PaymentMethod,
  type PaymentProvider,
  type PaymentCurrency,
} from '@/constants/booking';

interface IPayment extends Document {
  _id: Types.ObjectId;
  booking?: Types.ObjectId; // Reference to Booking
  membership?: Types.ObjectId;
  customer: Types.ObjectId; // Reference to User (CUSTOMER)
  amount: number; // in paise (INR * 100)
  currency: PaymentCurrency;
  method: PaymentMethod;
  provider: PaymentProvider;
  providerOrderId: string; // Order ID from payment provider (e.g., Razorpay)
  providerPaymentId?: string; // Payment ID from payment provider
  providerSignature?: string; // Signature for verification
  status: PaymentStatus;
  paidAt?: Date;
  refundAmount?: number; // in paise
  processedRefundIds: string[];
  activeBookingKey?: Types.ObjectId;
  refundRequestId?: string | null;
  refundRequestAmount?: number | null;
  refundProviderId?: string | null;
  refundRequestStatus?: 'REQUESTED' | 'PENDING' | 'UNKNOWN' | null;
  metadata?: Record<string, unknown>; // Additional payment provider data
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: false,
      index: true,
    },
    activeBookingKey: {
      type: Schema.Types.ObjectId,
      default: undefined,
    },
    membership: { type: Schema.Types.ObjectId, ref: 'CustomerMembership', default: null, index: true },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be at least 1 paise'],
    },
    currency: {
      type: String,
      enum: Object.values(PAYMENT_CURRENCY),
      default: PAYMENT_CURRENCY.INR,
      required: true,
    },
    method: {
      type: String,
      enum: Object.values(PAYMENT_METHOD),
      required: true,
    },
    provider: {
      type: String,
      enum: Object.values(PAYMENT_PROVIDER),
      required: true,
    },
    providerOrderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    providerPaymentId: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      index: true,
    },
    providerSignature: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    paidAt: { type: Date, default: null },
    refundAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    processedRefundIds: { type: [String], default: [] },
    refundRequestId: { type: String, default: null },
    refundRequestAmount: { type: Number, min: 1, default: null },
    refundProviderId: { type: String, default: null },
    refundRequestStatus: {
      type: String,
      enum: ['REQUESTED', 'PENDING', 'UNKNOWN', null],
      default: null,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

PaymentSchema.index({ activeBookingKey: 1 }, { unique: true, sparse: true });
PaymentSchema.index(
  { 'metadata.reconciliationRequired': 1, updatedAt: 1 },
  { partialFilterExpression: { 'metadata.reconciliationRequired': true } },
);
PaymentSchema.index({ refundRequestStatus: 1, updatedAt: 1 });

// Prevent OverwriteModelError
const Payment = mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema);

export type { IPayment };
export default Payment;
