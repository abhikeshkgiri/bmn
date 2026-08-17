/**
 * Review Service
 * Handles all review business logic with proper authorization and validation
 */

import { Types } from 'mongoose';
import Review, { type IReview, ReviewTarget } from '@/models/Review';
import Booking, { type IBooking } from '@/models/Booking';
import Salon from '@/models/Salon';
import { connectDB } from '@/lib/db';
import type { AuthUser } from '@/types';
import { BOOKING_STATUS } from '@/constants/booking';
import { USER_ROLES } from '@/constants/roles';
import { REVIEW_VALIDATION, REVIEW_STATUS, REVIEW_TARGET } from '@/constants/reviews';
import { createNotification } from './notification.service';
import { NOTIFICATION_TYPES } from '@/constants/notifications';

export interface ReviewCreatePayload {
  bookingId: string;
  rating: number;
  review?: string;
  target: string; // SALON | BARBER | SERVICE
  currentUser: AuthUser;
}

export interface ReviewUpdatePayload {
  reviewId: string;
  rating?: number;
  review?: string;
  currentUser: AuthUser;
}

export interface ReviewQueryOptions {
  page?: number;
  limit?: number;
  salonId?: string;
  barberId?: string;
  customerId?: string;
}

export interface RatingStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    [key: number]: number; // 1-5 star counts
  };
}

/**
 * Error codes for review operations
 */
export const REVIEW_ERRORS = {
  INVALID_BOOKING: { code: 'INVALID_BOOKING', message: 'Booking not found' },
  BOOKING_NOT_COMPLETED: { code: 'BOOKING_NOT_COMPLETED', message: 'Booking must be completed to review' },
  BOOKING_NOT_OWNED: { code: 'BOOKING_NOT_OWNED', message: 'You can only review your own bookings' },
  INVALID_RATING: { code: 'INVALID_RATING', message: 'Rating must be between 1 and 5' },
  REVIEW_TOO_SHORT: {
    code: 'REVIEW_TOO_SHORT',
    message: `Review must be at least ${REVIEW_VALIDATION.MIN_REVIEW_LENGTH} characters`,
  },
  REVIEW_TOO_LONG: {
    code: 'REVIEW_TOO_LONG',
    message: `Review must not exceed ${REVIEW_VALIDATION.MAX_REVIEW_LENGTH} characters`,
  },
  DUPLICATE_REVIEW: { code: 'DUPLICATE_REVIEW', message: 'You have already reviewed this booking' },
  REVIEW_NOT_FOUND: { code: 'REVIEW_NOT_FOUND', message: 'Review not found' },
  REVIEW_NOT_OWNED: { code: 'REVIEW_NOT_OWNED', message: 'You can only edit or delete your own reviews' },
  UNAUTHORIZED: { code: 'UNAUTHORIZED', message: 'Not authorized to perform this action' },
} as const;

/**
 * Validate review creation request
 * Ensures booking exists, is completed, and customer hasn't already reviewed it
 */
async function validateReviewRequest(
  payload: ReviewCreatePayload
): Promise<{
  booking: IBooking & { _id: Types.ObjectId };
}> {
  // Validate user is customer
  if (payload.currentUser.role !== USER_ROLES.CUSTOMER) {
    throw REVIEW_ERRORS.UNAUTHORIZED;
  }

  // Fetch booking
  const booking = (await Booking.findById(payload.bookingId)
    .populate('salon')
    .populate('barber')) as IBooking & { _id: Types.ObjectId };

  if (!booking) {
    throw REVIEW_ERRORS.INVALID_BOOKING;
  }

  // Verify booking belongs to customer
  if (booking.customer.toString() !== payload.currentUser._id) {
    throw REVIEW_ERRORS.BOOKING_NOT_OWNED;
  }

  // Verify booking is completed
  if (booking.status !== BOOKING_STATUS.COMPLETED) {
    throw REVIEW_ERRORS.BOOKING_NOT_COMPLETED;
  }

  // Verify appointment date has passed
  const appointmentDate = new Date(booking.appointmentDate);
  appointmentDate.setHours(
    parseInt(booking.endTime.split(':')[0]),
    parseInt(booking.endTime.split(':')[1])
  );

  if (appointmentDate > new Date()) {
    throw REVIEW_ERRORS.BOOKING_NOT_COMPLETED;
  }

  // Check for existing review on this booking
  const existingReview = await Review.findOne({ booking: new Types.ObjectId(payload.bookingId) });
  if (existingReview) {
    throw REVIEW_ERRORS.DUPLICATE_REVIEW;
  }

  return {
    booking,
  };
}

