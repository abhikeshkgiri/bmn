import { AUTH_ERRORS } from '@/constants/auth';
import { USER_ROLES, type UserRole } from '@/constants/roles';
import type { AuthUser } from '@/types';

export function isAdminRole(role?: UserRole | string | null): boolean {
  return role === USER_ROLES.ADMIN || role === USER_ROLES.SUPER_ADMIN;
}

export function requireAdminAccess(currentUser: AuthUser | null | undefined): AuthUser {
  if (!currentUser) {
    throw new Error(AUTH_ERRORS.UNAUTHORIZED);
  }

  if (!currentUser.isActive) {
    throw new Error(AUTH_ERRORS.USER_INACTIVE);
  }

  if (!isAdminRole(currentUser.role)) {
    throw new Error(AUTH_ERRORS.FORBIDDEN);
  }

  return currentUser;
}

export function createAdminSummary(input: {
  totalCustomers?: number;
  totalSalons?: number;
  totalBarbers?: number;
  totalBookings?: number;
  completedBookings?: number;
  cancelledBookings?: number;
  totalRevenue?: number;
  pendingSalonApprovals?: number;
  pendingBarberApprovals?: number;
  pendingReviews?: number;
  activeMemberships?: number;
  couponUsage?: number;
}) {
  return {
    totalCustomers: input.totalCustomers ?? 0,
    totalSalons: input.totalSalons ?? 0,
    totalBarbers: input.totalBarbers ?? 0,
    totalBookings: input.totalBookings ?? 0,
    completedBookings: input.completedBookings ?? 0,
    cancelledBookings: input.cancelledBookings ?? 0,
    totalRevenue: input.totalRevenue ?? 0,
    pendingSalonApprovals: input.pendingSalonApprovals ?? 0,
    pendingBarberApprovals: input.pendingBarberApprovals ?? 0,
    pendingReviews: input.pendingReviews ?? 0,
    activeMemberships: input.activeMemberships ?? 0,
    couponUsage: input.couponUsage ?? 0,
  };
}
