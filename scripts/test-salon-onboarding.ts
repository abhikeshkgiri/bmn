import assert from 'node:assert/strict';
import { USER_ROLES } from '../src/constants/roles';
import { isAdminRole } from '../src/lib/admin';
import { normalizeSupportedSalonLocation } from '../src/constants/launch-cities';
import { isSalonApproved } from '../src/utils/salon-approval';
import { canManageSalon } from '../src/utils/salon-authorization';
import { canUpdateAccountProfile } from '../src/utils/profile-authorization';
import { isDatabaseUnavailableError } from '../src/lib/db-errors';
import { getSalonApplicationBlockers } from '../src/utils/salon-application-readiness';
import { detectAllowedUploadType, getSalonUploadFolderName } from '../src/lib/salon-uploads';
import { SalonApprovalDecisionSchema, SalonVerificationSchema } from '../src/validations/admin-salon.schema';
import { CustomerProfileUpdateSchema } from '../src/validations/customer-profile.schema';
import {
  SalonCreateSchema,
  SalonOwnerUpdateSchema,
  SalonUpdateSchema,
} from '../src/validations/salon.schema';

const openDay = { isOpen: true, openTime: '09:00', closeTime: '20:00' };
const closedDay = { isOpen: false };
const validSalon = {
  name: '  Sample Salon ',
  slug: 'sample-salon',
  salonType: 'BARBERSHOP',
  address: {
    addressLine1: '  123 Main Road ',
    city: ' Delhi ',
    state: ' Delhi ',
    postalCode: '110001',
  },
  location: { type: 'Point', coordinates: [77.2, 28.6] },
  contact: { phone: '9876543210', email: ' OWNER@EXAMPLE.COM ' },
  openingHours: {
    monday: openDay,
    tuesday: openDay,
    wednesday: openDay,
    thursday: openDay,
    friday: openDay,
    saturday: openDay,
    sunday: closedDay,
  },
};

const parsed = SalonCreateSchema.parse(validSalon);
assert.equal(parsed.name, 'Sample Salon');
assert.equal(parsed.address.addressLine1, '123 Main Road');
assert.equal(parsed.contact.email, 'owner@example.com');
assert.equal(SalonCreateSchema.safeParse({ ...validSalon, salonType: 'UNSUPPORTED' }).success, false);
assert.deepEqual(normalizeSupportedSalonLocation(' Delhi ', 'DELHI'), { city: 'Delhi', state: 'Delhi' });
assert.equal(normalizeSupportedSalonLocation('Delhi', 'Uttar Pradesh'), undefined);
assert.equal(normalizeSupportedSalonLocation('Unsupported City', 'Unknown'), undefined);

assert.equal(SalonCreateSchema.safeParse({
  ...validSalon,
  location: { type: 'Point', coordinates: [181, 28.6] },
}).success, false);
assert.equal(SalonCreateSchema.safeParse({
  ...validSalon,
  location: { type: 'Point', coordinates: [77.2] },
}).success, false);
assert.equal(SalonCreateSchema.safeParse({
  ...validSalon,
  logo: 'javascript:alert(1)',
}).success, false);
assert.equal(SalonCreateSchema.safeParse({
  ...validSalon,
  isVerified: true,
}).success, false);
assert.equal(SalonCreateSchema.safeParse({
  ...validSalon,
  approvalStatus: 'APPROVED',
}).success, false);
assert.equal(SalonCreateSchema.safeParse({
  ...validSalon,
  openingHours: { ...validSalon.openingHours, monday: { isOpen: true, openTime: '20:00', closeTime: '09:00' } },
}).success, false);
assert.equal(SalonCreateSchema.safeParse({
  ...validSalon,
  openingHours: { ...validSalon.openingHours, monday: { isOpen: true, openTime: '9am', closeTime: '8pm' } },
}).success, false);
assert.equal(SalonUpdateSchema.safeParse({ isVerified: true }).success, false);
assert.equal(SalonUpdateSchema.safeParse({ approvalStatus: 'APPROVED' }).success, false);
assert.equal(SalonUpdateSchema.safeParse({ owner: 'another-account' }).success, false);
assert.equal(SalonOwnerUpdateSchema.safeParse({ isActive: true }).success, false);
assert.equal(SalonOwnerUpdateSchema.safeParse({ logo: 'https://images.example/logo.png', images: ['https://images.example/interior.png'] }).success, true);
assert.equal(SalonOwnerUpdateSchema.safeParse({ logo: '/uploads/looks-salon-507f1f77bcf86cd799439011/logo/123e4567-e89b-12d3-a456-426614174000.png' }).success, true);
assert.equal(SalonOwnerUpdateSchema.safeParse({ logo: '/uploads/../private-uploads/document.pdf' }).success, false);
assert.equal(SalonOwnerUpdateSchema.safeParse({ images: ['javascript:alert(1)'] }).success, false);
assert.equal(SalonOwnerUpdateSchema.safeParse({ contact: { email: '', website: '' } }).success, true);
assert.equal(SalonOwnerUpdateSchema.parse({ logo: '', socialLinks: { instagram: '' } }).logo, '');
assert.equal(SalonOwnerUpdateSchema.safeParse({ socialLinks: { instagram: 'javascript:alert(1)' } }).success, false);
assert.equal(SalonOwnerUpdateSchema.safeParse({ facilities: ['UNSUPPORTED_FACILITY'] }).success, false);

