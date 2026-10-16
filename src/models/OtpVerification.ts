import mongoose, { Schema, Document, Types } from 'mongoose';

interface IOtpVerification extends Document {
  _id: Types.ObjectId;
  phone: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  verified: boolean;
  signupRole?: 'CUSTOMER' | 'SALON_OWNER';
  createdAt: Date;
  updatedAt: Date;
}

const OtpVerificationSchema = new Schema<IOtpVerification>(
  {
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      index: true,
      trim: true,
    },
    otpHash: {
      type: String,
      required: [true, 'OTP hash is required'],
      select: false, // Don't return by default
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    verified: {
      type: Boolean,
      default: false,
      index: true,
    },
    signupRole: {
      type: String,
      enum: ['CUSTOMER', 'SALON_OWNER'],
      default: 'CUSTOMER',
    },
  },
  { timestamps: true }
);

// TTL index: automatically delete documents 1 second after expiresAt
OtpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 1 });

// Compound index for finding active OTP by phone
OtpVerificationSchema.index({ phone: 1, verified: 1 });

// Prevent OverwriteModelError
const OtpVerification =
  mongoose.models.OtpVerification || mongoose.model<IOtpVerification>('OtpVerification', OtpVerificationSchema);

export type { IOtpVerification };
export default OtpVerification;
