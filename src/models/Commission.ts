import mongoose, { Document, Schema, Types } from 'mongoose';

export enum CommissionStatus {
  PENDING = 'PENDING',
  EARNED = 'EARNED',
  VOID = 'VOID',
}

export interface ICommission extends Document {
  _id: Types.ObjectId;
  booking: Types.ObjectId;
  bookingAmount: number;
  platformCommission: number;
  recipientEarning: number;
  rate: number;
  status: CommissionStatus;
  createdAt: Date;
  updatedAt: Date;
}

const CommissionSchema = new Schema<ICommission>({
  booking: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true, index: true },
  bookingAmount: { type: Number, required: true, min: 0 },
  platformCommission: { type: Number, required: true, min: 0 },
  recipientEarning: { type: Number, required: true, min: 0 },
  rate: { type: Number, required: true, min: 0, max: 100 },
  status: { type: String, enum: Object.values(CommissionStatus), default: CommissionStatus.PENDING, index: true },
}, { timestamps: true });

CommissionSchema.index({ status: 1, createdAt: -1 });
const Commission = mongoose.models.Commission || mongoose.model<ICommission>('Commission', CommissionSchema);
export default Commission;
