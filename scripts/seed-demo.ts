/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Types as MongooseTypes } from 'mongoose';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { connectDB } = require('../src/lib/db');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { USER_ROLES } = require('../src/constants/roles');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { SERVICE_CATEGORY, BARBER_SPECIALIZATION, SALON_FACILITY } = require('../src/constants/services');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { BOOKING_STATUS, BOOKING_TYPE, PAYMENT_STATUS } = require('../src/constants/booking');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { NOTIFICATION_TYPES } = require('../src/constants/notifications');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const User = require('../src/models/User').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Salon = require('../src/models/Salon').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Barber = require('../src/models/Barber').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Service = require('../src/models/Service').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Booking = require('../src/models/Booking').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Coupon = require('../src/models/Coupon').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const NotificationModel = require('../src/models/Notification').default;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { default: Review, ReviewStatus, ReviewTarget } = require('../src/models/Review');

const IS_RESET = process.argv.includes('--reset');

if (process.env.NODE_ENV === 'production') {
  throw new Error('Demo seed is disabled in production for safety.');
}

type DemoSalonBlueprint = {
  name: string;
  slug: string;
  city: string;
  ownerPhone: string;
  ownerName: string;
  ownerEmail: string;
  contactPhone: string;
  latitude: number;
  longitude: number;
  addressLine1: string;
  area: string;
  landmark: string;
  description: string;
  capacity?: number;
  facilities?: string[];
};

const daysFromNow = (offset: number): Date => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setHours(0, 0, 0, 0);
  return date;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const formatDate = (date: Date): string => date.toISOString().split('T')[0];

