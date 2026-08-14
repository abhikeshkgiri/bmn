/**
 * User roles in BookMyNai
 * Used for authorization and access control
 */

export const USER_ROLES = {
  CUSTOMER: 'CUSTOMER',
  BARBER: 'BARBER',
  SALON_OWNER: 'SALON_OWNER',
  SALON_STAFF: 'SALON_STAFF',
  ADMIN: 'ADMIN',
  SUPER_ADMIN: 'SUPER_ADMIN',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const USER_ROLE_ARRAY = Object.values(USER_ROLES);
