require('./test-db-bootstrap.cjs');

const { testConcurrentBookingPrevention } = require('./test-phase15-concurrency.ts');
const mongoose = require('mongoose');

async function run() {
  try {
    const result = await testConcurrentBookingPrevention({
      salonCapacity: 2,
      targetDate: new Date().toISOString().split('T')[0],
      targetTime: '17:00',
      concurrentBookingAttempts: 3,
    });
    result.details.forEach((detail) => console.log(detail));
    console.log(`Booking concurrency test: ${result.testPassed ? 'PASS' : 'FAIL'}`);
    process.exitCode = result.testPassed ? 0 : 1;
  } catch (error) {
    console.error('Booking concurrency test failed before completion:', error instanceof Error ? error.name : 'Unknown error');
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();
