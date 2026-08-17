import mongoose, { Schema, Document, Types } from 'mongoose';

export enum MembershipStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export interface IMembershipPlan extends Document {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  price: number; // Monthly price in paise
  duration: number; // Duration in months (1, 3, 6, 12)
  benefits: string[]; // Array of benefit descriptions
  discountPercentage?: number; // Additional booking discount (0-100)
  bonusPointsMultiplier?: number; // Multiplier for loyalty points (e.g., 1.5 = 150%)
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomerMembership extends Document {
  _id: Types.ObjectId;
  customer: Types.ObjectId; // Reference to User (CUSTOMER role)
  plan: Types.ObjectId; // Reference to MembershipPlan
  startDate: Date;
  expiryDate: Date;
  status: MembershipStatus;
  paymentId?: Types.ObjectId; // Reference to Payment
  autoRenew: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MembershipPlanSchema = new Schema<IMembershipPlan>(
  {
    name: {
      type: String,
      required: [true, 'Membership plan name is required'],
      trim: true,
      minlength: [3, 'Plan name must be at least 3 characters'],
      maxlength: [100, 'Plan name must not exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description must not exceed 500 characters'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [1, 'Price must be at least 1 paise'],
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      enum: [1, 3, 6, 12],
    },
    benefits: [
      {
        type: String,
        trim: true,
      },
    ],
    discountPercentage: {
      type: Number,
      default: 0,
      min: [0, 'Discount must be at least 0%'],
      max: [100, 'Discount must not exceed 100%'],
    },
    bonusPointsMultiplier: {
      type: Number,
      default: 1,
      min: [1, 'Multiplier must be at least 1'],
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

const CustomerMembershipSchema = new Schema<ICustomerMembership>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    plan: {
      type: Schema.Types.ObjectId,
      ref: 'MembershipPlan',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    expiryDate: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(MembershipStatus),
      default: MembershipStatus.ACTIVE,
      index: true,
    },
    paymentId: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    autoRenew: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Indexes for efficient queries
MembershipPlanSchema.index({ active: 1 });
CustomerMembershipSchema.index({ customer: 1, expiryDate: 1 });
CustomerMembershipSchema.index({ status: 1, expiryDate: 1 });

const MembershipPlan =
  mongoose.models.MembershipPlan || mongoose.model<IMembershipPlan>('MembershipPlan', MembershipPlanSchema);

const CustomerMembership =
  mongoose.models.CustomerMembership || mongoose.model<ICustomerMembership>('CustomerMembership', CustomerMembershipSchema);

export { MembershipPlan, CustomerMembership };
