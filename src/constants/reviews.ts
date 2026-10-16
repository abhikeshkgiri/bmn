export const REVIEW_STATUS = {
  PENDING: 'PENDING',
  PUBLISHED: 'PUBLISHED',
  HIDDEN: 'HIDDEN',
  REMOVED: 'REMOVED',
} as const;

export const REVIEW_TARGET = {
  SALON: 'SALON',
  BARBER: 'BARBER',
  SERVICE: 'SERVICE',
} as const;

export const REVIEW_VALIDATION = {
  MIN_RATING: 1,
  MAX_RATING: 5,
  MIN_REVIEW_LENGTH: 10,
  MAX_REVIEW_LENGTH: 500,
  MIN_BOOKING_AGE_HOURS: 0, // Can review immediately after booking completion
  REVIEW_LIMIT_DAYS: 365, // Cannot review after 1 year
} as const;

export type ReviewStatus = (typeof REVIEW_STATUS)[keyof typeof REVIEW_STATUS];
export type ReviewTarget = (typeof REVIEW_TARGET)[keyof typeof REVIEW_TARGET];
