import mongoose, { Schema, Document, Types } from 'mongoose';

export enum ReviewStatus {
  PENDING = 'PENDING',
  PUBLISHED = 'PUBLISHED',
  HIDDEN = 'HIDDEN',
  REMOVED = 'REMOVED',
}

export enum ReviewTarget {
  SALON = 'SALON',
  BARBER = 'BARBER',
  SERVICE = 'SERVICE',
}

export interface IReview extends Document {
  _id: Types.ObjectId;
  customer: Types.ObjectId; // Reference to User (CUSTOMER role)
  booking: Types.ObjectId; // Reference to Booking (ensures one review per booking)
  salon: Types.ObjectId; // Reference to Salon
  barber?: Types.ObjectId; // Reference to Barber (optional, for barber-specific review)
  service?: Types.ObjectId; // Reference to Service (optional, for service-specific review)
  target: ReviewTarget; // SALON | BARBER | SERVICE
  rating: number; // 1-5 stars
  review?: string; // Optional written review
  status: ReviewStatus; // PENDING | PUBLISHED | HIDDEN | REMOVED
  helpful: number; // Count of helpful votes
  unhelpful: number; // Count of unhelpful votes
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    booking: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true,
      index: true,
    },
    salon: {
      type: Schema.Types.ObjectId,
      ref: 'Salon',
      required: true,
      index: true,
    },
    barber: {
      type: Schema.Types.ObjectId,
      ref: 'Barber',
      default: null,
      index: true,
    },
    service: {
      type: Schema.Types.ObjectId,
      ref: 'Service',
      default: null,
    },
    target: {
      type: String,
      enum: Object.values(ReviewTarget),
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: [1, 'Rating must be at least 1 star'],
      max: [5, 'Rating must not exceed 5 stars'],
    },
    review: {
      type: String,
      trim: true,
      minlength: [10, 'Review must be at least 10 characters'],
      maxlength: [500, 'Review must not exceed 500 characters'],
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(ReviewStatus),
      default: ReviewStatus.PUBLISHED,
      index: true,
    },
    helpful: {
      type: Number,
      default: 0,
      min: 0,
    },
    unhelpful: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

// Prevent duplicate reviews per booking
ReviewSchema.index({ booking: 1 }, { unique: true });
// For fetching salon reviews
ReviewSchema.index({ salon: 1, status: 1, createdAt: -1 });
// For fetching barber reviews
ReviewSchema.index({ barber: 1, status: 1, createdAt: -1 });
// For fetching customer reviews
ReviewSchema.index({ customer: 1, createdAt: -1 });

const Review = mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);

export default Review;
