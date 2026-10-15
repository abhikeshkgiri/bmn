import assert from 'node:assert/strict';
import {
  CustomerAddressSchema,
  CustomerProfileUpdateSchema,
} from '../src/validations/customer-profile.schema';
import { USER_ROLES } from '../src/constants/roles';
import { getDashboardPathForRole, getPostLoginPath } from '../src/utils/dashboard-route';
import { isDatabaseUnavailableError } from '../src/lib/db-errors';

const validAddress = {
  label: 'Home',
  name: 'Test Customer',
  phone: '',
  addressLine1: '123 Test Road',
  addressLine2: '',
  area: '',
  city: 'Test City',
  state: 'Test State',
  postalCode: '12345',
  isDefault: false,
};

assert.equal(CustomerProfileUpdateSchema.safeParse({ name: 'Test Customer' }).success, true);
assert.equal(
  CustomerProfileUpdateSchema.safeParse({
    notificationPreferences: { inApp: false, push: true },
  }).success,
  true,
);
assert.equal(
  CustomerProfileUpdateSchema.safeParse({
    notificationPreferences: { inApp: false, push: 'yes' },
  }).success,
  false,
);
assert.equal(
  CustomerProfileUpdateSchema.safeParse({
    notificationPreferences: { inApp: false, push: true, marketing: true },
  }).success,
  false,
);
assert.equal(CustomerProfileUpdateSchema.safeParse({ avatar: 'https://example.com/photo.jpg' }).success, true);
assert.equal(CustomerProfileUpdateSchema.safeParse({ avatar: 'javascript:alert(1)' }).success, false);
assert.equal(CustomerProfileUpdateSchema.safeParse({ role: 'ADMIN' }).success, false);
assert.equal(CustomerProfileUpdateSchema.safeParse({ name: 'A' }).success, false);
assert.equal(CustomerProfileUpdateSchema.safeParse({}).success, false);
assert.equal(getDashboardPathForRole(USER_ROLES.CUSTOMER), '/dashboard');
assert.equal(getDashboardPathForRole(USER_ROLES.SALON_OWNER), '/dashboard/salon');
assert.equal(getDashboardPathForRole(USER_ROLES.SALON_STAFF), null);
assert.equal(getDashboardPathForRole(USER_ROLES.BARBER), '/dashboard/barber');
assert.equal(getDashboardPathForRole(USER_ROLES.ADMIN), '/admin');
assert.equal(getDashboardPathForRole(USER_ROLES.SUPER_ADMIN), '/admin');
assert.equal(getPostLoginPath(USER_ROLES.SALON_OWNER), '/dashboard/salon');
assert.equal(getPostLoginPath(USER_ROLES.SALON_OWNER, '/dashboard'), '/dashboard/salon');
assert.equal(getPostLoginPath(USER_ROLES.SALON_OWNER, '/dashboard/bookings'), '/dashboard/salon');
assert.equal(getPostLoginPath(USER_ROLES.SALON_OWNER, '/dashboard/salon?tab=team'), '/dashboard/salon?tab=team');
assert.equal(getPostLoginPath(USER_ROLES.CUSTOMER, '/dashboard/salon'), '/dashboard');
assert.equal(getPostLoginPath(USER_ROLES.SALON_OWNER, '/salon/onboarding'), '/salon/onboarding');
assert.equal(getPostLoginPath(USER_ROLES.BARBER, '/admin'), '/dashboard/barber');
assert.equal(getPostLoginPath(USER_ROLES.SALON_STAFF), null);
assert.equal(isDatabaseUnavailableError(Object.assign(new Error('offline'), { name: 'MongooseServerSelectionError' })), true);
assert.equal(isDatabaseUnavailableError(new Error('invalid OTP')), false);

assert.equal(CustomerAddressSchema.safeParse(validAddress).success, true);
assert.equal(CustomerAddressSchema.safeParse({ ...validAddress, customer: 'another-user' }).success, false);
assert.equal(CustomerAddressSchema.safeParse({ ...validAddress, latitude: 10 }).success, false);
assert.equal(CustomerAddressSchema.safeParse({ ...validAddress, latitude: 91, longitude: 0 }).success, false);
assert.equal(CustomerAddressSchema.safeParse({ ...validAddress, postalCode: '' }).success, false);

console.log('Customer profile schema tests passed.');
