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
import { isFeature22DemoRecord } from '../src/utils/transaction-eligibility';
import { buildPublishedEligibleReviewPipeline } from '../src/services/review-rating-summary.service';
import { Types } from 'mongoose';

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
assert.equal(ReviewCreateSchema.safeParse({ ...validReview, status: 'PUBLISHED' }).success, false);
assert.equal(ReviewCreateSchema.safeParse({ ...validReview, customer: 'another-customer' }).success, false);
assert.equal(ReviewUpdateSchema.safeParse({ rating: 4 }).success, true);
assert.equal(ReviewUpdateSchema.safeParse({}).success, false);
assert.equal(ReviewUpdateSchema.safeParse({ rating: 4, status: 'PUBLISHED' }).success, false);
assert.equal(ReviewUpdateSchema.safeParse({ rating: 4, unexpected: true }).success, false);
assert.equal(ReviewIdSchema.safeParse(bookingId).success, true);
assert.equal(ReviewIdSchema.safeParse('not-an-id').success, false);
assert.equal(ReviewListQuerySchema.safeParse({ page: '1', limit: '50' }).success, true);
assert.equal(ReviewListQuerySchema.safeParse({ page: '1e5' }).success, false);
assert.equal(ReviewListQuerySchema.safeParse({ limit: '51' }).success, false);
assert.equal(isFeature22DemoRecord('feature22:salon:demo'), true);
assert.equal(isFeature22DemoRecord('feature22:barber:demo'), true);
assert.equal(isFeature22DemoRecord('feature22:service:demo'), true);
assert.equal(isFeature22DemoRecord('salon:ordinary', 'barber:ordinary', 'service:ordinary'), false);

const ratingPipeline = buildPublishedEligibleReviewPipeline(
  new Types.ObjectId('64b000000000000000000002'),
  'SALON',
);
assert.equal(JSON.stringify(ratingPipeline[0]).includes('"status":"PUBLISHED"'), true);
assert.equal(JSON.stringify(ratingPipeline[0]).includes('"target":"SALON"'), true);
const ratingPipelineText = JSON.stringify(ratingPipeline);
assert.equal(ratingPipelineText.includes('COMPLETED'), true);
assert.equal(ratingPipelineText.includes('feature22:'), true);
assert.equal(ratingPipelineText.includes('$regexMatch'), true);
assert.equal(ratingPipelineText.includes('$eq'), true);

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
assert.deepEqual(calculateRatingStatsFromCounts([]), {
  averageRating: 0,
  totalReviews: 0,
  ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
});

// These counts represent the published, eligible source set after lifecycle changes.
const publishedSet = [
  { rating: 2, count: 1 },
  { rating: 4, count: 1 },
  { rating: 5, count: 1 },
];
assert.deepEqual(calculateRatingStatsFromCounts(publishedSet), {
  averageRating: 3.7,
  totalReviews: 3,
  ratingDistribution: { 1: 0, 2: 1, 3: 0, 4: 1, 5: 1 },
});
assert.equal(
  calculateRatingStatsFromCounts([
    { rating: 2, count: 1 },
    { rating: 5, count: 1 },
  ]).averageRating,
  3.5,
); // Editing a rating recalculates from the resulting set.
assert.deepEqual(calculateRatingStatsFromCounts([
  { rating: 2, count: 1 },
  { rating: 5, count: 1 },
]), {
  averageRating: 3.5,
  totalReviews: 2,
  ratingDistribution: { 1: 0, 2: 1, 3: 0, 4: 0, 5: 1 },
}); // Deletion or unpublishing removes the review from the resulting set.
assert.equal(calculateRatingStatsFromCounts([
  { rating: 1, count: 1 },
  { rating: 5, count: 1 },
]).averageRating, 3);
assert.equal(calculateRatingStatsFromCounts([
  { rating: 1.5, count: 10 },
  { rating: 5, count: 0 },
  { rating: 5, count: -1 },
]).totalReviews, 0);

console.log('Review validation and rating-summary tests passed.');
