import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICouponUsage extends Document {
  _id: Types.ObjectId;
  coupon: Types.ObjectId;
  customer: Types.ObjectId;
  booking?: Types.ObjectId;
  usedAt: Date;
}

const CouponUsageSchema = new Schema<ICouponUsage>(
  {
    coupon: { type: Schema.Types.ObjectId, ref: 'Coupon', required: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    booking: { type: Schema.Types.ObjectId, ref: 'Booking', default: null, index: true },
    usedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

CouponUsageSchema.index({ coupon: 1, customer: 1, booking: 1 }, { unique: true });
CouponUsageSchema.index({ customer: 1, usedAt: -1 });

const CouponUsage = mongoose.models.CouponUsage || mongoose.model<ICouponUsage>('CouponUsage', CouponUsageSchema);
export default CouponUsage;
