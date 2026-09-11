import mongoose, { Schema, Document, Types } from 'mongoose';
import { BARBER_SPECIALIZATION, type BarberSpecialization } from '@/constants/services';

interface IPortfolioItem {
  image: string;
  title?: string;
  description?: string;
}

interface IBarber extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId; // Reference to User (BARBER role)
  salon: Types.ObjectId; // Reference to Salon
  name: string;
  slug: string;
  profileImage?: string;
  bio?: string;
  experienceYears: number;
  specializations: BarberSpecialization[];
  services?: Types.ObjectId[]; // References to Services offered
  portfolio?: IPortfolioItem[];
  rating: number;
  reviewCount: number;
  isAvailable: boolean;
  bookingLockVersion: number;
  offersHomeService: boolean;
  homeServiceRadius?: number; // in kilometers
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PortfolioItemSchema = new Schema<IPortfolioItem>(
  {
    image: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const BarberSchema = new Schema<IBarber>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    salon: {
      type: Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Barber name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name must not exceed 100 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    profileImage: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      default: null,
    },
    experienceYears: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    specializations: {
      type: [String],
      enum: Object.values(BARBER_SPECIALIZATION),
      default: [],
    },
    services: {
      type: [Schema.Types.ObjectId],
      ref: 'Service',
      default: [],
    },
    portfolio: {
      type: [PortfolioItemSchema],
      default: [],
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    bookingLockVersion: {
      type: Number,
      default: 0,
      min: 0,
    },
    offersHomeService: {
      type: Boolean,
      default: false,
    },
    homeServiceRadius: {
      type: Number,
      default: null,
      min: 1,
      max: 100,
    },
    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

// Prevent OverwriteModelError
const Barber = mongoose.models.Barber || mongoose.model<IBarber>('Barber', BarberSchema);

export type { IBarber, IPortfolioItem };
export default Barber;
