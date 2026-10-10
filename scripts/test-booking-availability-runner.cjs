process.env.TS_NODE_PROJECT = 'tsconfig.scripts.json';
require('ts-node/register/transpile-only');
require('tsconfig-paths/register');
require('./test-booking-availability.ts');

const assert = require('node:assert/strict');

async function testAvailabilityReadDoesNotWrite() {
  const db = require('../src/lib/db');
  const bookingModule = require('../src/models/Booking');
  const salonModule = require('../src/models/Salon');
  const barberModule = require('../src/models/Barber');
  const serviceModule = require('../src/models/Service');
  const userModule = require('../src/models/User');
  const leaveModule = require('../src/models/Leave');
  const Booking = bookingModule.default || bookingModule;
  const Salon = salonModule.default || salonModule;
  const Barber = barberModule.default || barberModule;
  const Service = serviceModule.default || serviceModule;
  const User = userModule.default || userModule;
  const Leave = leaveModule.default || leaveModule;
  const originals = [];
  let updateManyCalls = 0;
  let capturedBookingFilter;

  function stub(target, key, value) {
    originals.push([target, key, target[key]]);
    target[key] = value;
  }

  stub(db, 'connectDB', async () => undefined);
  stub(Salon, 'findById', () => ({
    select: async () => ({
      openingHours: Object.fromEntries(
        ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
          .map((day) => [day, { isOpen: true, openTime: '09:00', closeTime: '10:00' }]),
      ),
      capacity: 2,
      slotIntervalMinutes: 30,
      isActive: true,
      isVerified: true,
      approvalStatus: 'APPROVED',
      address: { city: 'Delhi', state: 'Delhi' },
    }),
  }));
  const salonModuleId = require('mongoose').Types.ObjectId;
  const salonId = new salonModuleId();
  const barberId = new salonModuleId();
  const serviceId = new salonModuleId();
  stub(Barber, 'findOne', () => ({
    select: async () => ({ services: [serviceId] }),
  }));
  stub(User, 'findOne', () => ({
    select: async () => ({ _id: new salonModuleId() }),
  }));
  stub(Service, 'findById', async () => ({
    _id: serviceId,
    salon: salonId,
    isActive: true,
    duration: 30,
  }));
  stub(Leave, 'find', () => ({ select: async () => [] }));
  stub(Booking, 'find', (filter) => {
    capturedBookingFilter = filter;
    return {
      select: async () => {
        const expiredHold = {
          status: 'PENDING',
          holdExpiresAt: new Date(Date.now() - 60_000),
          startTime: '09:00',
          endTime: '09:30',
        };
        const pendingBranch = filter.$or.find((branch) => branch.status === 'PENDING');
        assert.ok(pendingBranch.holdExpiresAt.$gt instanceof Date);
        return expiredHold.holdExpiresAt > pendingBranch.holdExpiresAt.$gt ? [expiredHold] : [];
      },
    };
  });
  stub(Booking, 'updateMany', async () => {
    updateManyCalls += 1;
    return { acknowledged: true, modifiedCount: 0 };
  });

  try {
    const { getAvailableSlots } = require('../src/services/booking.service');
    const result = await getAvailableSlots(
      salonId.toString(),
      barberId.toString(),
      serviceId.toString(),
      new Date().toISOString().slice(0, 10),
    );

    assert.equal(updateManyCalls, 0, 'availability must not update expired booking holds');
    assert.ok(capturedBookingFilter.$or.some((branch) =>
      branch.status === 'PENDING' && branch.holdExpiresAt.$gt instanceof Date
    ));
    assert.equal(result.slots[0].remaining, 2, 'an expired pending hold must not consume salon capacity');
  } finally {
    for (const [target, key, original] of originals.reverse()) {
      target[key] = original;
    }
  }
}

testAvailabilityReadDoesNotWrite()
  .then(() => console.log('Availability read-only integration check passed (model calls stubbed; no MongoDB access)'))
  .catch((error) => {
    console.error('Availability read-only integration check failed:', error);
    process.exitCode = 1;
  });
