import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILeave extends Document {
  _id: Types.ObjectId;
  salon: Types.ObjectId;
  barber?: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  reason?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveSchema = new Schema<ILeave>({
  salon: { type: Schema.Types.ObjectId, ref: 'Salon', required: true, index: true },
  barber: { type: Schema.Types.ObjectId, ref: 'Barber', default: null, index: true },
  startDate: { type: Date, required: true, index: true },
  endDate: { type: Date, required: true, index: true },
  reason: { type: String, trim: true, maxlength: 300 },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true });

LeaveSchema.index({ salon: 1, barber: 1, active: 1, startDate: 1, endDate: 1 });
const Leave = mongoose.models.Leave || mongoose.model<ILeave>('Leave', LeaveSchema);
export default Leave;
