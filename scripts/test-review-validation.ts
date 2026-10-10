import assert from 'node:assert/strict';
import {
  calculateRatingStatsFromCounts,
  calculateRatingStatsFromRatings,
} from '../src/utils/review';
import {
  ReviewCreateSchema,
  ReviewIdSchema,
  ReviewListQuerySchema,
  ReviewUpdateSchema,
} from '../src/validations/review.schema';

const bookingId = '64b000000000000000000001';
const validReview = {
  bookingId,
  rating: 5,
  target: 'SALON' as const,
  review: 'Excellent service',
};

assert.equal(ReviewCreateSchema.safeParse(validReview).success, true);
assert.equal(ReviewCreateSchema.safeParse({ ...validReview, rating: '5' }).success, false);
assert.equal(ReviewCreateSchema.safeParse({ ...validReview, rating: 5.5 }).success, false);
assert.equal(ReviewCreateSchema.safeParse({ ...validReview, rating: 0 }).success, false);
assert.equal(ReviewCreateSchema.safeParse({ ...validReview, bookingId: 'invalid' }).success, false);
assert.equal(ReviewCreateSchema.safeParse({ ...validReview, target: 'OTHER' }).success, false);
assert.equal(ReviewCreateSchema.safeParse({ ...validReview, review: 'short' }).success, false);
assert.equal(ReviewCreateSchema.safeParse({ ...validReview, review: 'x'.repeat(501) }).success, false);
assert.equal(ReviewUpdateSchema.safeParse({ rating: 4 }).success, true);
assert.equal(ReviewUpdateSchema.safeParse({}).success, false);
assert.equal(ReviewIdSchema.safeParse(bookingId).success, true);
assert.equal(ReviewIdSchema.safeParse('not-an-id').success, false);
assert.equal(ReviewListQuerySchema.safeParse({ page: '1', limit: '50' }).success, true);
assert.equal(ReviewListQuerySchema.safeParse({ page: '1e5' }).success, false);
assert.equal(ReviewListQuerySchema.safeParse({ limit: '51' }).success, false);

assert.deepEqual(calculateRatingStatsFromRatings([1, 3, 5, 6, 2.5]), {
  averageRating: 3,
  totalReviews: 3,
  ratingDistribution: { 1: 1, 2: 0, 3: 1, 4: 0, 5: 1 },
});
assert.deepEqual(calculateRatingStatsFromCounts([
  { rating: 2, count: 2 },
  { rating: 4, count: 1 },
  { rating: 9, count: 10 },
]), {
  averageRating: 2.7,
  totalReviews: 3,
  ratingDistribution: { 1: 0, 2: 2, 3: 0, 4: 1, 5: 0 },
});
assert.equal(calculateRatingStatsFromRatings([]).totalReviews, 0);

console.log('Review validation and rating-summary tests passed.');
