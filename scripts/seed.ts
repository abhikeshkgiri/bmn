/**
 * Development seed script
 * Creates sample data for local development
 *
 * ⚠️ DEVELOPMENT ONLY - Do not use in production
 * ⚠️ Run manually: npx ts-node scripts/seed.ts
 * ⚠️ Not executed automatically
 *
 * Creates:
 * - 1 test customer
 * - 1 test salon owner
 * - 1 salon with complete details
 * - 2 barbers
 * - 3 services
 */

import { connectDB } from '@/lib/db';
import User, { type IUser } from '@/models/User';
import Salon, { type ISalon } from '@/models/Salon';
import Barber, { type IBarber } from '@/models/Barber';
import Service, { type IService } from '@/models/Service';
import { USER_ROLES } from '@/constants/roles';
import { SALON_FACILITY } from '@/constants/services';
import { SERVICE_CATEGORY, BARBER_SPECIALIZATION } from '@/constants/services';

interface SeedData {
  customer: IUser;
  salonOwner: IUser;
  salon: ISalon;
  barbers: IBarber[];
  services: IService[];
}

const seedDatabase = async (): Promise<SeedData> => {
  try {
    console.log('🌱 Starting database seed...\n');

    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Check if seed data already exists
    const existingCustomer = await User.findOne({ phone: '+919999999999' });
    if (existingCustomer) {
      console.log('⚠️ Seed data already exists. Skipping seed.');
      const salonOwner = await User.findOne({ phone: '+919999999998' });
      const salon = await Salon.findOne({ slug: 'premium-hair-studio' });
      return {
        customer: existingCustomer,
        salonOwner: salonOwner || existingCustomer,
        salon: salon || ({} as ISalon),
        barbers: [],
        services: [],
      };
    }

    console.log('Creating seed data...\n');

    // 1. Create customer
    console.log('1️⃣ Creating test customer...');
    const customer = await User.create({
      name: 'Dev Customer',
      phone: '+919999999999',
      email: 'customer@dev.bookmynai.local',
      role: USER_ROLES.CUSTOMER,
      isActive: true,
      isVerified: true,
    });
    console.log(`   ✅ Customer created: ${customer._id}\n`);

    // 2. Create salon owner
    console.log('2️⃣ Creating test salon owner...');
    const salonOwner = await User.create({
      name: 'Dev Salon Owner',
      phone: '+919999999998',
      email: 'owner@dev.bookmynai.local',
      role: USER_ROLES.SALON_OWNER,
      isActive: true,
      isVerified: true,
    });
    console.log(`   ✅ Salon owner created: ${salonOwner._id}\n`);

    // 3. Create salon
    console.log('3️⃣ Creating test salon...');
    const salon = await Salon.create({
      name: 'Premium Hair Studio',
      slug: 'premium-hair-studio',
      description: 'A premium salon offering complete hair and grooming services',
      owner: salonOwner._id,
      address: {
        addressLine1: '123 Main Street',
        addressLine2: 'Near City Center',
        area: 'Downtown',
        landmark: 'Opposite City Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India',
      },
      location: {
        type: 'Point',
        coordinates: [72.8479, 19.0176], // Mumbai coordinates [lon, lat]
      },
      contact: {
        phone: '+919999999997',
        email: 'salon@dev.bookmynai.local',
        website: 'https://premiumhairstudio.local',
      },
      openingHours: {
        monday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
        tuesday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
        wednesday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
        thursday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
        friday: { isOpen: true, openTime: '09:00', closeTime: '22:00' },
        saturday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
        sunday: { isOpen: false },
      },
      facilities: [
        SALON_FACILITY.AC,
        SALON_FACILITY.WIFI,
        SALON_FACILITY.PARKING,
        SALON_FACILITY.CARD_PAYMENT,
        SALON_FACILITY.UPI,
        SALON_FACILITY.WAITING_AREA,
      ],
      rating: 4.5,
      reviewCount: 45,
      isVerified: true,
      isActive: true,
    });
    console.log(`   ✅ Salon created: ${salon._id}\n`);

    // 4. Create barbers
    console.log('4️⃣ Creating test barbers...');
    const barber1User = await User.create({
      name: 'Rahul Sharma',
      phone: '+919999999996',
      email: 'rahul@dev.bookmynai.local',
      role: USER_ROLES.BARBER,
      isActive: true,
      isVerified: true,
    });

    const barber2User = await User.create({
      name: 'Amit Patel',
      phone: '+919999999995',
      email: 'amit@dev.bookmynai.local',
      role: USER_ROLES.BARBER,
      isActive: true,
      isVerified: true,
    });

    const barbers = await Barber.create([
      {
        user: barber1User._id,
        salon: salon._id,
        name: 'Rahul Sharma',
        slug: 'rahul-sharma',
        bio: 'Expert barber with 5+ years of experience',
        experienceYears: 5,
        specializations: [
          BARBER_SPECIALIZATION.HAIRCUT,
          BARBER_SPECIALIZATION.BEARD,
          BARBER_SPECIALIZATION.HAIR_STYLING,
        ],
        rating: 4.7,
        reviewCount: 38,
        isAvailable: true,
        offersHomeService: true,
        homeServiceRadius: 5,
        isVerified: true,
        isActive: true,
      },
      {
        user: barber2User._id,
        salon: salon._id,
        name: 'Amit Patel',
        slug: 'amit-patel',
        bio: 'Specialist in modern and classic haircuts',
        experienceYears: 3,
        specializations: [
          BARBER_SPECIALIZATION.HAIRCUT,
          BARBER_SPECIALIZATION.HAIR_STYLING,
        ],
        rating: 4.3,
        reviewCount: 27,
        isAvailable: true,
        offersHomeService: false,
        isVerified: true,
        isActive: true,
      },
    ]);
    console.log(`   ✅ Created ${barbers.length} barbers\n`);

    // 5. Create services
    console.log('5️⃣ Creating test services...');
    const services = await Service.create([
      {
        salon: salon._id,
        name: 'Classic Haircut',
        slug: 'classic-haircut',
        description: 'Traditional haircut with wash and styling',
        category: SERVICE_CATEGORY.HAIRCUT,
        duration: 30,
        price: 30000, // ₹300 in paise
        isActive: true,
      },
      {
        salon: salon._id,
        name: 'Beard Trim & Shaping',
        slug: 'beard-trim',
        description: 'Professional beard grooming and shaping',
        category: SERVICE_CATEGORY.BEARD,
        duration: 20,
        price: 25000, // ₹250 in paise
        discountPrice: 20000, // ₹200 discount
        isActive: true,
      },
      {
        salon: salon._id,
        name: 'Hair Coloring',
        slug: 'hair-coloring',
        description: 'Professional hair coloring with premium products',
        category: SERVICE_CATEGORY.HAIR_COLOR,
        duration: 90,
        price: 50000, // ₹500 in paise
        isActive: true,
      },
    ]);
    console.log(`   ✅ Created ${services.length} services\n`);

    // Update salon with barbers and services references
    salon.barbers = barbers.map((b: IBarber) => b._id);
    salon.services = services.map((s: IService) => s._id);
    await salon.save();

    console.log('✅ Seed data created successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - 1 Customer (phone: +919999999999)`);
    console.log(`   - 1 Salon Owner (phone: +919999999998)`);
    console.log(`   - 1 Salon: Premium Hair Studio`);
    console.log(`   - ${barbers.length} Barbers`);
    console.log(`   - ${services.length} Services\n`);
    console.log('⚠️  This is development data only.\n');

    return { customer, salonOwner, salon, barbers, services };
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  }
};

// Run seed if executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('🎉 Seed completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error:', error);
      process.exit(1);
    });
}

export { seedDatabase };
export type { SeedData };
