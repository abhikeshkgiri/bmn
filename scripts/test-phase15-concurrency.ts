/**
 * Test script for Phase 15 concurrency protection
 * Verifies that two concurrent booking attempts for the same slot are handled correctly
 */

require('./test-db-bootstrap.cjs');

import mongoose from 'mongoose';
import { getAvailableSlots, createBooking } from '../src/services/booking.service';
import { connectDB } from '../src/lib/db';
import Booking from '../src/models/Booking';
import Salon from '../src/models/Salon';
import Barber from '../src/models/Barber';
import Service from '../src/models/Service';
import Notification from '../src/models/Notification';
import User from '../src/models/User';
import { BOOKING_TYPE } from '../src/constants/booking';
import { createBookingTestFixtures } from './booking-test-fixtures';
import { assertIsolatedTestDatabase } from './assert-isolated-test-db';

interface TestConfig {
  salonCapacity: number;
  targetDate: string;
  targetTime: string;
  concurrentBookingAttempts: number;
}

interface TestResult {
  success: boolean;
  totalAttempts: number;
  successfulBookings: number;
  failedBookings: number;
  expectedFailures: number;
  testPassed: boolean;
  details: string[];
}

/**
 * Test scenario: Multiple customers attempting to book the last available slot
 */
async function testConcurrentBookingPrevention(config: TestConfig): Promise<TestResult> {
  const details: string[] = [];
  assertIsolatedTestDatabase();
  const fixtures = createBookingTestFixtures({
    capacity: config.salonCapacity,
    customerCount: config.concurrentBookingAttempts,
    barberCount: Math.max(3, config.salonCapacity),
    appointmentDate: new Date(config.targetDate),
    startTime: config.targetTime,
  });
  const salonId = fixtures.salon._id;
  const userIds = [
    fixtures.owner._id,
    ...fixtures.customers.map((customer) => customer._id),
    ...fixtures.barberUsers.map((user) => user._id),
  ];
  const barberIds = fixtures.barbers.map((barber) => barber._id);
  const serviceIds = [fixtures.service._id];
  const bookingIds = fixtures.baselineBookings.map((booking) => booking._id);
  let connectedToTestDb = false;

  try {
    await connectDB();
    connectedToTestDb = true;
    details.push('✓ Connected to database');

    await Promise.all([fixtures.owner, ...fixtures.customers, ...fixtures.barberUsers].map((user) => user.save()));
    await fixtures.salon.save();
    details.push(`✓ Created test salon with capacity: ${config.salonCapacity}`);

    await fixtures.service.save();
    await Promise.all(fixtures.barbers.map((barber) => barber.save()));
    details.push(`✓ Created ${fixtures.barbers.length} test barbers and one service`);
    details.push('✓ Created test service (30 min)');

    await Promise.all(fixtures.baselineBookings.map((booking) => booking.save()));
    details.push(`✓ Pre-filled ${fixtures.baselineBookings.length} of ${config.salonCapacity} slots`);

    // Check available slots before concurrent booking
    const availableBefore = await getAvailableSlots(
      salonId.toString(),
      fixtures.barbers[config.salonCapacity - 1]._id.toString(),
      fixtures.service._id.toString(),
      config.targetDate
    );

    const slotsAt17 = availableBefore.slots.find((s) => s.startTime === config.targetTime);
    details.push(`✓ Before concurrent test: ${slotsAt17?.remaining || 0} slots remaining at ${config.targetTime}`);
    if (!slotsAt17?.available || slotsAt17.remaining !== 1) {
      throw new Error('Synthetic fixture did not produce exactly one available slot.');
    }

    // Simulate concurrent booking attempts
    const bookingPromises = [];
    for (let i = 0; i < config.concurrentBookingAttempts; i++) {
      const promise = (async () => {
        try {
          const booking = await createBooking({
            salonId: salonId.toString(),
            barberId: fixtures.barbers[(config.salonCapacity - 1 + i) % fixtures.barbers.length]._id.toString(),
            serviceId: fixtures.service._id.toString(),
            appointmentDate: config.targetDate,
            startTime: config.targetTime,
            bookingType: BOOKING_TYPE.SALON,
            currentUser: {
              _id: fixtures.customers[i]._id.toString(),
              role: 'CUSTOMER',
              phone: fixtures.customers[i].phone,
              isActive: true,
              isVerified: true,
            },
          });
          return { success: true, booking };
        } catch (error: unknown) {
          const err = error as Record<string, unknown>;
          return { success: false, error: err.code || 'UNKNOWN_ERROR' };
        }
      })();
      bookingPromises.push(promise);
    }

    const results = await Promise.all(bookingPromises);
    const successfulBookings = results.filter((r) => r.success).length;
    const failedBookings = results.filter((r) => !r.success).length;
    bookingIds.push(...results.flatMap((result) => result.success && result.booking ? [result.booking._id] : []));

    details.push(`✓ Concurrent booking results: ${successfulBookings} succeeded, ${failedBookings} failed`);

    // Verify final state
    const availableAfter = await getAvailableSlots(
      salonId.toString(),
      fixtures.barbers[config.salonCapacity - 1]._id.toString(),
      fixtures.service._id.toString(),
      config.targetDate
    );

    const slotsAt17After = availableAfter.slots.find((s) => s.startTime === config.targetTime);
    const totalBookingsNow = await Booking.countDocuments({
      salon: salonId,
      appointmentDate: new Date(config.targetDate),
      startTime: config.targetTime,
      status: { $in: ['CONFIRMED', 'PENDING'] },
    });

    details.push(`✓ After concurrent test: ${slotsAt17After?.remaining || 0} slots remaining at ${config.targetTime}`);
    details.push(`✓ Total bookings at slot: ${totalBookingsNow} (capacity: ${config.salonCapacity})`);

    // Verify test results
    const expectedSuccesses = Math.min(config.concurrentBookingAttempts, 1);
    const expectedFailures = config.concurrentBookingAttempts - expectedSuccesses;
    const testPassed =
      successfulBookings === expectedSuccesses &&
      failedBookings === expectedFailures &&
      totalBookingsNow === config.salonCapacity &&
      slotsAt17After?.remaining === 0;

    return {
      success: true,
      totalAttempts: config.concurrentBookingAttempts,
      successfulBookings,
      failedBookings,
      expectedFailures,
      testPassed,
      details,
    };
  } catch (error) {
    details.push(`✗ Error: ${error instanceof Error ? error.name : 'Unknown error'}`);
    return {
      success: false,
      totalAttempts: config.concurrentBookingAttempts,
      successfulBookings: 0,
      failedBookings: config.concurrentBookingAttempts,
      expectedFailures: config.concurrentBookingAttempts,
      testPassed: false,
      details,
    };
  } finally {
    if (connectedToTestDb) {
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Synthetic booking test lost its database connection before cleanup.');
      }
      const ownedBookings = await Booking.find({
        salon: salonId,
        customer: { $in: fixtures.customers.map((customer) => customer._id) },
      }).select('_id').lean();
      bookingIds.push(...ownedBookings.map((booking) => booking._id));
      const cleanupResults = await Promise.allSettled([
        Notification.deleteMany({ bookingId: { $in: bookingIds } }),
        Booking.deleteMany({ _id: { $in: bookingIds } }),
        Barber.deleteMany({ _id: { $in: barberIds } }),
        Service.deleteMany({ _id: { $in: serviceIds } }),
        Salon.deleteOne({ _id: salonId }),
        User.deleteMany({ _id: { $in: userIds } }),
      ]);
      const cleanupFailures = cleanupResults.filter((result) => result.status === 'rejected');
      if (cleanupFailures.length > 0) {
        throw new Error(`Failed to clean ${cleanupFailures.length} synthetic booking-test data groups.`);
      }
    }
  }
}

// Run test
if (require.main === module) {
  const config: TestConfig = {
    salonCapacity: 2,
    targetDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    targetTime: '17:00',
    concurrentBookingAttempts: 3,
  };

  console.log('=== Phase 15 Concurrency Protection Test ===\n');
  console.log(`Configuration:`);
  console.log(`  - Salon Capacity: ${config.salonCapacity}`);
  console.log(`  - Target Time: ${config.targetTime}`);
  console.log(`  - Concurrent Attempts: ${config.concurrentBookingAttempts}\n`);

  testConcurrentBookingPrevention(config)
    .then((result) => {
      console.log(`Results:`);
      result.details.forEach((d) => console.log(`  ${d}`));
      console.log(`\nTest Status: ${result.testPassed ? '✓ PASSED' : '✗ FAILED'}`);
      console.log(`  - Successful Bookings: ${result.successfulBookings}`);
      console.log(`  - Failed Bookings: ${result.failedBookings}`);
      process.exit(result.testPassed ? 0 : 1);
    })
    .catch((error) => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testConcurrentBookingPrevention };
export type { TestConfig, TestResult };
