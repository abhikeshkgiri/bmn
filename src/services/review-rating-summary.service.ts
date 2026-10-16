import type mongoose from 'mongoose';
import Booking from '@/models/Booking';
import Barber from '@/models/Barber';
import Review, { ReviewTarget, ReviewStatus, type IReview } from '@/models/Review';
import Salon from '@/models/Salon';
import Service from '@/models/Service';
import { calculateRatingStatsFromCounts } from '@/utils/review';
import { FEATURE22_DEMO_KEY_PREFIX } from '@/utils/transaction-eligibility';
import { BOOKING_STATUS } from '@/constants/booking';

interface RatingCount {
  _id: number;
  count: number;
}

export function buildPublishedEligibleReviewPipeline(
  targetId: IReview['salon'],
  target: 'SALON' | 'BARBER',
) {
  const targetField = target === ReviewTarget.SALON ? 'salon' : 'barber';
  return [
    {
      $match: {
        [targetField]: targetId,
        target,
        status: ReviewStatus.PUBLISHED,
      },
    },
    {
      $lookup: {
        from: Booking.collection.name,
        let: {
          reviewBooking: '$booking',
          reviewCustomer: '$customer',
          reviewSalon: '$salon',
          reviewBarber: '$barber',
          reviewService: '$service',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$_id', '$$reviewBooking'] },
                  { $eq: ['$customer', '$$reviewCustomer'] },
                  { $eq: ['$salon', '$$reviewSalon'] },
                  { $eq: ['$barber', '$$reviewBarber'] },
                  { $eq: ['$service', '$$reviewService'] },
                  { $eq: ['$status', BOOKING_STATUS.COMPLETED] },
                ],
              },
            },
          },
          { $limit: 1 },
        ],
        as: 'eligibleBooking',
      },
    },
    {
      $match: {
        $expr: { $gt: [{ $size: '$eligibleBooking' }, 0] },
      },
    },
    ...[
      { field: 'salon', collection: Salon.collection.name },
      { field: 'barber', collection: Barber.collection.name },
      { field: 'service', collection: Service.collection.name },
    ].map(({ field, collection }) => ({
      $lookup: {
        from: collection,
        let: { targetId: `$${field}` },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$_id', '$$targetId'] },
                  {
                    $not: [
                      {
                        $regexMatch: {
                          input: { $ifNull: ['$demoKey', ''] },
                          regex: `^${FEATURE22_DEMO_KEY_PREFIX}`,
                        },
                      },
                    ],
                  },
                ],
              },
            },
          },
          { $limit: 1 },
        ],
        as: `eligible${field[0].toUpperCase()}${field.slice(1)}`,
      },
    })),
    {
      $match: {
        $expr: {
          $and: [
            { $eq: [{ $size: '$eligibleSalon' }, 1] },
            { $eq: [{ $size: '$eligibleBarber' }, 1] },
            { $eq: [{ $size: '$eligibleService' }, 1] },
            { $eq: [{ $arrayElemAt: ['$eligibleBarber.salon', 0] }, '$salon'] },
            { $eq: [{ $arrayElemAt: ['$eligibleService.salon', 0] }, '$salon'] },
          ],
        },
      },
    },
    {
      $group: {
        _id: '$rating',
        count: { $sum: 1 },
      },
    },
  ];
}

export async function getPublishedReviewRatingStats(
  targetId: IReview['salon'],
  target: 'SALON' | 'BARBER',
): Promise<ReturnType<typeof calculateRatingStatsFromCounts>> {
  const counts = await Review.aggregate<RatingCount>(
    buildPublishedEligibleReviewPipeline(targetId, target),
  ).option({ maxTimeMS: 5000 });
  return calculateRatingStatsFromCounts(
    counts.map(({ _id, count }) => ({ rating: _id, count })),
  );
}

export async function refreshReviewRatingSummary(
  review: Pick<IReview, 'salon' | 'barber' | 'target'>,
  session: mongoose.ClientSession,
): Promise<void> {
  if (review.target === ReviewTarget.SALON) {
    const counts = await Review.aggregate<RatingCount>(
      buildPublishedEligibleReviewPipeline(review.salon, ReviewTarget.SALON),
    ).session(session);
    const stats = calculateRatingStatsFromCounts(
      counts.map(({ _id, count }) => ({ rating: _id, count })),
    );
    const result = await Salon.updateOne(
      { _id: review.salon },
      { $set: { rating: stats.averageRating, reviewCount: stats.totalReviews } },
      { session },
    );
    if (result.matchedCount !== 1) throw new Error('REVIEW_RATING_SALON_NOT_FOUND');
  } else if (review.target === ReviewTarget.BARBER && review.barber) {
    const counts = await Review.aggregate<RatingCount>(
      buildPublishedEligibleReviewPipeline(review.barber, ReviewTarget.BARBER),
    ).session(session);
    const stats = calculateRatingStatsFromCounts(
      counts.map(({ _id, count }) => ({ rating: _id, count })),
    );
    const result = await Barber.updateOne(
      { _id: review.barber },
      { $set: { rating: stats.averageRating, reviewCount: stats.totalReviews } },
      { session },
    );
    if (result.matchedCount !== 1) throw new Error('REVIEW_RATING_BARBER_NOT_FOUND');
  }
}