/**
 * Validate review content
 */
function validateReviewContent(rating: number, review?: string): void {
  if (rating < REVIEW_VALIDATION.MIN_RATING || rating > REVIEW_VALIDATION.MAX_RATING) {
    throw REVIEW_ERRORS.INVALID_RATING;
  }

  if (review) {
    if (review.trim().length < REVIEW_VALIDATION.MIN_REVIEW_LENGTH) {
      throw REVIEW_ERRORS.REVIEW_TOO_SHORT;
    }
    if (review.trim().length > REVIEW_VALIDATION.MAX_REVIEW_LENGTH) {
      throw REVIEW_ERRORS.REVIEW_TOO_LONG;
    }
  }
}

/**
 * Create a new review for a booking
 */
export async function createReview(payload: ReviewCreatePayload): Promise<IReview> {
  await connectDB();

  // Validate request
  const { booking } = await validateReviewRequest(payload);

  // Validate content
  validateReviewContent(payload.rating, payload.review);

  // Validate target
  if (!Object.values(REVIEW_TARGET).includes(payload.target as ReviewTarget)) {
    throw { code: 'INVALID_TARGET', message: 'Invalid review target' };
  }

  // Determine which entity is being reviewed based on target
  let targetName = '';

  if (payload.target === REVIEW_TARGET.SALON) {
    targetName = 'Salon';
  } else if (payload.target === REVIEW_TARGET.BARBER) {
    targetName = 'Barber';
  } else if (payload.target === REVIEW_TARGET.SERVICE) {
    targetName = 'Service';
  }

  // Create review
  const review = await Review.create({
    customer: new Types.ObjectId(payload.currentUser._id),
    booking: new Types.ObjectId(payload.bookingId),
    salon: booking.salon,
    barber: booking.barber,
    service: booking.service,
    target: payload.target,
    rating: payload.rating,
    review: payload.review?.trim() || undefined,
    status: REVIEW_STATUS.PUBLISHED,
  });

  // Send notification to salon owner
  try {
    const salonDoc = await Salon.findById(booking.salon);
    if (salonDoc?.owner) {
      await createNotification({
        recipientId: salonDoc.owner.toString(),
        recipientRole: USER_ROLES.SALON_OWNER,
        type: NOTIFICATION_TYPES.BOOKING_REVIEW,
        title: `New ${targetName} Review`,
        message: `Customer gave a ${payload.rating}★ review for your ${targetName}`,
        bookingId: payload.bookingId,
        salonId: booking.salon.toString(),
        barberId: booking.barber.toString(),
        priority: 'NORMAL',
      });
    }
  } catch (error) {
    console.error('Error sending review notification:', error);
    // Don't fail review creation if notification fails
  }

  return review.populate(['customer', 'booking', 'salon', 'barber', 'service']);
}

/**
 * Update an existing review
 */
export async function updateReview(payload: ReviewUpdatePayload): Promise<IReview> {
  await connectDB();

  const review = (await Review.findById(payload.reviewId)) as IReview & { _id: Types.ObjectId };

  if (!review) {
    throw REVIEW_ERRORS.REVIEW_NOT_FOUND;
  }

  // Verify review ownership
  if (review.customer.toString() !== payload.currentUser._id) {
    throw REVIEW_ERRORS.REVIEW_NOT_OWNED;
  }

  // Validate new content if provided
  if (payload.rating !== undefined || payload.review !== undefined) {
    validateReviewContent(payload.rating ?? review.rating, payload.review ?? review.review ?? undefined);
  }

  // Update fields
  if (payload.rating !== undefined) {
    review.rating = payload.rating;
  }
  if (payload.review !== undefined) {
    review.review = payload.review?.trim() || undefined;
  }

  await review.save();
  return review.populate(['customer', 'booking', 'salon', 'barber', 'service']);
}

/**
 * Delete a review
 */
export async function deleteReview(reviewId: string, currentUser: AuthUser): Promise<void> {
  await connectDB();

  const review = (await Review.findById(reviewId)) as IReview & { _id: Types.ObjectId };

  if (!review) {
    throw REVIEW_ERRORS.REVIEW_NOT_FOUND;
  }

  // Verify review ownership
  if (review.customer.toString() !== currentUser._id) {
    throw REVIEW_ERRORS.REVIEW_NOT_OWNED;
  }

  await Review.deleteOne({ _id: review._id });
}

