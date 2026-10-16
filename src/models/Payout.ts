import mongoose, { Document, Schema, Types } from 'mongoose';

export enum PayoutStatus {
  ELIGIBLE = 'ELIGIBLE',
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
}

export interface IPayout extends Document {
  _id: Types.ObjectId;
  commission: Types.ObjectId;
  booking: Types.ObjectId;
  recipient: Types.ObjectId;
  amount: number;
  commissionDeducted: number;
  status: PayoutStatus;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutSchema = new Schema<IPayout>({
  commission: { type: Schema.Types.ObjectId, ref: 'Commission', required: true, unique: true, index: true },
  booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  amount: { type: Number, required: true, min: 0 },
  commissionDeducted: { type: Number, required: true, min: 0 },
  status: { type: String, enum: Object.values(PayoutStatus), default: PayoutStatus.ELIGIBLE, index: true },
  paidAt: { type: Date, default: null },
}, { timestamps: true });

PayoutSchema.index({ status: 1, createdAt: -1 });
const Payout = mongoose.models.Payout || mongoose.model<IPayout>('Payout', PayoutSchema);
export default Payout;
