import mongoose, { Schema, Document, Types } from 'mongoose';

export enum CouponType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export enum CouponStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
}

export interface IApplicable {
  salons?: Types.ObjectId[]; // Specific salons, empty means all
  services?: Types.ObjectId[]; // Specific services, empty means all
  customers?: Types.ObjectId[]; // Specific customers, empty means all
}

export interface ICoupon extends Document {
  _id: Types.ObjectId;
  code: string; // Unique coupon code (WELCOME50, PROMO100, etc.)
  description?: string;
  discountType: CouponType; // PERCENTAGE | FIXED
  discountValue: number; // 20 for 20% or 100 for ₹100
  minimumOrderValue?: number; // Minimum booking amount in paise
  maximumDiscount?: number; // Maximum discount in paise (for percentage discounts)
  startDate: Date;
  expiryDate: Date;
  usageLimit?: number; // Maximum total uses (null = unlimited)
  perUserLimit?: number; // Maximum uses per customer (null = unlimited)
  usedCount: number; // Current usage count
  applicable: IApplicable; // Which salons/services/customers can use this
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicableSchema = new Schema<IApplicable>(
  {
    salons: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Salon',
      },
    ],
    services: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Service',
      },
    ],
    customers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { _id: false }
);

const CouponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      minlength: [3, 'Coupon code must be at least 3 characters'],
      maxlength: [50, 'Coupon code must not exceed 50 characters'],
      match: [/^[A-Z0-9_-]+$/, 'Coupon code can only contain uppercase letters, numbers, hyphens, and underscores'],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Description must not exceed 200 characters'],
    },
    discountType: {
      type: String,
      enum: Object.values(CouponType),
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: [1, 'Discount value must be at least 1'],
    },
    minimumOrderValue: {
      type: Number,
      default: 0,
      min: [0, 'Minimum order value must be at least 0'],
    },
    maximumDiscount: {
      type: Number,
      default: null,
      min: [0, 'Maximum discount must be at least 0'],
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
    usageLimit: {
      type: Number,
      default: null,
      min: [1, 'Usage limit must be at least 1'],
    },
    perUserLimit: {
      type: Number,
      default: null,
      min: [1, 'Per-user limit must be at least 1'],
    },
    usedCount: {
      type: Number,
      default: 0,
      min: [0, 'Used count cannot be negative'],
    },
    applicable: {
      type: ApplicableSchema,
      default: { salons: [], services: [], customers: [] },
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Index for finding valid coupons
CouponSchema.index({ code: 1, active: 1, startDate: 1, expiryDate: 1 });
// Index for user coupon usage tracking
CouponSchema.index({ 'applicable.customers': 1, active: 1 });
// Index for salon-specific coupons
CouponSchema.index({ 'applicable.salons': 1, active: 1 });

const Coupon = mongoose.models.Coupon || mongoose.model<ICoupon>('Coupon', CouponSchema);

export default Coupon;
