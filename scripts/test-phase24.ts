import assert from 'node:assert/strict';
import { BarberOnboardingSchema } from '@/services/onboarding.service';
import { USER_ROLES } from '@/constants/roles';
import { connectDB } from '@/lib/db';
import Salon from '@/models/Salon';
import Barber from '@/models/Barber';

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

async function verifySeedRegression() {
  await connectDB();
  const salon = await Salon.findOne({ slug: 'bold-trim-club', isActive: true, isVerified: true }).lean();
  assert.ok(salon, 'Bold Trim Club remains publicly eligible');
  const barberCount = await Barber.countDocuments({ salon: salon?._id, isActive: true, isVerified: true });
  assert.ok(barberCount > 0, 'Existing approved salon still has approved barbers');
}

verifySeedRegression().finally(() => {
  console.log('Phase 24 focused tests passed');
  process.exit(0);
});
