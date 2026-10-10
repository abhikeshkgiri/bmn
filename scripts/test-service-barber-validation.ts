import assert from 'node:assert/strict';
import { SERVICE_CATEGORY_ARRAY } from '../src/constants/services';
import { BarberCreateSchema, BarberUpdateSchema } from '../src/validations/barber.schema';
import {
  isDiscountPriceValid,
  ServiceCreateSchema,
  ServiceUpdateSchema,
} from '../src/validations/service.schema';

const salonId = '64b000000000000000000001';
const userId = '64b000000000000000000002';
const serviceId = '64b000000000000000000003';
const category = SERVICE_CATEGORY_ARRAY[0];

const service = {
  salonId,
  name: '  Haircut  ',
  category,
  duration: 15,
  price: 1000,
};

assert.equal(ServiceCreateSchema.parse(service).name, 'Haircut');
assert.equal(ServiceCreateSchema.safeParse({ ...service, salonId: 'z'.repeat(24) }).success, false);
assert.equal(ServiceCreateSchema.safeParse({ ...service, duration: 14 }).success, false);
assert.equal(ServiceCreateSchema.safeParse({ ...service, duration: 481 }).success, false);
assert.equal(ServiceCreateSchema.safeParse({ ...service, price: -1 }).success, false);
assert.equal(ServiceCreateSchema.safeParse({ ...service, price: 0 }).success, true);
assert.equal(ServiceCreateSchema.safeParse({ ...service, discountPrice: 1001 }).success, false);
assert.equal(ServiceCreateSchema.safeParse({ ...service, discountPrice: 1000 }).success, true);
assert.equal(ServiceUpdateSchema.safeParse({ price: 500, discountPrice: 501 }).success, false);
assert.equal(ServiceUpdateSchema.safeParse({ discountPrice: 500 }).success, true);
assert.equal(ServiceUpdateSchema.safeParse({ duration: 5 }).success, false);
assert.equal(isDiscountPriceValid(1000, 1001), false);
assert.equal(isDiscountPriceValid(500, 500), true);
assert.equal(isDiscountPriceValid(500, null), true);

const barber = {
  salonId,
  userId,
  name: '  Alex Barber  ',
  experienceYears: 5,
  services: [serviceId],
};
assert.equal(BarberCreateSchema.parse(barber).name, 'Alex Barber');
assert.equal(BarberCreateSchema.safeParse({ ...barber, userId: 'x'.repeat(24) }).success, false);
assert.equal(BarberCreateSchema.safeParse({ ...barber, services: ['not-an-object-id'] }).success, false);
assert.equal(BarberUpdateSchema.safeParse({ services: ['64b000000000000000000004'] }).success, true);
assert.equal(BarberUpdateSchema.safeParse({ services: ['bad'] }).success, false);

console.log('Service and barber validation tests passed.');
