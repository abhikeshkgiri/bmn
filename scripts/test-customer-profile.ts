import assert from 'node:assert/strict';
import {
  CustomerAddressSchema,
  CustomerProfileUpdateSchema,
} from '../src/validations/customer-profile.schema';

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

assert.equal(CustomerAddressSchema.safeParse(validAddress).success, true);
assert.equal(CustomerAddressSchema.safeParse({ ...validAddress, customer: 'another-user' }).success, false);
assert.equal(CustomerAddressSchema.safeParse({ ...validAddress, latitude: 10 }).success, false);
assert.equal(CustomerAddressSchema.safeParse({ ...validAddress, latitude: 91, longitude: 0 }).success, false);
assert.equal(CustomerAddressSchema.safeParse({ ...validAddress, postalCode: '' }).success, false);

console.log('Customer profile schema tests passed.');
