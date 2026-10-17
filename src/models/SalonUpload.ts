import mongoose, { Schema } from 'mongoose';
import type { SalonUploadKind } from '@/lib/salon-uploads';

interface ISalonUpload {
  _id: string;
  ownerId: string;
  salonId?: string;
  kind: SalonUploadKind;
  contentType: string;
  data: Buffer;
  isPublic: boolean;
}

const SalonUploadSchema = new Schema<ISalonUpload>(
  {
    _id: { type: String, required: true },
    ownerId: { type: String, required: true },
    salonId: { type: String },
    kind: {
      type: String,
      enum: ['aadhaar', 'pan', 'logo', 'cover', 'gallery', 'service', 'barber', 'profile'],
      required: true,
    },
    contentType: { type: String, required: true },
    data: { type: Buffer, required: true, select: false },
    isPublic: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);

SalonUploadSchema.index({ ownerId: 1, kind: 1 });

const SalonUpload = mongoose.models.SalonUpload ||
  mongoose.model<ISalonUpload>('SalonUpload', SalonUploadSchema);

export type { ISalonUpload };
export default SalonUpload;
