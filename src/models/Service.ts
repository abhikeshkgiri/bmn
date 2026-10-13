import mongoose, { Schema, Document, Types } from 'mongoose';
import { SERVICE_CATEGORY, type ServiceCategory } from '@/constants/services';

interface IService extends Document {
  _id: Types.ObjectId;
  salon: Types.ObjectId; // Reference to Salon
  name: string;
  slug: string;
  description?: string;
  category: ServiceCategory;
  image?: string;
  duration: number; // in minutes
  price: number; // in paise (INR * 100 for precision)
  discountPrice?: number; // in paise
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  demoKey?: string;
}

const ServiceSchema = new Schema<IService>(
  {
    salon: {
      type: Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Service name is required'],
      trim: true,
      minlength: [2, 'Service name must be at least 2 characters'],
      maxlength: [100, 'Service name must not exceed 100 characters'],
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: null,
    },
    category: {
      type: String,
      enum: Object.values(SERVICE_CATEGORY),
      required: true,
      index: true,
    },
    image: {
      type: String,
      default: null,
    },
    duration: {
      type: Number,
      required: [true, 'Duration is required'],
      min: [15, 'Duration must be at least 15 minutes'],
      max: [480, 'Duration must not exceed 480 minutes (8 hours)'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price must be a positive number'],
    },
    discountPrice: {
      type: Number,
      default: null,
      sparse: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    demoKey: { type: String, trim: true, maxlength: 120, select: false },
  },
  { timestamps: true }
);

// Compound index for salon + slug uniqueness
ServiceSchema.index({ salon: 1, slug: 1 }, { unique: true });

// Prevent OverwriteModelError
const Service = mongoose.models.Service || mongoose.model<IService>('Service', ServiceSchema);

export type { IService };
export default Service;