/**
 * Get reviews for a salon
 */
export async function getSalonReviews(
  salonId: string,
  options: ReviewQueryOptions = {}
): Promise<{
  reviews: IReview[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  stats: RatingStats;
}> {
  await connectDB();

  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;

  const query = {
    salon: new Types.ObjectId(salonId),
    status: REVIEW_STATUS.PUBLISHED,
  };

  const total = await Review.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  const reviews = (await Review.find(query)
    .populate('customer')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)) as IReview[];

  // Calculate rating statistics
  const allReviews = await Review.find(query).select('rating');
  const stats = calculateRatingStats(allReviews);

  return {
    reviews,
    pagination: { page, limit, total, totalPages },
    stats,
  };
}

/**
 * Get reviews for a barber
 */
export async function getBarberReviews(
  barberId: string,
  options: ReviewQueryOptions = {}
): Promise<{
  reviews: IReview[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  stats: RatingStats;
}> {
  await connectDB();

  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;

  const query = {
    barber: new Types.ObjectId(barberId),
    status: REVIEW_STATUS.PUBLISHED,
  };

  const total = await Review.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  const reviews = (await Review.find(query)
    .populate('customer')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)) as IReview[];

  // Calculate rating statistics
  const allReviews = await Review.find(query).select('rating');
  const stats = calculateRatingStats(allReviews);

  return {
    reviews,
    pagination: { page, limit, total, totalPages },
    stats,
  };
}

/**
 * Get customer's reviews
 */
export async function getCustomerReviews(
  customerId: string,
  options: ReviewQueryOptions = {}
): Promise<{
  reviews: IReview[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
  await connectDB();

  const page = options.page || 1;
  const limit = options.limit || 10;
  const skip = (page - 1) * limit;

  const query = { customer: new Types.ObjectId(customerId) };

  const total = await Review.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  const reviews = (await Review.find(query)
    .populate(['booking', 'salon', 'barber'])
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)) as IReview[];

  return {
    reviews,
    pagination: { page, limit, total, totalPages },
  };
}

/**
 * Calculate average rating and distribution
 */
export function calculateRatingStats(reviews: IReview[]): RatingStats {
  if (reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingDistribution: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      },
    };
  }

  const distribution = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  let totalRating = 0;

  for (const review of reviews) {
    totalRating += review.rating;
    distribution[review.rating as 1 | 2 | 3 | 4 | 5]++;
  }

  return {
    averageRating: Math.round((totalRating / reviews.length) * 10) / 10,
    totalReviews: reviews.length,
    ratingDistribution: distribution,
  };
}

/**
 * Get review statistics for a salon
 */
export async function getSalonRatingStats(salonId: string): Promise<RatingStats> {
  await connectDB();

  const reviews = (await Review.find({
    salon: new Types.ObjectId(salonId),
    status: REVIEW_STATUS.PUBLISHED,
  }).select('rating')) as IReview[];

  return calculateRatingStats(reviews);
}

/**
 * Get review statistics for a barber
 */
export async function getBarberRatingStats(barberId: string): Promise<RatingStats> {
  await connectDB();

  const reviews = (await Review.find({
    barber: new Types.ObjectId(barberId),
    status: REVIEW_STATUS.PUBLISHED,
  }).select('rating')) as IReview[];

  return calculateRatingStats(reviews);
}

/**
 * Check if customer can review a booking
 */
export async function canReviewBooking(bookingId: string, customerId: string): Promise<boolean> {
  await connectDB();

  const booking = await Booking.findById(bookingId);
  if (!booking || booking.customer.toString() !== customerId) {
    return false;
  }

  if (booking.status !== BOOKING_STATUS.COMPLETED) {
    return false;
  }

  // Check if already reviewed
  const existingReview = await Review.findOne({ booking: new Types.ObjectId(bookingId) });
  return !existingReview;
}

/**
 * Get a single review
 */
export async function getReview(reviewId: string): Promise<IReview | null> {
  await connectDB();

  return (await Review.findById(reviewId).populate([
    'customer',
    'booking',
    'salon',
    'barber',
    'service',
  ])) as IReview | null;
}
