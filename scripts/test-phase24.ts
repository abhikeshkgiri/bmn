require('./test-db-bootstrap.cjs');

import assert from 'node:assert/strict';
import { BarberOnboardingSchema } from '@/services/onboarding.service';
import { USER_ROLES } from '@/constants/roles';
import { connectDB } from '@/lib/db';
import Salon from '@/models/Salon';
import Barber from '@/models/Barber';
import Service from '@/models/Service';
import { BookingCreateSchema, AvailabilityQuerySchema } from '@/validations/booking.schema';
import { BarberUpdateSchema } from '@/validations/barber.schema';
import { listSalons } from '@/services/salon.service';
import { getAvailableSlots } from '@/services/booking.service';
import { assertIsolatedTestDatabase } from './assert-isolated-test-db';

assertIsolatedTestDatabase();

const baseBarber = { name: 'Test Barber', experienceYears: 2, serviceIds: [] };

assert.throws(() => BarberOnboardingSchema.parse({
  salonMode: 'existing',
  existingSalonId: '507f1f77bcf86cd799439011',
  role: USER_ROLES.ADMIN,
  barber: baseBarber,
}), /unrecognized|role/i);

assert.throws(() => BarberOnboardingSchema.parse({ salonMode: 'existing', barber: baseBarber }), /Select an existing salon/i);
assert.throws(() => BarberOnboardingSchema.parse({
  salonMode: 'new',
  salon: { name: 'Untrusted Salon' },
  barber: baseBarber,
}), /Invalid input|expected|unrecognized/i);
assert.throws(() => BarberOnboardingSchema.parse({
  salonMode: 'existing',
  existingSalonId: '507f1f77bcf86cd799439011',
  barber: baseBarber,
}), /at least 1|Select at least one/i);

async function verifyStep2DiscoveryFiltering() {
  await connectDB();
  const areaResults = await listSalons({
    page: 1,
    limit: 50,
    city: 'Delhi',
    area: 'Mayur Vihar',
    isActive: true,
    isVerified: true,
  });

  assert.ok(areaResults.total >= 1, 'Delhi area locality should resolve to real public salon data');
  assert.ok(areaResults.salons.every((salon) => /mayur vihar/i.test(salon.address?.area || '')), 'Area filter should be applied in the server listing layer');
}

async function verifyStep3SalonListingDetailData() {
  await connectDB();
  const publicResults = await listSalons({
    page: 1,
    limit: 5,
    city: 'Delhi',
    isActive: true,
    isVerified: true,
    sortBy: 'newest',
  });

  assert.ok(publicResults.total >= 1, 'Public listing should reveal a real approved/active salon from the database');
  assert.ok(publicResults.salons.length >= 1, 'Public listing should surface at least one real salon card');
  assert.ok(publicResults.salons.every((salon) => salon.isActive && salon.isVerified), 'Public list should respect existing visible-service state gates');
  assert.ok(publicResults.salons.every((salon) => Boolean(salon.address?.city)), 'Public list should expose the real city field from the salon address model');

  const detailSalon = await Salon.findOne({ slug: 'bold-trim-club', isActive: true, isVerified: true }).lean();
  assert.ok(detailSalon, 'The real detail route source should resolve a canonical, public salon slug from the model');
  assert.ok(detailSalon.slug === 'bold-trim-club', 'The slug path should match the canonical public slug already persisted in the database');
  assert.equal(typeof detailSalon.name, 'string', 'Salon detail object should still expose a displayable public name');
}

async function verifySeedRegression() {
  await connectDB();
  const salon = await Salon.findOne({ slug: 'bold-trim-club', isActive: true, isVerified: true }).lean();
  assert.ok(salon, 'Bold Trim Club remains publicly eligible');
  const barberCount = await Barber.countDocuments({ salon: salon?._id, isActive: true, isVerified: true });
  assert.ok(barberCount > 0, 'Existing approved salon still has approved barbers');
}

