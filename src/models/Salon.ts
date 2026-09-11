import mongoose, { Schema, Document, Types } from 'mongoose';
import { SALON_FACILITY, type SalonFacility } from '@/constants/services';

interface IAddress {
  addressLine1: string;
  addressLine2?: string;
  area?: string;
  landmark?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface IOpeningHours {
  monday: { isOpen: boolean; openTime?: string; closeTime?: string };
  tuesday: { isOpen: boolean; openTime?: string; closeTime?: string };
  wednesday: { isOpen: boolean; openTime?: string; closeTime?: string };
  thursday: { isOpen: boolean; openTime?: string; closeTime?: string };
  friday: { isOpen: boolean; openTime?: string; closeTime?: string };
  saturday: { isOpen: boolean; openTime?: string; closeTime?: string };
  sunday: { isOpen: boolean; openTime?: string; closeTime?: string };
}

interface ILocation {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

interface ISalon extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  images?: string[];
  owner: Types.ObjectId; // Reference to User (SALON_OWNER)
  staff?: Types.ObjectId[]; // References to Users (SALON_STAFF)
  barbers?: Types.ObjectId[]; // References to Barbers
  services?: Types.ObjectId[]; // References to Services
  address: IAddress;
  location: ILocation;
  contact: {
    phone: string;
    email?: string;
    website?: string;
  };
  openingHours: IOpeningHours;
  capacity: number; // Maximum simultaneous bookings/appointments
  slotIntervalMinutes: number; // Booking slot interval (15, 30, 60 minutes)
  bookingLockVersion: number;
  facilities: SalonFacility[];
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema<IAddress>(
  {
    addressLine1: {
      type: String,
      required: [true, 'Address line 1 is required'],
      trim: true,
    },
    addressLine2: {
      type: String,
      trim: true,
      default: null,
    },
    area: {
      type: String,
      trim: true,
      default: null,
    },
    landmark: {
      type: String,
      trim: true,
      default: null,
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      index: true,
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    postalCode: {
      type: String,
      required: [true, 'Postal code is required'],
      trim: true,
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      default: 'India',
    },
  },
  { _id: false }
);

const OpeningHoursSchema = new Schema<IOpeningHours>(
  {
    monday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '21:00' },
    },
    tuesday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '21:00' },
    },
    wednesday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '21:00' },
    },
    thursday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '21:00' },
    },
    friday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '21:00' },
    },
    saturday: {
      isOpen: { type: Boolean, default: true },
      openTime: { type: String, default: '09:00' },
      closeTime: { type: String, default: '21:00' },
    },
    sunday: {
      isOpen: { type: Boolean, default: false },
      openTime: { type: String, default: null },
      closeTime: { type: String, default: null },
    },
  },
  { _id: false }
);

const LocationSchema = new Schema<ILocation>(
  {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator: function (coords: number[]) {
          return coords.length === 2;
        },
        message: 'Coordinates must be [longitude, latitude]',
      },
    },
  },
  { _id: false }
);

const SalonSchema = new Schema<ISalon>(
  {
    name: {
      type: String,
      required: [true, 'Salon name is required'],
      trim: true,
      minlength: [3, 'Salon name must be at least 3 characters'],
      maxlength: [100, 'Salon name must not exceed 100 characters'],
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: null,
    },
    logo: {
      type: String,
      default: null,
    },
    coverImage: {
      type: String,
      default: null,
    },
    images: {
      type: [String],
      default: [],
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    staff: {
      type: [Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },
    barbers: {
      type: [Schema.Types.ObjectId],
      ref: 'Barber',
      default: [],
    },
    services: {
      type: [Schema.Types.ObjectId],
      ref: 'Service',
      default: [],
    },
    address: {
      type: AddressSchema,
      required: true,
    },
    location: {
      type: LocationSchema,
      required: true,
      index: '2dsphere',
    },
    contact: {
      phone: {
        type: String,
        required: true,
        trim: true,
        match: [/^\+?[1-9]\d{1,14}$/, 'Please provide a valid phone number'],
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email'],
        default: null,
      },
      website: {
        type: String,
        default: null,
      },
    },
    openingHours: {
      type: OpeningHoursSchema,
      required: true,
    },
    capacity: {
      type: Number,
      default: 4,
      min: [1, 'Capacity must be at least 1'],
      max: [50, 'Capacity must not exceed 50'],
    },
    slotIntervalMinutes: {
      type: Number,
      default: 30,
      enum: [15, 30, 45, 60],
    },
    bookingLockVersion: {
      type: Number,
      default: 0,
    },
    facilities: {
      type: [String],
      enum: Object.values(SALON_FACILITY),
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
const Salon = mongoose.models.Salon || mongoose.model<ISalon>('Salon', SalonSchema);

export type { ISalon, IAddress, IOpeningHours, ILocation };
export default Salon;
