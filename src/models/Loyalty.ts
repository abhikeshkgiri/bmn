import mongoose, { Schema, Document, Types } from 'mongoose';

export enum TransactionType {
  EARN = 'EARN',
  REDEEM = 'REDEEM',
  EXPIRE = 'EXPIRE',
  ADJUSTMENT = 'ADJUSTMENT',
  REFUND_REVERSAL = 'REFUND_REVERSAL',
}

export interface ILoyaltyAccount extends Document {
  _id: Types.ObjectId;
  customer: Types.ObjectId; // Reference to User (CUSTOMER role)
  pointsBalance: number; // Current available points
  lifetimePoints: number; // Total points ever earned
  redeemedPoints: number; // Total points redeemed
  createdAt: Date;
  updatedAt: Date;
}

export interface ILoyaltyTransaction extends Document {
  _id: Types.ObjectId;
  account: Types.ObjectId; // Reference to LoyaltyAccount
  customer: Types.ObjectId; // Denormalized for query efficiency
  transactionType: TransactionType;
  points: number; // Points added (positive) or removed (negative)
  reason: string; // Reason for transaction (booking completed, redemption, etc.)
  bookingId?: Types.ObjectId; // Reference to Booking if transaction relates to booking
  description?: string; // Optional description
  createdAt: Date;
}

const LoyaltyAccountSchema = new Schema<ILoyaltyAccount>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    pointsBalance: {
      type: Number,
      default: 0,
      min: [0, 'Points balance cannot be negative'],
    },
    lifetimePoints: {
      type: Number,
      default: 0,
      min: [0, 'Lifetime points cannot be negative'],
    },
    redeemedPoints: {
      type: Number,
      default: 0,
      min: [0, 'Redeemed points cannot be negative'],
    },
  },
  { timestamps: true }
);

const LoyaltyTransactionSchema = new Schema<ILoyaltyTransaction>(
  {
    account: {
      type: Schema.Types.ObjectId,
      ref: 'LoyaltyAccount',
      required: true,
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    transactionType: {
      type: String,
      enum: Object.values(TransactionType),
      required: true,
      index: true,
    },
    points: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
LoyaltyAccountSchema.index({ customer: 1 });
LoyaltyTransactionSchema.index({ customer: 1, createdAt: -1 });
LoyaltyTransactionSchema.index({ account: 1, createdAt: -1 });

const LoyaltyAccount =
  mongoose.models.LoyaltyAccount || mongoose.model<ILoyaltyAccount>('LoyaltyAccount', LoyaltyAccountSchema);

const LoyaltyTransaction =
  mongoose.models.LoyaltyTransaction || mongoose.model<ILoyaltyTransaction>('LoyaltyTransaction', LoyaltyTransactionSchema);

export { LoyaltyAccount, LoyaltyTransaction };