assert.equal(canManageSalon('owner-1', 'owner-1', USER_ROLES.SALON_OWNER), true);
assert.equal(canManageSalon('owner-1', 'customer-1', USER_ROLES.CUSTOMER), false);
assert.equal(canManageSalon('owner-1', 'owner-1', USER_ROLES.CUSTOMER), false);
assert.equal(canManageSalon('owner-1', 'admin-1', USER_ROLES.ADMIN), true);
assert.equal(canUpdateAccountProfile(USER_ROLES.CUSTOMER), true);
assert.equal(canUpdateAccountProfile(USER_ROLES.SALON_OWNER), true);
assert.equal(canUpdateAccountProfile(USER_ROLES.SALON_STAFF), false);
assert.equal(canUpdateAccountProfile(USER_ROLES.BARBER), false);
assert.equal(canUpdateAccountProfile(USER_ROLES.ADMIN), false);
assert.equal(isDatabaseUnavailableError(Object.assign(new Error('selection failed'), { name: 'MongoServerSelectionError' })), true);
assert.equal(isDatabaseUnavailableError(Object.assign(new Error('validation failed'), { name: 'ValidationError' })), false);
assert.deepEqual(getSalonApplicationBlockers({ activeServiceCount: 0, barberProfileCount: 0 }), [
  'Add at least one active service before submitting.',
  'Add at least one barber profile before submitting.',
]);
assert.deepEqual(getSalonApplicationBlockers({ activeServiceCount: 1, barberProfileCount: 1 }), []);
assert.deepEqual(
  getSalonApplicationBlockers({ activeServiceCount: 1, barberProfileCount: 1, hasAadhaarDocument: false, hasPanDocument: false }),
  ['Upload the salon owner Aadhaar document before submitting.', 'Upload the salon owner PAN document before submitting.'],
);
assert.deepEqual(detectAllowedUploadType(Buffer.from('%PDF-1.7'), 'aadhaar'), { extension: 'pdf', contentType: 'application/pdf' });
assert.equal(detectAllowedUploadType(Buffer.from('%PDF-1.7'), 'logo'), null);
assert.equal(detectAllowedUploadType(Buffer.from('not an image'), 'logo'), null);
assert.equal(CustomerProfileUpdateSchema.safeParse({
  avatar: '/uploads/profiles/507f1f77bcf86cd799439011/123e4567-e89b-12d3-a456-426614174000.png',
}).success, true);
assert.equal(CustomerProfileUpdateSchema.safeParse({ avatar: '/uploads/.staging/file.png' }).success, false);
assert.equal(CustomerProfileUpdateSchema.safeParse({ avatar: '/uploads/../private/file.png' }).success, false);
assert.equal(getSalonUploadFolderName('Looks Salon', '507f1f77bcf86cd799439011'), 'looks-salon-507f1f77bcf86cd799439011');
assert.equal(isSalonApproved({ approvalStatus: 'PENDING', isVerified: true }), false);
assert.equal(isSalonApproved({ approvalStatus: 'APPROVED', isVerified: true }), true);
assert.equal(isSalonApproved({ approvalStatus: null, isVerified: true }), true);
assert.equal(isAdminRole(USER_ROLES.ADMIN), true);
assert.equal(isAdminRole(USER_ROLES.SUPER_ADMIN), true);
assert.equal(isAdminRole(USER_ROLES.SALON_OWNER), false);
assert.equal(SalonApprovalDecisionSchema.safeParse({ salonId: '507f1f77bcf86cd799439011', isVerified: true }).success, true);
assert.equal(SalonApprovalDecisionSchema.safeParse({ salonId: 'bad-id', isVerified: true }).success, false);
assert.equal(SalonApprovalDecisionSchema.safeParse({ salonId: '507f1f77bcf86cd799439011', isVerified: false }).success, false);
assert.equal(SalonApprovalDecisionSchema.safeParse({ salonId: '507f1f77bcf86cd799439011', isVerified: false, reason: '  Duplicate application  ' }).success, true);
assert.equal(SalonApprovalDecisionSchema.safeParse({ salonId: '507f1f77bcf86cd799439011', isVerified: true, approvalStatus: 'APPROVED' }).success, false);
assert.equal(SalonVerificationSchema.safeParse({ isVerified: false }).success, true);
assert.equal(SalonVerificationSchema.safeParse({ isVerified: false, approvalStatus: 'PENDING' }).success, false);

console.log('Salon onboarding validation and authorization tests passed.');