const getDateAtTime = (offsetDays: number, hour: number, minute = 0): Date => {
  const date = daysFromNow(offsetDays);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const makeSlug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const ensureUser = async ({
  phone,
  name,
  email,
  role,
}: {
  phone: string;
  name: string;
  email: string;
  role: string;
}) => {
  const existing = await User.findOne({ phone });
  if (existing) {
    return existing;
  }

  return User.create({
    name,
    phone,
    email,
    role,
    isActive: true,
    isVerified: true,
  });
};

const ensureSalon = async (blueprint: DemoSalonBlueprint) => {
  const existing = await Salon.findOne({ slug: blueprint.slug });
  if (existing) {
    return existing;
  }

  const owner = await ensureUser({
    phone: blueprint.ownerPhone,
    name: blueprint.ownerName,
    email: blueprint.ownerEmail,
    role: USER_ROLES.SALON_OWNER,
  });

  const salon = await Salon.create({
    name: blueprint.name,
    slug: blueprint.slug,
    description: blueprint.description,
    owner: owner._id,
    address: {
      addressLine1: blueprint.addressLine1,
      area: blueprint.area,
      landmark: blueprint.landmark,
      city: blueprint.city,
      state: 'Maharashtra',
      postalCode: '400000',
      country: 'India',
    },
    location: {
      type: 'Point',
      coordinates: [blueprint.longitude, blueprint.latitude],
    },
    contact: {
      phone: blueprint.contactPhone,
      email: `${blueprint.slug}@demo.bookmynai.com`,
      website: `https://${blueprint.slug}.demo.bookmynai.test`,
    },
    openingHours: {
      monday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
      tuesday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
      wednesday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
      thursday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
      friday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
      saturday: { isOpen: true, openTime: '10:00', closeTime: '21:00' },
      sunday: { isOpen: false, openTime: null, closeTime: null },
    },
    capacity: blueprint.capacity ?? 3,
    slotIntervalMinutes: 30,
    facilities: blueprint.facilities ?? [
      SALON_FACILITY.AC,
      SALON_FACILITY.WIFI,
      SALON_FACILITY.PARKING,
      SALON_FACILITY.CARD_PAYMENT,
      SALON_FACILITY.UPI,
      SALON_FACILITY.WAITING_AREA,
    ],
    rating: 4.6,
    reviewCount: 32,
    isVerified: true,
    isActive: true,
  });

  return salon;
};

const ensureService = async ({
  salonId,
  name,
  category,
  duration,
  price,
  description,
}: {
  salonId: MongooseTypes.ObjectId;
  name: string;
  category: string;
  duration: number;
  price: number;
  description: string;
}) => {
  const slug = `${makeSlug(name)}-${makeSlug((salonId as MongooseTypes.ObjectId).toString())}`;
  const existing = await Service.findOne({ salon: salonId, slug });
  if (existing) {
    return existing;
  }

  return Service.create({
    salon: salonId,
    name,
    slug,
    description,
    category,
    duration,
    price,
    discountPrice: Math.round(price * 0.8),
    isActive: true,
  });
};

const ensureBarber = async ({
  salonId,
  userPhone,
  userName,
  email,
  barberName,
  slug,
  bio,
  experienceYears,
  services,
}: {
  salonId: MongooseTypes.ObjectId;
  userPhone: string;
  userName: string;
  email: string;
  barberName: string;
  slug: string;
  bio: string;
  experienceYears: number;
  services: MongooseTypes.ObjectId[];
}) => {
  const user = await ensureUser({ phone: userPhone, name: userName, email, role: USER_ROLES.BARBER });
  const existing = await Barber.findOne({ salon: salonId, slug });
  if (existing) {
    return { user, barber: existing };
  }

  const barber = await Barber.create({
    user: user._id,
    salon: salonId,
    name: barberName,
    slug,
    bio,
    experienceYears,
    specializations: [
      BARBER_SPECIALIZATION.HAIRCUT,
      BARBER_SPECIALIZATION.BEARD,
      BARBER_SPECIALIZATION.HAIR_STYLING,
    ],
    services,
    rating: 4.7,
    reviewCount: 17,
    isAvailable: true,
    offersHomeService: true,
    homeServiceRadius: 6,
    isVerified: true,
    isActive: true,
  });

  await Salon.findByIdAndUpdate(salonId, { $addToSet: { barbers: barber._id } });
  return { user, barber };
};

const ensureCoupon = async ({
  code,
  description,
  discountType,
  discountValue,
  minimumOrderValue,
  maximumDiscount,
  startDate,
  expiryDate,
  applicableSalons,
}: {
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minimumOrderValue?: number;
  maximumDiscount?: number;
  startDate: Date;
  expiryDate: Date;
  applicableSalons?: MongooseTypes.ObjectId[];
}) => {
  const existing = await Coupon.findOne({ code });
  if (existing) {
    return existing;
  }

  return Coupon.create({
    code,
    description,
    discountType,
    discountValue,
    minimumOrderValue: minimumOrderValue ?? 0,
    maximumDiscount: maximumDiscount ?? null,
    startDate,
    expiryDate,
    usageLimit: 100,
    perUserLimit: 1,
    usedCount: 0,
    applicable: {
      salons: applicableSalons ?? [],
      services: [],
      customers: [],
    },
    active: true,
  });
};

const ensureNotification = async ({
  recipientId,
  recipientRole,
  type,
  title,
  message,
  bookingId,
  salonId,
  barberId,
}: {
  recipientId: MongooseTypes.ObjectId;
  recipientRole: string;
  type: string;
  title: string;
  message: string;
  bookingId?: MongooseTypes.ObjectId;
  salonId?: MongooseTypes.ObjectId;
  barberId?: MongooseTypes.ObjectId;
}) => {
  const existing = await NotificationModel.findOne({ recipientId, type, bookingId: bookingId ?? null, title });
  if (existing) {
    return existing;
  }

  return NotificationModel.create({
    recipientId,
    recipientRole,
    type,
    title,
    message,
    bookingId: bookingId || undefined,
    salonId: salonId || undefined,
    barberId: barberId || undefined,
    priority: 'NORMAL',
    channel: 'IN_APP',
    metadata: {},
    isRead: false,
  });
};

const ensureReview = async ({
  customerId,
  bookingId,
  salonId,
  barberId,
  serviceId,
  rating,
  review,
}: {
  customerId: MongooseTypes.ObjectId;
  bookingId: MongooseTypes.ObjectId;
  salonId: MongooseTypes.ObjectId;
  barberId?: MongooseTypes.ObjectId;
  serviceId?: MongooseTypes.ObjectId;
  rating: number;
  review: string;
}) => {
  const existing = await Review.findOne({ booking: bookingId });
  if (existing) {
    return existing;
  }

  return Review.create({
    customer: customerId,
    booking: bookingId,
    salon: salonId,
    barber: barberId || undefined,
    service: serviceId || undefined,
    target: barberId ? ReviewTarget.BARBER : ReviewTarget.SALON,
    rating,
    review,
    status: ReviewStatus.PUBLISHED,
    helpful: 0,
    unhelpful: 0,
  });
};

const resetDemoData = async () => {
  await connectDB();

  console.log('🧹 Resetting demo data...');

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const demoPhonePattern = /^\+9190000000\d{2}$/;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const demoEmailPattern = /demo\.bookmynai\.test$/i;

  await NotificationModel.deleteMany({
    $or: [{ recipientId: { $exists: true } }],
  });

  await Review.deleteMany({
    $or: [{ customer: { $exists: true } }],
  });

  await Booking.deleteMany({
    $or: [{ bookingNumber: /^BMN-DEMO-/ }, { customer: { $exists: true } }],
  });

  const demoUsers: Array<{ _id: any }> = await User.find({
    $or: [
      { phone: { $regex: /^\+9190000000/ } },
      { email: { $regex: /demo\.bookmynai\.test/i } },
    ],
  });
  const userIds = demoUsers.map((user) => user._id);

  if (userIds.length > 0) {
    await Barber.deleteMany({ user: { $in: userIds } });
    await Salon.deleteMany({
      $or: [
        { slug: { $regex: /^(urban-trim-studio|the-grooming-room|stylecraft-salon|glow-and-groom|gentlemens-hub|elite-cut-studio)/i } },
        { owner: { $in: userIds } },
      ],
    });
    await Service.deleteMany({ salon: { $in: (await Salon.find({ owner: { $in: userIds } }).select('_id')).map((salon: any) => salon._id) } });
    await User.deleteMany({ _id: { $in: userIds } });
  }

  await Coupon.deleteMany({ code: { $in: ['WELCOME50', 'FIRSTBOOK', 'SALON100'] } });

  console.log('✅ Demo data reset complete');
};

const createDemoData = async () => {
  console.log('🌱 Seeding BookMyNai demo data...');
  await connectDB();

  const demoCustomers = [
    { phone: '+919000000001', name: 'Demo Customer One', email: 'demo.customer1@demo.bookmynai.com', role: USER_ROLES.CUSTOMER },
    { phone: '+919000000002', name: 'Demo Customer Two', email: 'demo.customer2@demo.bookmynai.com', role: USER_ROLES.CUSTOMER },
    { phone: '+919000000003', name: 'Demo Admin', email: 'demo.admin@demo.bookmynai.com', role: USER_ROLES.ADMIN },
  ];

  for (const customer of demoCustomers) {
    await ensureUser(customer);
  }

  const salonBlueprints: DemoSalonBlueprint[] = [
    {
      name: 'Urban Trim Studio',
      slug: 'urban-trim-studio',
      city: 'Mumbai',
      ownerPhone: '+919000000011',
      ownerName: 'Demo Owner One',
      ownerEmail: 'owner.one@demo.bookmynai.com',
      contactPhone: '+919000000012',
      latitude: 19.1136,
      longitude: 72.8697,
      addressLine1: '14 Link Road, Andheri West',
      area: 'Andheri West',
      landmark: 'Near Metro Cinema',
      description: 'Modern grooming studio with premium cuts, beard care and express styling.',
      capacity: 2,
      facilities: [SALON_FACILITY.AC, SALON_FACILITY.WIFI, SALON_FACILITY.PARKING, SALON_FACILITY.CARD_PAYMENT, SALON_FACILITY.WAITING_AREA],
    },
    {
      name: 'The Grooming Room',
      slug: 'the-grooming-room',
      city: 'Mumbai',
      ownerPhone: '+919000000021',
      ownerName: 'Demo Owner Two',
      ownerEmail: 'owner.two@demo.bookmynai.com',
      contactPhone: '+919000000022',
      latitude: 19.0756,
      longitude: 72.8364,
      addressLine1: '43 Hill Road, Bandra West',
      area: 'Bandra West',
      landmark: 'Opposite Bandra Fort',
      description: 'Luxury grooming and beard studio for everyday confidence and event-ready looks.',
      capacity: 1,
      facilities: [SALON_FACILITY.AC, SALON_FACILITY.WIFI, SALON_FACILITY.WASHROOM, SALON_FACILITY.CARD_PAYMENT, SALON_FACILITY.UPI],
    },
    {
      name: 'StyleCraft Salon',
      slug: 'stylecraft-salon',
      city: 'Mumbai',
      ownerPhone: '+919000000031',
      ownerName: 'Demo Owner Three',
      ownerEmail: 'owner.three@demo.bookmynai.com',
      contactPhone: '+919000000032',
      latitude: 19.0219,
      longitude: 72.8461,
      addressLine1: '7 Marine Drive View, South Mumbai',
      area: 'South Mumbai',
      landmark: 'Near Eros Cinema',
      description: 'Contemporary salon specialising in clean trims, hair color and styling for professionals.',
      capacity: 3,
      facilities: [SALON_FACILITY.AC, SALON_FACILITY.CARD_PAYMENT, SALON_FACILITY.UPI, SALON_FACILITY.WAITING_AREA],
    },
    {
      name: 'Glow & Groom',
      slug: 'glow-and-groom',
      city: 'Mumbai',
      ownerPhone: '+919000000041',
      ownerName: 'Demo Owner Four',
      ownerEmail: 'owner.four@demo.bookmynai.com',
      contactPhone: '+919000000042',
      latitude: 19.2178,
      longitude: 72.9766,
      addressLine1: '28 Powai Plaza, Hiranandani',
      area: 'Powai',
      landmark: 'Near Lake Boulevard',
      description: 'Modern salon for precision grooming, skin polish, styling and family care.',
      capacity: 2,
      facilities: [SALON_FACILITY.AC, SALON_FACILITY.WIFI, SALON_FACILITY.PARKING, SALON_FACILITY.KIDS_FRIENDLY],
    },
    {
      name: 'Gentlemen’s Hub',
      slug: 'gentlemens-hub',
      city: 'Mumbai',
      ownerPhone: '+919000000051',
      ownerName: 'Demo Owner Five',
      ownerEmail: 'owner.five@demo.bookmynai.com',
      contactPhone: '+919000000052',
      latitude: 18.9924,
      longitude: 72.8324,
      addressLine1: '9 Colaba Causeway',
      area: 'Colaba',
      landmark: 'Opposite Regal Cinema',
      description: 'An upscale men’s grooming hub with classic cuts, grooming rituals and premium detailing.',
      capacity: 4,
      facilities: [SALON_FACILITY.AC, SALON_FACILITY.WIFI, SALON_FACILITY.CARD_PAYMENT, SALON_FACILITY.UPI, SALON_FACILITY.WAITING_AREA],
    },
    {
      name: 'Elite Cut Studio',
      slug: 'elite-cut-studio',
      city: 'Mumbai',
      ownerPhone: '+919000000061',
      ownerName: 'Demo Owner Six',
      ownerEmail: 'owner.six@demo.bookmynai.com',
      contactPhone: '+919000000062',
      latitude: 19.1996,
      longitude: 72.8509,
      addressLine1: '18 Vashi Plaza, Navi Mumbai',
      area: 'Vashi',
      landmark: 'Near Vashi Station',
      description: 'Premium studio focused on precision grooming, hair color and quick weekday appointments.',
      capacity: 3,
      facilities: [SALON_FACILITY.AC, SALON_FACILITY.PARKING, SALON_FACILITY.CARD_PAYMENT, SALON_FACILITY.UPI],
    },
  ];

  const salonRecords: any[] = [];
  for (const salonBlueprint of salonBlueprints) {
    const salon = await ensureSalon(salonBlueprint);
    salonRecords.push(salon);
  }

  const serviceCatalog = [
    { name: 'Signature Haircut', category: SERVICE_CATEGORY.HAIRCUT, duration: 45, price: 45000, description: 'Precision cut for a clean, modern finish.' },
    { name: 'Beard Trim & Shape', category: SERVICE_CATEGORY.BEARD, duration: 25, price: 30000, description: 'Detail work for sharper beard lines and styling.' },
    { name: 'Haircut + Beard', category: SERVICE_CATEGORY.GROOMING, duration: 60, price: 65000, description: 'Complete grooming package with cut and beard styling.' },
    { name: 'Hair Colour Touch-Up', category: SERVICE_CATEGORY.HAIR_COLOR, duration: 75, price: 120000, description: 'Root touch-up with premium color and finish.' },
    { name: 'Classic Facial', category: SERVICE_CATEGORY.FACIAL, duration: 40, price: 38000, description: 'Deep cleansing and brightening facial for a polished look.' },
  ];

  for (const salon of salonRecords) {
    const createdServices: any[] = [];
    for (const serviceTemplate of serviceCatalog) {
      const svc = await ensureService({
        salonId: salon._id,
        name: serviceTemplate.name,
        category: serviceTemplate.category,
        duration: serviceTemplate.duration,
        price: serviceTemplate.price,
        description: serviceTemplate.description,
      });
      createdServices.push(svc);
      await Salon.findByIdAndUpdate(salon._id, { $addToSet: { services: svc._id } });
    }

    const barberBlueprints = [
      {
        userPhone: `+91900000${String(100 + salonRecords.indexOf(salon) * 10 + 1).padStart(3, '0')}`,
        userName: `Demo Barber ${salonRecords.indexOf(salon) + 1} A`,
        email: `barber.${salonRecords.indexOf(salon) + 1}a@demo.bookmynai.com`,
        barberName: `Rohan Mehta`,
        slug: `${salon.slug}-rohan-mehta`,
        bio: 'Expert in modern cuts and beard detailing.',
        experienceYears: 6,
      },
      {
        userPhone: `+91900000${String(100 + salonRecords.indexOf(salon) * 10 + 2).padStart(3, '0')}`,
        userName: `Demo Barber ${salonRecords.indexOf(salon) + 1} B`,
        email: `barber.${salonRecords.indexOf(salon) + 1}b@demo.bookmynai.com`,
        barberName: `Amit Shah`,
        slug: `${salon.slug}-amit-shah`,
        bio: 'Specialist in precision cuts and premium styling.',
        experienceYears: 4,
      },
    ];

    for (const barberBlueprint of barberBlueprints) {
      const selectedServices = createdServices.slice(0, 3).map((service) => service._id);
      const { barber } = await ensureBarber({
        salonId: salon._id,
        userPhone: barberBlueprint.userPhone,
        userName: barberBlueprint.userName,
        email: barberBlueprint.email,
        barberName: barberBlueprint.barberName,
        slug: barberBlueprint.slug,
        bio: barberBlueprint.bio,
        experienceYears: barberBlueprint.experienceYears,
        services: selectedServices,
      });
      await Salon.findByIdAndUpdate(salon._id, { $addToSet: { barbers: barber._id } });
    }
  }

  const customerOne = await ensureUser({
    phone: '+919000000001',
    name: 'Demo Customer One',
    email: 'demo.customer1@demo.bookmynai.com',
    role: USER_ROLES.CUSTOMER,
  });
  const customerTwo = await ensureUser({
    phone: '+919000000002',
    name: 'Demo Customer Two',
    email: 'demo.customer2@demo.bookmynai.com',
    role: USER_ROLES.CUSTOMER,
  });

  const allSalons: any[] = await Salon.find({ isActive: true }).lean();
  const allServices: any[] = await Service.find({ isActive: true }).lean();
  const allBarbers: any[] = await Barber.find({ isActive: true }).lean();

  const demoSalonA = allSalons[0];
  const secondSalon = allSalons[1];
  const secondBarber = allBarbers.find((barber: any) => barber.salon.toString() === secondSalon._id.toString());
  const salonAService = allServices.find((service: any) => service.salon.toString() === demoSalonA._id.toString());
  const salonABarber = allBarbers.find((barber: any) => barber.salon.toString() === demoSalonA._id.toString());

  const bookingScenarios = [
    {
      bookingNumber: 'BMN-DEMO-101',
      customer: customerOne._id,
      salon: demoSalonA._id,
      barber: salonABarber?._id,
      service: salonAService?._id,
      appointmentDate: getDateAtTime(2, 17, 30),
      startTime: '17:30',
      endTime: '18:15',
      duration: 45,
      servicePrice: salonAService?.price ?? 45000,
      totalAmount: salonAService?.price ?? 45000,
      status: BOOKING_STATUS.CONFIRMED,
      paymentStatus: PAYMENT_STATUS.PENDING,
      bookingType: BOOKING_TYPE.SALON,
      customerNotes: 'Pre-booked appointment for demo flow.',
    },
    {
      bookingNumber: 'BMN-DEMO-102',
      customer: customerTwo._id,
      salon: secondSalon._id,
      barber: secondBarber?._id,
      service: allServices.find((service: any) => service.salon.toString() === secondSalon._id.toString())?._id,
      appointmentDate: getDateAtTime(5, 18, 0),
      startTime: '18:00',
      endTime: '18:45',
      duration: 45,
      servicePrice: 45000,
      totalAmount: 45000,
      status: BOOKING_STATUS.CANCELLED,
      paymentStatus: PAYMENT_STATUS.PENDING,
      bookingType: BOOKING_TYPE.SALON,
      cancellationReason: 'Demo cancellation for testing.',
    },
    {
      bookingNumber: 'BMN-DEMO-103',
      customer: customerOne._id,
      salon: allSalons[2]._id,
      barber: allBarbers.find((barber: any) => barber.salon.toString() === allSalons[2]._id.toString())?._id,
      service: allServices.find((service: any) => service.salon.toString() === allSalons[2]._id.toString())?._id,
      appointmentDate: getDateAtTime(-4, 11, 0),
      startTime: '11:00',
      endTime: '11:45',
      duration: 45,
      servicePrice: 45000,
      totalAmount: 45000,
      status: BOOKING_STATUS.COMPLETED,
      paymentStatus: PAYMENT_STATUS.PAID,
      bookingType: BOOKING_TYPE.SALON,
    },
    {
      bookingNumber: 'BMN-DEMO-104',
      customer: customerTwo._id,
      salon: allSalons[3]._id,
      barber: allBarbers.find((barber: any) => barber.salon.toString() === allSalons[3]._id.toString())?._id,
      service: allServices.find((service: any) => service.salon.toString() === allSalons[3]._id.toString())?._id,
      appointmentDate: getDateAtTime(1, 15, 0),
      startTime: '15:00',
      endTime: '15:45',
      duration: 45,
      servicePrice: 45000,
      totalAmount: 45000,
      status: BOOKING_STATUS.PENDING,
      paymentStatus: PAYMENT_STATUS.PENDING,
      bookingType: BOOKING_TYPE.SALON,
    },
    {
      bookingNumber: 'BMN-DEMO-105',
      customer: customerOne._id,
      salon: allSalons[4]._id,
      barber: allBarbers.find((barber: any) => barber.salon.toString() === allSalons[4]._id.toString())?._id,
      service: allServices.find((service: any) => service.salon.toString() === allSalons[4]._id.toString())?._id,
      appointmentDate: getDateAtTime(7, 12, 0),
      startTime: '12:00',
      endTime: '12:45',
      duration: 45,
      servicePrice: 45000,
      totalAmount: 45000,
      status: BOOKING_STATUS.CONFIRMED,
      paymentStatus: PAYMENT_STATUS.PENDING,
      bookingType: BOOKING_TYPE.SALON,
    },
  ];

  for (const bookingDetail of bookingScenarios) {
    const bookingExists = await Booking.findOne({ bookingNumber: bookingDetail.bookingNumber });
    if (!bookingExists) {
      await Booking.create({
        ...bookingDetail,
        salon: bookingDetail.salon,
        barber: bookingDetail.barber,
        service: bookingDetail.service,
      });
    }
  }

  if (allSalons[1] && allSalons[1].capacity === 1) {
    const doubleBookingSalon = allSalons[1];
    const doubleBookingService = allServices.find((service: any) => service.salon.toString() === doubleBookingSalon._id.toString());
    const doubleBookingBarber = allBarbers.find((barber: any) => barber.salon.toString() === doubleBookingSalon._id.toString());
    const controlBooking = await Booking.findOne({ salon: doubleBookingSalon._id, bookingNumber: 'BMN-DEMO-DOUBLE-1' });
    if (!controlBooking) {
      await Booking.create({
        bookingNumber: 'BMN-DEMO-DOUBLE-1',
        customer: customerOne._id,
        salon: doubleBookingSalon._id,
        barber: doubleBookingBarber?._id,
        service: doubleBookingService?._id,
        appointmentDate: getDateAtTime(3, 17, 0),
        startTime: '17:00',
        endTime: '17:45',
        duration: 45,
        servicePrice: doubleBookingService?.price ?? 45000,
        totalAmount: doubleBookingService?.price ?? 45000,
        status: BOOKING_STATUS.CONFIRMED,
        paymentStatus: PAYMENT_STATUS.PENDING,
        bookingType: BOOKING_TYPE.SALON,
      });
    }
  }

  const couponCatalog = [
    {
      code: 'WELCOME50',
      description: 'Welcome discount for first-time customers',
      discountType: 'PERCENTAGE' as const,
      discountValue: 10,
      minimumOrderValue: 50000,
      maximumDiscount: 5000,
      startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
      applicableSalons: [allSalons[0]._id, allSalons[1]._id],
    },
    {
      code: 'FIRSTBOOK',
      description: 'Flat discount on first booking',
      discountType: 'FIXED' as const,
      discountValue: 10000,
      minimumOrderValue: 50000,
      maximumDiscount: 10000,
      startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 60),
      applicableSalons: [allSalons[2]._id, allSalons[3]._id],
    },
    {
      code: 'SALON100',
      description: 'Salon-specific offer on qualifying services',
      discountType: 'FIXED' as const,
      discountValue: 15000,
      minimumOrderValue: 60000,
      maximumDiscount: 15000,
      startDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20),
      expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 120),
      applicableSalons: [allSalons[4]._id],
    },
  ];

  for (const coupon of couponCatalog) {
    await ensureCoupon(coupon);
  }

  const reviewBooking = await Booking.findOne({ bookingNumber: 'BMN-DEMO-103' });
  if (reviewBooking) {
    await ensureReview({
      customerId: customerOne._id,
      bookingId: reviewBooking._id,
      salonId: reviewBooking.salon,
      barberId: reviewBooking.barber,
      serviceId: reviewBooking.service,
      rating: 5,
      review: 'Excellent service and polished finish. The team was professional and the cut was exactly what I wanted.',
    });
  }

  const customerBookingNotifications = [
    {
      recipientId: customerOne._id,
      recipientRole: USER_ROLES.CUSTOMER,
      type: NOTIFICATION_TYPES.BOOKING_CONFIRMED,
      title: 'Appointment confirmed',
      message: 'Your booking at Urban Trim Studio is confirmed for next week.',
      bookingId: (await Booking.findOne({ bookingNumber: 'BMN-DEMO-101' }))?._id,
      salonId: demoSalonA._id,
      barberId: salonABarber?._id,
    },
    {
      recipientId: customerTwo._id,
      recipientRole: USER_ROLES.CUSTOMER,
      type: NOTIFICATION_TYPES.BOOKING_CANCELLED,
      title: 'Booking cancelled',
      message: 'Your appointment at The Grooming Room has been cancelled.',
      bookingId: (await Booking.findOne({ bookingNumber: 'BMN-DEMO-102' }))?._id,
      salonId: secondSalon._id,
      barberId: secondBarber?._id,
    },
  ];

  for (const notification of customerBookingNotifications) {
    if (notification.bookingId) {
      await ensureNotification(notification);
    }
  }

  console.log('✅ Demo data seeded successfully');
  const salonCount = await Salon.countDocuments();
  const serviceCount = await Service.countDocuments();
  const barberCount = await Barber.countDocuments();
  const userCount = await User.countDocuments({ phone: { $regex: /^\+9190000000/ } });
  const couponCount = await Coupon.countDocuments();
  const bookingCount = await Booking.countDocuments();
  const notificationCount = await NotificationModel.countDocuments();
  const reviewCount = await Review.countDocuments();

  console.log(JSON.stringify({
    salons: salonCount,
    services: serviceCount,
    barbers: barberCount,
    users: userCount,
    coupons: couponCount,
    bookings: bookingCount,
    notifications: notificationCount,
    reviews: reviewCount,
  }, null, 2));
};

const main = async () => {
  if (IS_RESET) {
    await resetDemoData();
    return;
  }

  await createDemoData();
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
