import { REVIEW_VALIDATION } from '@/constants/reviews';

export interface RatingStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export function calculateRatingStatsFromRatings(ratings: number[]): RatingStats {
  const distribution: RatingStats['ratingDistribution'] = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  const validRatings = ratings.filter((rating) =>
    Number.isInteger(rating) &&
    rating >= REVIEW_VALIDATION.MIN_RATING &&
    rating <= REVIEW_VALIDATION.MAX_RATING
  );

  for (const rating of validRatings) {
    distribution[rating as 1 | 2 | 3 | 4 | 5] += 1;
  }

  const totalRating = validRatings.reduce((sum, rating) => sum + rating, 0);
  return {
    averageRating: validRatings.length
      ? Math.round((totalRating / validRatings.length) * 10) / 10
      : 0,
    totalReviews: validRatings.length,
    ratingDistribution: distribution,
  };
}

export function calculateRatingStatsFromCounts(
  counts: Array<{ rating: number; count: number }>
): RatingStats {
  const distribution: RatingStats['ratingDistribution'] = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  let totalReviews = 0;
  let totalRating = 0;

  for (const { rating, count } of counts) {
    if (
      Number.isInteger(rating) &&
      rating >= REVIEW_VALIDATION.MIN_RATING &&
      rating <= REVIEW_VALIDATION.MAX_RATING &&
      Number.isInteger(count) &&
      count > 0
    ) {
      distribution[rating as 1 | 2 | 3 | 4 | 5] += count;
      totalReviews += count;
      totalRating += rating * count;
    }
  }

  return {
    averageRating: totalReviews ? Math.round((totalRating / totalReviews) * 10) / 10 : 0,
    totalReviews,
    ratingDistribution: distribution,
  };
}
