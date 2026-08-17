/**
 * Test script for Phase 15 concurrency protection
 * Verifies that two concurrent booking attempts for the same slot are handled correctly
 */

import { Types } from 'mongoose';
import { getAvailableSlots, createBooking } from '../src/services/booking.service';
import { connectDB } from '../src/lib/db';
import Booking from '../src/models/Booking';
import Salon from '../src/models/Salon';
import Barber from '../src/models/Barber';
import Service from '../src/models/Service';
import User from '../src/models/User';

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

  try {
    await connectDB();
    details.push('✓ Connected to database');

    // Setup: Create test salon with capacity 2
    const salon = new Salon({
      name: 'Test Salon',
      owner: new Types.ObjectId(),
      capacity: config.salonCapacity,
      slotIntervalMinutes: 30,
      openingHours: {
        monday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
      },
      location: { type: 'Point', coordinates: [0, 0] },
    });
    await salon.save();
    details.push(`✓ Created test salon with capacity: ${config.salonCapacity}`);

    // Create test barbers
    const barbers = [];
    for (let i = 1; i <= 3; i++) {
      const barber = new Barber({
        name: `Barber ${i}`,
        salon: salon._id,
        isAvailable: true,
        isActive: true,
        experienceYears: 5,
        specializations: [],
        rating: 4.5,
        reviewCount: 10,
        offersHomeService: false,
        isVerified: true,
      });
      await barber.save();
      barbers.push(barber);
    }
    details.push(`✓ Created ${barbers.length} test barbers`);

    // Create test service
    const service = new Service({
      name: 'Test Haircut',
      duration: 30,
      price: 500,
      salon: salon._id,
      isActive: true,
    });
    await service.save();
    details.push('✓ Created test service (30 min)');

    // Create test customers
    const customers = [];
    for (let i = 1; i <= config.concurrentBookingAttempts; i++) {
      const customer = new User({
        phoneNumber: `98765432${String(i).padStart(2, '0')}`,
        role: 'CUSTOMER',
        isVerified: true,
        isActive: true,
      });
      await customer.save();
      customers.push(customer);
    }
    details.push(`✓ Created ${customers.length} test customers`);

    // Pre-fill capacity: Create (capacity - 1) bookings
    const now = new Date();
    const testDate = config.targetDate || now.toISOString().split('T')[0];
    const testTime = config.targetTime || '17:00';

    for (let i = 0; i < config.salonCapacity - 1; i++) {
      const booking = new Booking({
        customer: customers[0]._id,
        salon: salon._id,
        barber: barbers[i]._id,
        service: service._id,
        appointmentDate: new Date(testDate),
        startTime: testTime,
        endTime: '17:30',
        duration: 30,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        totalAmount: 500,
        servicePrice: 500,
      });
      await booking.save();
    }
    details.push(`✓ Pre-filled ${config.salonCapacity - 1} of ${config.salonCapacity} slots`);

    // Check available slots before concurrent booking
    const availableBefore = await getAvailableSlots(
      salon._id.toString(),
      barbers[config.salonCapacity - 1]._id.toString(),
      service._id.toString(),
      testDate
    );

    const slotsAt17 = availableBefore.slots.find((s) => s.startTime === testTime);
    details.push(`✓ Before concurrent test: ${slotsAt17?.remaining || 0} slots remaining at ${testTime}`);

    // Simulate concurrent booking attempts
    const bookingPromises = [];
    for (let i = 0; i < config.concurrentBookingAttempts; i++) {
      const promise = (async () => {
        try {
          const booking = await createBooking({
            salonId: salon._id.toString(),
            barberId: barbers[(config.salonCapacity - 1 + i) % barbers.length]._id.toString(),
            serviceId: service._id.toString(),
            appointmentDate: testDate,
            startTime: testTime,
            bookingType: 'IN_SALON',
            currentUser: {
              _id: customers[i]._id.toString(),
              role: 'CUSTOMER',
              phone: customers[i].phoneNumber,
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

    details.push(`✓ Concurrent booking results: ${successfulBookings} succeeded, ${failedBookings} failed`);

    // Verify final state
    const availableAfter = await getAvailableSlots(
      salon._id.toString(),
      barbers[config.salonCapacity - 1]._id.toString(),
      service._id.toString(),
      testDate
    );

    const slotsAt17After = availableAfter.slots.find((s) => s.startTime === testTime);
    const totalBookingsNow = await Booking.countDocuments({
      salon: salon._id,
      appointmentDate: new Date(testDate),
      startTime: testTime,
      status: { $in: ['CONFIRMED', 'PENDING'] },
    });

    details.push(`✓ After concurrent test: ${slotsAt17After?.remaining || 0} slots remaining at ${testTime}`);
    details.push(`✓ Total bookings at slot: ${totalBookingsNow} (capacity: ${config.salonCapacity})`);

    // Cleanup
    await Booking.deleteMany({ salon: salon._id });
    await Barber.deleteMany({ salon: salon._id });
    await Service.deleteMany({ salon: salon._id });
    await Salon.deleteOne({ _id: salon._id });
    await User.deleteMany({ _id: { $in: customers.map((c) => c._id) } });

    // Verify test results
    const expectedSuccesses = Math.min(config.concurrentBookingAttempts, 1); // Only 1 should succeed if capacity is 1
    const testPassed =
      successfulBookings <= 1 &&
      totalBookingsNow <= config.salonCapacity &&
      (failedBookings > 0 || successfulBookings === 1);

    return {
      success: true,
      totalAttempts: config.concurrentBookingAttempts,
      successfulBookings,
      failedBookings,
      expectedFailures: config.concurrentBookingAttempts - expectedSuccesses,
      testPassed,
      details,
    };
  } catch (error) {
    details.push(`✗ Error: ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      totalAttempts: config.concurrentBookingAttempts,
      successfulBookings: 0,
      failedBookings: config.concurrentBookingAttempts,
      expectedFailures: config.concurrentBookingAttempts,
      testPassed: false,
      details,
    };
  }
}

// Run test
if (require.main === module) {
  const config: TestConfig = {
    salonCapacity: 2,
    targetDate: new Date().toISOString().split('T')[0],
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
