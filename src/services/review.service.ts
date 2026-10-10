/**
 * Review Service
 * Handles all review business logic with proper authorization and validation
 */

import { Types } from 'mongoose';
import Review, { type IReview } from '@/models/Review';
import Booking, { type IBooking } from '@/models/Booking';
import Salon from '@/models/Salon';
import Barber from '@/models/Barber';
import Service from '@/models/Service';
import User from '@/models/User';
import { connectDB } from '@/lib/db';
import type { AuthUser } from '@/types';
import { BOOKING_STATUS } from '@/constants/booking';
import { USER_ROLES } from '@/constants/roles';
import { REVIEW_VALIDATION, REVIEW_STATUS, REVIEW_TARGET } from '@/constants/reviews';
import { isSalonApproved } from '@/utils/salon-approval';
import { isSupportedSalonLocation } from '@/constants/launch-cities';
import { calculateRatingStatsFromCounts, type RatingStats } from '@/utils/review';
import {
  ReviewCreateSchema,
  ReviewIdSchema,
  ReviewListQuerySchema,
  ReviewUpdateSchema,
} from '@/validations/review.schema';
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

/**
 * Error codes for review operations
 */
export const REVIEW_ERRORS = {
  INVALID_BOOKING: { code: 'INVALID_BOOKING', message: 'Booking not found' },
  BOOKING_NOT_COMPLETED: { code: 'BOOKING_NOT_COMPLETED', message: 'Booking must be completed to review' },
  BOOKING_NOT_OWNED: { code: 'BOOKING_NOT_OWNED', message: 'You can only review your own bookings' },
  INVALID_RATING: { code: 'INVALID_RATING', message: 'Rating must be between 1 and 5' },
  INVALID_INPUT: { code: 'INVALID_INPUT', message: 'Review data is invalid' },
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
  TARGET_MISMATCH: { code: 'TARGET_MISMATCH', message: 'The review target must belong to the completed booking' },
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
  const parsedPayload = ReviewCreateSchema.safeParse({
    bookingId: payload.bookingId,
    rating: payload.rating,
    review: payload.review,
    target: payload.target,
  });
  if (!parsedPayload.success || !ReviewIdSchema.safeParse(payload.bookingId).success) {
    throw REVIEW_ERRORS.INVALID_BOOKING;
  }

  // Validate user is customer
  if (payload.currentUser.role !== USER_ROLES.CUSTOMER) {
    throw REVIEW_ERRORS.UNAUTHORIZED;
  }

  // Fetch booking
  const booking = await Booking.findById(payload.bookingId).maxTimeMS(5000) as (IBooking & { _id: Types.ObjectId }) | null;

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

  const salon = await Salon.findById(booking.salon).maxTimeMS(5000);
  if (!salon || !salon.isActive || !isSalonApproved(salon) ||
    !isSupportedSalonLocation(salon.address.city, salon.address.state)) {
    throw REVIEW_ERRORS.TARGET_MISMATCH;
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
  if (
    !Number.isInteger(rating) ||
    rating < REVIEW_VALIDATION.MIN_RATING ||
    rating > REVIEW_VALIDATION.MAX_RATING
  ) {
    throw REVIEW_ERRORS.INVALID_INPUT;
  }

  if (review !== undefined && review.trim().length > 0) {
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

  const targetId =
    payload.target === REVIEW_TARGET.SALON ? booking.salon :
      payload.target === REVIEW_TARGET.BARBER ? booking.barber :
        payload.target === REVIEW_TARGET.SERVICE ? booking.service : null;
  if (!targetId) throw REVIEW_ERRORS.TARGET_MISMATCH;

  if (payload.target === REVIEW_TARGET.BARBER) {
    const barber = await Barber.findOne({
      _id: targetId,
      salon: booking.salon,
      isActive: true,
      isVerified: true,
    }).select('_id user').maxTimeMS(5000);
    const barberUser = barber ? await User.findOne({
      _id: barber.user,
      role: USER_ROLES.BARBER,
      isActive: true,
    }).select('_id').maxTimeMS(5000) : null;
    if (!barber || !barberUser) throw REVIEW_ERRORS.TARGET_MISMATCH;
  } else if (payload.target === REVIEW_TARGET.SERVICE) {
    const service = await Service.findOne({
      _id: targetId,
      salon: booking.salon,
      isActive: true,
    }).select('_id').maxTimeMS(5000);
    if (!service) throw REVIEW_ERRORS.TARGET_MISMATCH;
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
  let review: IReview;
  try {
    review = await Review.create({
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
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      throw REVIEW_ERRORS.DUPLICATE_REVIEW;
    }
    throw error;
  }

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

  return review;
}

/**
 * Update an existing review
 */
export async function updateReview(payload: ReviewUpdatePayload): Promise<IReview> {
  await connectDB();

  if (payload.currentUser.role !== USER_ROLES.CUSTOMER) throw REVIEW_ERRORS.UNAUTHORIZED;
  const parsedPayload = ReviewUpdateSchema.safeParse({
    rating: payload.rating,
    review: payload.review,
  });
  if (!ReviewIdSchema.safeParse(payload.reviewId).success || !parsedPayload.success) {
    throw REVIEW_ERRORS.INVALID_INPUT;
  }

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
  return review;
}

/**
 * Delete a review
 */
export async function deleteReview(reviewId: string, currentUser: AuthUser): Promise<void> {
  await connectDB();

  if (currentUser.role !== USER_ROLES.CUSTOMER) throw REVIEW_ERRORS.UNAUTHORIZED;
  if (!ReviewIdSchema.safeParse(reviewId).success) throw REVIEW_ERRORS.INVALID_INPUT;
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

  const parsedOptions = ReviewListQuerySchema.safeParse({
    page: options.page?.toString(),
    limit: options.limit?.toString(),
  });
  if (!parsedOptions.success) throw REVIEW_ERRORS.INVALID_INPUT;
  if (!ReviewIdSchema.safeParse(salonId).success) throw REVIEW_ERRORS.REVIEW_NOT_FOUND;
  const salon = await Salon.findById(salonId)
    .select('_id isActive isVerified approvalStatus address')
    .maxTimeMS(5000);
  if (!salon || !salon.isActive || !isSalonApproved(salon) ||
    !isSupportedSalonLocation(salon.address.city, salon.address.state)) {
    throw REVIEW_ERRORS.REVIEW_NOT_FOUND;
  }

  const { page, limit } = parsedOptions.data;
  const skip = (page - 1) * limit;

  const query = {
    salon: new Types.ObjectId(salonId),
    target: REVIEW_TARGET.SALON,
    status: REVIEW_STATUS.PUBLISHED,
  };

  const total = await Review.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  const reviews = (await Review.find(query)
    .select('customer salon barber service target rating review status createdAt')
    .populate('customer', 'name avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .maxTimeMS(5000)) as IReview[];

  const ratingCounts = await Review.aggregate<{ _id: number; count: number }>([
    { $match: query },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
  ]).option({ maxTimeMS: 5000 });
  const stats = calculateRatingStatsFromCounts(
    ratingCounts.map(({ _id, count }) => ({ rating: _id, count }))
  );

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

  const parsedOptions = ReviewListQuerySchema.safeParse({
    page: options.page?.toString(),
    limit: options.limit?.toString(),
  });
  if (!parsedOptions.success) throw REVIEW_ERRORS.INVALID_INPUT;
  if (!ReviewIdSchema.safeParse(barberId).success) throw REVIEW_ERRORS.REVIEW_NOT_FOUND;
  const barber = await Barber.findOne({
    _id: barberId,
    isActive: true,
    isVerified: true,
  }).select('_id user salon').maxTimeMS(5000);
  const barberUser = barber ? await User.findOne({
    _id: barber.user,
    role: USER_ROLES.BARBER,
    isActive: true,
  }).select('_id').maxTimeMS(5000) : null;
  const salon = barber ? await Salon.findById(barber.salon)
    .select('_id isActive isVerified approvalStatus address')
    .maxTimeMS(5000) : null;
  if (!barber || !barberUser || !salon || !salon.isActive || !isSalonApproved(salon) ||
    !isSupportedSalonLocation(salon.address.city, salon.address.state)) {
    throw REVIEW_ERRORS.REVIEW_NOT_FOUND;
  }

  const { page, limit } = parsedOptions.data;
  const skip = (page - 1) * limit;

  const query = {
    barber: new Types.ObjectId(barberId),
    target: REVIEW_TARGET.BARBER,
    status: REVIEW_STATUS.PUBLISHED,
  };

  const total = await Review.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  const reviews = (await Review.find(query)
    .select('customer salon barber service target rating review status createdAt')
    .populate('customer', 'name avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .maxTimeMS(5000)) as IReview[];

  const ratingCounts = await Review.aggregate<{ _id: number; count: number }>([
    { $match: query },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
  ]).option({ maxTimeMS: 5000 });
  const stats = calculateRatingStatsFromCounts(
    ratingCounts.map(({ _id, count }) => ({ rating: _id, count }))
  );

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

  const parsedOptions = ReviewListQuerySchema.safeParse({
    page: options.page?.toString(),
    limit: options.limit?.toString(),
  });
  if (!ReviewIdSchema.safeParse(customerId).success || !parsedOptions.success) {
    throw REVIEW_ERRORS.INVALID_INPUT;
  }
  const { page, limit } = parsedOptions.data;
  const skip = (page - 1) * limit;

  const query = { customer: new Types.ObjectId(customerId) };

  const total = await Review.countDocuments(query);
  const totalPages = Math.ceil(total / limit);

  const reviews = (await Review.find(query)
    .populate({ path: 'booking', select: 'bookingNumber appointmentDate startTime endTime status' })
    .populate({ path: 'salon', select: 'name slug' })
    .populate({ path: 'barber', select: 'name slug profileImage' })
    .populate({ path: 'service', select: 'name category' })
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
  return calculateRatingStatsFromCounts(
    Object.entries(
      reviews.reduce<Record<number, number>>((counts, review) => {
        counts[review.rating] = (counts[review.rating] || 0) + 1;
        return counts;
      }, {})
    ).map(([rating, count]) => ({ rating: Number(rating), count }))
  );
}

/**
 * Get review statistics for a salon
 */
export async function getSalonRatingStats(salonId: string): Promise<RatingStats> {
  await connectDB();

  if (!ReviewIdSchema.safeParse(salonId).success) throw REVIEW_ERRORS.INVALID_INPUT;
  const ratingCounts = await Review.aggregate<{ _id: number; count: number }>([
    { $match: { salon: new Types.ObjectId(salonId), target: REVIEW_TARGET.SALON, status: REVIEW_STATUS.PUBLISHED } },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
  ]).option({ maxTimeMS: 5000 });
  return calculateRatingStatsFromCounts(ratingCounts.map(({ _id, count }) => ({ rating: _id, count })));
}

/**
 * Get review statistics for a barber
 */
export async function getBarberRatingStats(barberId: string): Promise<RatingStats> {
  await connectDB();

  if (!ReviewIdSchema.safeParse(barberId).success) throw REVIEW_ERRORS.INVALID_INPUT;
  const ratingCounts = await Review.aggregate<{ _id: number; count: number }>([
    { $match: { barber: new Types.ObjectId(barberId), target: REVIEW_TARGET.BARBER, status: REVIEW_STATUS.PUBLISHED } },
    { $group: { _id: '$rating', count: { $sum: 1 } } },
  ]).option({ maxTimeMS: 5000 });
  return calculateRatingStatsFromCounts(ratingCounts.map(({ _id, count }) => ({ rating: _id, count })));
}

/**
 * Check if customer can review a booking
 */
export async function canReviewBooking(bookingId: string, customerId: string): Promise<boolean> {
  await connectDB();

  if (!ReviewIdSchema.safeParse(bookingId).success || !ReviewIdSchema.safeParse(customerId).success) {
    return false;
  }
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

  if (!ReviewIdSchema.safeParse(reviewId).success) return null;
  return (await Review.findById(reviewId)
    .populate('customer', 'name avatar')
    .populate({ path: 'booking', select: 'bookingNumber appointmentDate startTime endTime status' })
    .populate({ path: 'salon', select: 'name slug' })
    .populate({ path: 'barber', select: 'name slug profileImage' })
    .populate({ path: 'service', select: 'name category' })) as IReview | null;
}
