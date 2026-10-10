import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { BOOKING_STATUS, BOOKING_TYPE, PAYMENT_STATUS } from '../src/constants/booking';
import Booking from '../src/models/Booking';
import Barber from '../src/models/Barber';
import Salon from '../src/models/Salon';
import Service from '../src/models/Service';
import User from '../src/models/User';
import { createBookingTestFixtures } from './booking-test-fixtures';

const fixtures = createBookingTestFixtures();
const documents = [
  fixtures.owner,
  ...fixtures.customers,
  ...fixtures.barberUsers,
  fixtures.salon,
  ...fixtures.barbers,
  fixtures.service,
  ...fixtures.baselineBookings,
];

async function validationErrors(document: { validate: () => Promise<unknown> }) {
  try {
    await document.validate();
    return {};
  } catch (error) {
    assert.ok(error instanceof mongoose.Error.ValidationError);
    return error.errors;
  }
}

async function main() {
  for (const document of documents) {
    await document.validate();
  }

  assert.equal(fixtures.owner.role, 'SALON_OWNER');
  assert.ok(fixtures.customers.every((customer) => customer.role === 'CUSTOMER'));
  assert.ok(fixtures.barberUsers.every((user) => user.role === 'BARBER'));
  assert.equal(fixtures.salon.owner.toString(), fixtures.owner._id.toString());
  assert.equal(fixtures.salon.approvalStatus, 'APPROVED');
  assert.ok(fixtures.barbers.every((barber, index) =>
    barber.salon.toString() === fixtures.salon._id.toString() &&
    barber.user.toString() === fixtures.barberUsers[index]._id.toString() &&
    barber.services?.[0].toString() === fixtures.service._id.toString(),
  ));
  assert.equal(fixtures.service.salon.toString(), fixtures.salon._id.toString());
  assert.ok(fixtures.baselineBookings.every((booking) =>
    booking.customer.toString() === fixtures.customers[0]._id.toString() &&
    booking.salon.toString() === fixtures.salon._id.toString() &&
    fixtures.barbers.some((barber) => barber._id.toString() === booking.barber.toString()) &&
    booking.service.toString() === fixtures.service._id.toString() &&
    Object.values(BOOKING_STATUS).includes(booking.status) &&
    Object.values(PAYMENT_STATUS).includes(booking.paymentStatus) &&
    Object.values(BOOKING_TYPE).includes(booking.bookingType),
  ));

  const hasUniqueIndex = (model: typeof User | typeof Salon | typeof Barber | typeof Service | typeof Booking, fields: string[]) =>
    model.schema.indexes().some(([indexedFields, options]) =>
      options?.unique &&
      fields.every((field) => Object.hasOwn(indexedFields, field)),
    );
  assert.ok(hasUniqueIndex(User, ['phone']));
  assert.ok(hasUniqueIndex(Salon, ['slug']));
  assert.ok(hasUniqueIndex(Barber, ['slug']));
  assert.ok(hasUniqueIndex(Service, ['salon', 'slug']));
  assert.ok(hasUniqueIndex(Booking, ['bookingNumber']));
  assert.equal(
    new Set([
      fixtures.salon.slug,
      ...fixtures.barbers.map((barber) => barber.slug),
      fixtures.service.slug,
      ...fixtures.baselineBookings.map((booking) => booking.bookingNumber),
    ]).size,
    1 + fixtures.barbers.length + 1 + fixtures.baselineBookings.length,
  );
  assert.equal(
    new Set([fixtures.owner, ...fixtures.customers, ...fixtures.barberUsers].map((user) => user.phone)).size,
    1 + fixtures.customers.length + fixtures.barberUsers.length,
  );

  const missingUser = new User({});
  const missingUserErrors = await validationErrors(missingUser);
  assert.ok(missingUserErrors.name);
  assert.ok(missingUserErrors.phone);
  const invalidUser = new User(fixtures.owner.toObject());
  invalidUser.set('role', 'INVALID_ROLE');
  assert.ok((await validationErrors(invalidUser)).role);

  const missingSalon = new Salon({});
  const missingSalonErrors = await validationErrors(missingSalon);
  for (const field of ['name', 'slug', 'owner', 'address', 'location', 'openingHours']) {
    assert.ok(missingSalonErrors[field], `Salon should require ${field}`);
  }
  const invalidSalon = new Salon(fixtures.salon.toObject());
  invalidSalon.set('approvalStatus', 'INVALID_APPROVAL');
  assert.ok((await validationErrors(invalidSalon)).approvalStatus);

  const missingBarber = new Barber({});
  const missingBarberErrors = await validationErrors(missingBarber);
  for (const field of ['user', 'salon', 'name', 'slug']) {
    assert.ok(missingBarberErrors[field], `Barber should require ${field}`);
  }
  const invalidBarber = new Barber({
    ...fixtures.barbers[0].toObject(),
    specializations: ['INVALID_SPECIALIZATION'],
  });
  const invalidBarberErrors = await validationErrors(invalidBarber);
  assert.ok(Object.keys(invalidBarberErrors).some((field) => field.startsWith('specializations')));

  const invalidService = new Service({
    salon: fixtures.salon._id,
    name: 'Invalid Service',
    slug: 'invalid-service',
    category: 'NOT_A_CATEGORY',
    duration: 30,
    price: 500,
  });
  assert.ok((await validationErrors(invalidService)).category);

  const baselineBooking = fixtures.baselineBookings[0];
  assert.ok(baselineBooking);
  const invalidBooking = new Booking({
    ...baselineBooking.toObject(),
    bookingNumber: 'BMN-TEST-INVALID',
    bookingType: 'IN_SALON',
    status: 'INVALID_STATUS',
    paymentStatus: 'INVALID_PAYMENT_STATUS',
  });
  const invalidBookingErrors = await validationErrors(invalidBooking);
  assert.ok(invalidBookingErrors.bookingType);
  assert.ok(invalidBookingErrors.status);
  assert.ok(invalidBookingErrors.paymentStatus);

  const missingServiceFields = new Service({
    salon: fixtures.salon._id,
    name: 'Missing Fields',
    slug: 'missing-fields',
  });
  const missingServiceErrors = await validationErrors(missingServiceFields);
  for (const field of ['category', 'duration', 'price']) {
    assert.ok(missingServiceErrors[field], `Service should require ${field}`);
  }

  const missingBookingErrors = await validationErrors(new Booking({}));
  for (const field of [
    'bookingNumber',
    'customer',
    'salon',
    'barber',
    'service',
    'appointmentDate',
    'startTime',
    'endTime',
    'duration',
    'servicePrice',
    'totalAmount',
    'bookingType',
  ]) {
    assert.ok(missingBookingErrors[field], `Booking should require ${field}`);
  }

  console.log('Synthetic booking fixtures validate against current Mongoose schemas.');
}

main().catch((error: unknown) => {
  console.error(
    'Synthetic booking fixture validation failed:',
    error instanceof Error ? error.message : 'Unknown error',
  );
  process.exitCode = 1;
});
