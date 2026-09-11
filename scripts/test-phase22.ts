import assert from 'node:assert/strict';
import { USER_ROLES } from '@/constants/roles';
import { isAdminRole, requireAdminAccess, createAdminSummary } from '@/lib/admin';

assert.equal(isAdminRole(USER_ROLES.ADMIN), true);
assert.equal(isAdminRole(USER_ROLES.SUPER_ADMIN), true);
assert.equal(isAdminRole(USER_ROLES.CUSTOMER), false);
assert.equal(isAdminRole(USER_ROLES.SALON_OWNER), false);

const summary = createAdminSummary({
  totalCustomers: 20,
  totalSalons: 10,
  totalBarbers: 15,
  totalBookings: 45,
  completedBookings: 25,
  cancelledBookings: 5,
  totalRevenue: 50000,
  pendingSalonApprovals: 2,
  pendingBarberApprovals: 3,
  pendingReviews: 7,
  activeMemberships: 12,
  couponUsage: 9,
});

assert.equal(summary.totalCustomers, 20);
assert.equal(summary.totalSalons, 10);
assert.equal(summary.pendingReviews, 7);

assert.throws(() => requireAdminAccess({ role: USER_ROLES.CUSTOMER, isActive: true } as never), /permission/i);
assert.doesNotThrow(() => requireAdminAccess({ role: USER_ROLES.ADMIN, isActive: true } as never));

console.log('Phase 22 critical tests passed');