async function verifyStep5BookingFlowContract() {
  await connectDB();
  const salon = await Salon.findOne({ slug: 'bold-trim-club', isActive: true, isVerified: true }).lean();
  assert.ok(salon, 'Canonical salon detail should resolve real salon data for Step 5');

  const service = await Service.findOne({ salon: salon!._id, isActive: true }).lean();
  assert.ok(service, 'Service model should expose a real active service for Step 5 booking selection');

  const barber = await Barber.findOne({ salon: salon!._id, isActive: true, isAvailable: true, services: service!._id }).lean();
  assert.ok(barber, 'Barber model should expose a real active barber that can serve the selected service');

  const bookingInput = BookingCreateSchema.parse({
    salonId: salon!._id.toString(),
    barberId: barber!._id.toString(),
    serviceId: service!._id.toString(),
    appointmentDate: new Date().toISOString().slice(0, 10),
    startTime: '10:00',
    bookingType: 'SALON',
    customerNotes: undefined,
  });
  assert.equal(bookingInput.bookingType, 'SALON');

  const availabilityQuery = AvailabilityQuerySchema.parse({
    salonId: salon!._id.toString(),
    barberId: barber!._id.toString(),
    serviceId: service!._id.toString(),
    date: new Date().toISOString().slice(0, 10),
  });
  assert.equal(availabilityQuery.salonId, salon!._id.toString());

  const availability = await getAvailableSlots(
    salon!._id.toString(),
    barber!._id.toString(),
    service!._id.toString(),
    availabilityQuery.date
  );
  assert.ok(Array.isArray(availability.slots), 'Availability endpoint should return a slots array');
  assert.equal(typeof availability.serviceDuration, 'number');
}

async function verifyStep7BarberArchitectureContract() {
  await connectDB();
  const salon = await Salon.findOne({ slug: 'bold-trim-club', isActive: true, isVerified: true }).lean();
  assert.ok(salon, 'Canonical salon record should remain usable for a real barber-salon association');

  const barber = await Barber.findOne({ salon: salon!._id, isActive: true, isVerified: true }).populate(['salon', 'services']).lean();
  assert.ok(barber, 'The repo should expose at least one active real barber tied to a real salon for Step 7 policy review');
  assert.equal(typeof barber.name, 'string');
  assert.equal(typeof barber.salon, 'object');
  assert.ok(Array.isArray(barber.services), 'Barber services must remain an array of service object IDs');

  const parsedProfile = BarberUpdateSchema.parse({
    name: barber.name,
    bio: barber.bio || '',
    profileImage: barber.profileImage || '',
    experienceYears: barber.experienceYears || 0,
    specializations: barber.specializations || [],
    services: (barber.services || []).map((s: { _id?: string } | string) => typeof s === 'string' ? s : s._id?.toString()).filter(Boolean),
    offersHomeService: Boolean(barber.offersHomeService),
    homeServiceRadius: barber.homeServiceRadius || 10,
  });
  assert.equal(parsedProfile.name, barber.name);

  const availability = await getAvailableSlots(
    salon!._id.toString(),
    barber!._id.toString(),
    (barber.services as Array<{ _id?: string } | string>).map((s) => typeof s === 'string' ? s : s._id?.toString()).filter(Boolean)[0] as string,
    new Date().toISOString().slice(0, 10)
  );
  assert.ok(Array.isArray(availability.slots), 'Availability route must continue to expose a real slots array for the barber/salon association');
}

(async () => {
  try {
    assertIsolatedTestDatabase();
    await Promise.all([
      verifyStep2DiscoveryFiltering(),
      verifyStep3SalonListingDetailData(),
      verifySeedRegression(),
      verifyStep5BookingFlowContract(),
      verifyStep7BarberArchitectureContract(),
    ]);
    console.log('Phase 24 focused tests passed');
  } catch (error) {
    console.error('Phase 24 focused tests failed:', error);
    process.exitCode = 1;
  }
})();
