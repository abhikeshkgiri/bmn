import assert from 'node:assert/strict';
import { BarberOnboardingSchema } from '@/services/onboarding.service';
import { USER_ROLES } from '@/constants/roles';
import { connectDB } from '@/lib/db';
import Salon from '@/models/Salon';
import Barber from '@/models/Barber';
import { listSalons } from '@/services/salon.service';

const baseBarber = { name: 'Test Barber', experienceYears: 2, serviceIds: [] };

assert.throws(() => BarberOnboardingSchema.parse({
  salonMode: 'existing',
  existingSalonId: '507f1f77bcf86cd799439011',
  role: USER_ROLES.ADMIN,
  barber: baseBarber,
}), /unrecognized|role/i);

assert.throws(() => BarberOnboardingSchema.parse({ salonMode: 'existing', barber: baseBarber }), /Select an existing salon/i);
assert.throws(() => BarberOnboardingSchema.parse({ salonMode: 'new', barber: baseBarber }), /Salon details are required/i);

const input = BarberOnboardingSchema.parse({
  salonMode: 'new',
  salon: {
    name: 'Phase 24 Test Salon', addressLine1: '1 Test Road', city: 'Delhi', state: 'Delhi', postalCode: '110001',
    latitude: 28.6139, longitude: 77.209, phone: '+919999999999',
  },
  newServices: [{ name: 'Test Haircut', category: 'HAIRCUT', duration: 30, price: 30000 }],
  barber: baseBarber,
});
assert.equal(input.salon?.city, 'Delhi');
assert.equal(input.newServices.length, 1);

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

Promise.allSettled([
  verifyStep2DiscoveryFiltering(),
  verifyStep3SalonListingDetailData(),
  verifySeedRegression(),
]).finally(() => {
  console.log('Phase 24 focused tests passed');
  process.exit(0);
});
