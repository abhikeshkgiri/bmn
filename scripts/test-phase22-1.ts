require('./test-db-bootstrap.cjs');

import assert from 'node:assert/strict';
import { connectDB } from '@/lib/db';
import Salon from '@/models/Salon';
import Service from '@/models/Service';
import Barber from '@/models/Barber';
import { assertIsolatedTestDatabase } from './assert-isolated-test-db';

assertIsolatedTestDatabase();

async function main() {
  assertIsolatedTestDatabase();
  await connectDB();
  const salon = await Salon.findOne({ slug: 'bold-trim-club', isActive: true }).lean();
  assert.ok(salon, 'Bold Trim Club should exist after the development seed');
  assert.equal(salon?.address.city, 'Delhi');
  assert.equal(salon?.address.country, 'India');

  const [services, barbers, unknown] = await Promise.all([
    Service.countDocuments({ salon: salon?._id, isActive: true }),
    Barber.countDocuments({ salon: salon?._id, isActive: true }),
    Salon.countDocuments({ slug: 'does-not-exist', isActive: true }),
  ]);
  assert.ok(services >= 3, 'Seeded salon should have booking services');
  assert.ok(barbers >= 1, 'Seeded salon should have bookable barbers');
  assert.equal(unknown, 0);
  console.log('Phase 22.1 routing/data tests passed');
}

main().finally(() => process.exit(0));
