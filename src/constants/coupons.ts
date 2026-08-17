export const COUPON_TYPE = {
  PERCENTAGE: 'PERCENTAGE',
  FIXED: 'FIXED',
} as const;

export const COUPON_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  EXPIRED: 'EXPIRED',
} as const;

export const COUPON_VALIDATION = {
  MIN_CODE_LENGTH: 3,
  MAX_CODE_LENGTH: 50,
  MIN_DISCOUNT: 1,
  MIN_MINIMUM_ORDER: 0,
} as const;

export type CouponType = (typeof COUPON_TYPE)[keyof typeof COUPON_TYPE];
export type CouponStatus = (typeof COUPON_STATUS)[keyof typeof COUPON_STATUS];
