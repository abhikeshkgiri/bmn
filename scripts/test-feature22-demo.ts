import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { SUPPORTED_LAUNCH_CITIES, normalizeSupportedSalonLocation } from '../src/constants/launch-cities';
import { BarberCreateSchema } from '../src/validations/barber.schema';
import { SalonCreateSchema } from '../src/validations/salon.schema';
import { ServiceCreateSchema } from '../src/validations/service.schema';
import {
  DEMO_BARBER_SPECIALIZATIONS,
  DEMO_IMAGE_PATH,
  DEMO_SALONS,
  DEMO_SERVICE_FIXTURES,
  getFeature22DemoKeys,
  validateFeature22DemoData,
} from './feature22-demo-data';

assert.deepEqual(validateFeature22DemoData(), []);
assert.equal(DEMO_SALONS.length, 20);
assert.equal(new Set(DEMO_SALONS.map(({ name }) => name)).size, 20);
assert.equal(new Set(DEMO_SALONS.map(({ slug }) => slug)).size, 20);
assert.deepEqual(
  new Set(DEMO_SALONS.map(({ city }) => city)),
  new Set(SUPPORTED_LAUNCH_CITIES.map(({ city }) => city)),
);
assert.equal(DEMO_SALONS.reduce((count, salon) => count + Number(Boolean(normalizeSupportedSalonLocation(
  salon.city,
  SUPPORTED_LAUNCH_CITIES.find(({ city }) => city === salon.city)?.state ?? '',
))), 0), 20);
assert.equal(getFeature22DemoKeys().length, 140);
assert.equal(new Set(getFeature22DemoKeys()).size, 140);
assert.equal(
  existsSync(path.join(process.cwd(), 'public', DEMO_IMAGE_PATH.slice(1))),
  true,
);

const validId = '64b000000000000000000000';
const salon = DEMO_SALONS[0];
const state = SUPPORTED_LAUNCH_CITIES.find(({ city }) => city === salon.city)?.state;
assert(state);
assert.doesNotThrow(() => SalonCreateSchema.parse({
  name: salon.name,
  slug: salon.slug,
  description: `Demo listing. ${salon.concept}`,
  address: {
    addressLine1: salon.addressLine1,
    area: salon.area,
    landmark: salon.landmark,
    city: salon.city,
    state,
    postalCode: salon.postalCode,
    country: 'India',
  },
  location: { type: 'Point', coordinates: salon.coordinates },
  contact: { phone: '+9993000001', email: 'hello.demo@example.com' },
  openingHours: {
    monday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
    tuesday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
    wednesday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
    thursday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
    friday: { isOpen: true, openTime: '10:00', closeTime: '21:00' },
    saturday: { isOpen: true, openTime: '10:00', closeTime: '21:00' },
    sunday: { isOpen: false },
  },
  facilities: [],
}));
for (const service of DEMO_SERVICE_FIXTURES) {
  assert.doesNotThrow(() => ServiceCreateSchema.parse({
    salonId: validId,
    name: service.name,
    description: service.description,
    category: service.category,
    duration: service.duration,
    price: service.price,
  }));
}
assert.doesNotThrow(() => BarberCreateSchema.parse({
  salonId: validId,
  userId: validId,
  name: 'Demo Barber',
  experienceYears: 5,
  specializations: [...DEMO_BARBER_SPECIALIZATIONS],
  services: [validId],
  offersHomeService: false,
}));

console.log('Feature 22 demo fixture checks passed.');
