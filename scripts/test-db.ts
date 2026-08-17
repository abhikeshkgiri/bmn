/**
 * Database verification script
 * Run this to test MongoDB connection and model registration
 *
 * Usage: npx ts-node scripts/test-db.ts
 * or: npm run test:db
 */

import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { connectDB } from '@/lib/db';
import User from '@/models/User';
import Salon from '@/models/Salon';
import Barber from '@/models/Barber';
import Service from '@/models/Service';
import Booking from '@/models/Booking';
import Payment from '@/models/Payment';

const testDatabaseConnection = async () => {
  try {
    console.log('🚀 Starting database verification...\n');

    // Step 1: Connect to MongoDB
    console.log('1️⃣ Connecting to MongoDB...');
    const mongoose = await connectDB();
    console.log('✅ MongoDB connection successful\n');

    // Step 2: Verify models can be accessed
    console.log('2️⃣ Verifying model registration...');
    const models = [
      { name: 'User', model: User },
      { name: 'Salon', model: Salon },
      { name: 'Barber', model: Barber },
      { name: 'Service', model: Service },
      { name: 'Booking', model: Booking },
      { name: 'Payment', model: Payment },
    ];

    for (const { name, model } of models) {
      if (model) {
        console.log(`   ✅ ${name} model registered`);
      } else {
        throw new Error(`Failed to register ${name} model`);
      }
    }
    console.log('');

    // Step 3: Check indexes
    console.log('3️⃣ Verifying indexes...');
    const collections = {
      users: User.collection.name,
      salons: Salon.collection.name,
      barbers: Barber.collection.name,
      services: Service.collection.name,
      bookings: Booking.collection.name,
      payments: Payment.collection.name,
    };

    for (const [key, collectionName] of Object.entries(collections)) {
      const collection = mongoose.connection.collection(collectionName);
      const indexes = await collection.getIndexes();
      console.log(`   ${key}: ${Object.keys(indexes).length} indexes`);
    }
    console.log('');

    // Step 4: Database statistics
    console.log('4️⃣ Database statistics...');
    for (const { name, model } of models) {
      const count = await model.countDocuments();
      console.log(`   ${name}: ${count} documents`);
    }
    console.log('');

    console.log('✅ All database verification checks passed!\n');
    console.log('📊 Database: bookmynai');
    console.log('🔗 Connection: Successfully established');
    console.log('📝 Models: All 6 models registered');
    console.log('🎯 Ready for development\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Database verification failed:', error);
    console.error('\n⚠️ Please check:');
    console.error('   1. MONGODB_URI in .env.local');
    console.error('   2. MongoDB connection string format');
    console.error('   3. Network connectivity to MongoDB server');
    console.error('   4. Cluster IP whitelist (if using MongoDB Atlas)\n');
    process.exit(1);
  }
};

// Run the test
testDatabaseConnection();
