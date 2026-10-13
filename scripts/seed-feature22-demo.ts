import { existsSync } from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import { connectDB } from '../src/lib/db';
import { USER_ROLES } from '../src/constants/roles';
import { SALON_FACILITY } from '../src/constants/services';
import { SUPPORTED_LAUNCH_CITIES } from '../src/constants/launch-cities';
import AuditLog from '../src/models/AuditLog';
import Barber from '../src/models/Barber';
import Booking from '../src/models/Booking';
import Coupon from '../src/models/Coupon';
import CouponUsage from '../src/models/CouponUsage';
import CustomerAddress from '../src/models/CustomerAddress';
import Favorite from '../src/models/Favorite';
import InventoryItem from '../src/models/InventoryItem';
import Leave from '../src/models/Leave';
import { LoyaltyAccount, LoyaltyTransaction } from '../src/models/Loyalty';
import { CustomerMembership } from '../src/models/Membership';
import Notification from '../src/models/Notification';
import Payment from '../src/models/Payment';
import Payout from '../src/models/Payout';
import Review from '../src/models/Review';
import PushSubscription from '../src/models/PushSubscription';
import Salon from '../src/models/Salon';
import Service from '../src/models/Service';
import SupportTicket from '../src/models/SupportTicket';
import User from '../src/models/User';
import { BarberCreateSchema } from '../src/validations/barber.schema';
import { SalonCreateSchema } from '../src/validations/salon.schema';
import { ServiceCreateSchema } from '../src/validations/service.schema';
import {
  DEMO_BARBER_SPECIALIZATIONS,
  DEMO_IMAGE_PATH,
  DEMO_SALONS,
  DEMO_SERVICE_FIXTURES,
  FEATURE22_DEMO_KEY_PREFIX,
  getFeature22DemoKeys,
  validateFeature22DemoData,
} from './feature22-demo-data';

type OperationMode = 'seed' | 'cleanup';

type DemoUserSpec = {
  demoKey: string;
  name: string;
  email: string;
  phone: string;
  role: typeof USER_ROLES.SALON_OWNER | typeof USER_ROLES.BARBER;
};

function getConfirmedDatabaseName(mode: OperationMode): string {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Feature 22 demo data operations are disabled in production.');
  }

  const configuredUri = process.env.MONGODB_URI;
  if (!configuredUri) throw new Error('MONGODB_URI is not configured.');

  let uri: URL;
  try {
    uri = new URL(configuredUri);
  } catch {
    throw new Error('Configured MongoDB target is not a valid URI.');
  }

  if (!['mongodb:', 'mongodb+srv:'].includes(uri.protocol)) {
    throw new Error('Configured MongoDB target must use MongoDB.');
  }

  const databaseName = decodeURIComponent(uri.pathname.replace(/^\/+/, '').split('/')[0] ?? '');
  if (!databaseName || /prod/i.test(databaseName) || !/(?:^|[-_])(dev|development|test|testing)(?:$|[-_])/i.test(databaseName)) {
    throw new Error('Refusing to operate: configured database is not explicitly named as a development or test database.');
  }
  const hostname = uri.hostname.toLowerCase();
  if (/prod/i.test(hostname)) {
    throw new Error('Refusing to operate: configured MongoDB host appears to be production.');
  }
  const isLocalDevelopmentHost = ['localhost', '127.0.0.1', '::1'].includes(hostname);
  const isExplicitDevelopmentHost = /(?:^|[-.])(?:dev(?:elopment)?|test(?:ing)?)(?:$|[-.])/.test(hostname);
  if (!isLocalDevelopmentHost && !isExplicitDevelopmentHost) {
    throw new Error('Refusing to operate: the MongoDB host does not identify itself as development or test.');
  }

  const confirmationIndex = process.argv.indexOf('--confirm-database');
  const confirmedName = confirmationIndex >= 0 ? process.argv[confirmationIndex + 1] : undefined;
  if (confirmedName !== databaseName) {
    throw new Error(`Confirm the non-production database explicitly with --confirm-database ${databaseName}.`);
  }

  if (mode === 'cleanup' && !process.argv.includes('--confirm-delete-feature22-demo')) {
    throw new Error('Cleanup requires --confirm-delete-feature22-demo in addition to database confirmation.');
  }

  return databaseName;
}

function getDemoUserSpecs(): DemoUserSpec[] {
  return DEMO_SALONS.flatMap((salon, index) => {
    const serial = String(index + 1).padStart(3, '0');
    return [
      {
        demoKey: `${FEATURE22_DEMO_KEY_PREFIX}owner:${salon.key}`,
        name: `Demo Owner ${salon.city} ${serial}`,
        email: `owner.${salon.key}@example.com`,
        phone: `+9991000${serial}`,
        role: USER_ROLES.SALON_OWNER,
      },
      {
        demoKey: `${FEATURE22_DEMO_KEY_PREFIX}barber-user:${salon.key}`,
        name: `Demo Barber ${salon.city} ${serial}`,
        email: `barber.${salon.key}@example.com`,
        phone: `+9992000${serial}`,
        role: USER_ROLES.BARBER,
      },
    ];
  });
}

function getSalonKey(key: string): string {
  return `${FEATURE22_DEMO_KEY_PREFIX}salon:${key}`;
}

function getBarberKey(key: string): string {
  return `${FEATURE22_DEMO_KEY_PREFIX}barber:${key}`;
}

function getServiceKey(salonKey: string, serviceSlug: string): string {
  return `${FEATURE22_DEMO_KEY_PREFIX}service:${salonKey}:${serviceSlug}`;
}

function getServiceSlug(salonKey: string, serviceSlug: string): string {
  return `${serviceSlug}-${salonKey}`;
}

function makeOpeningHours() {
  const open = { isOpen: true, openTime: '09:00', closeTime: '20:00' };
  const late = { isOpen: true, openTime: '10:00', closeTime: '21:00' };
  const closed = { isOpen: false };
  return {
    monday: open,
    tuesday: open,
    wednesday: open,
    thursday: open,
    friday: late,
    saturday: late,
    sunday: closed,
  };
}

async function ensureNoRealRecordCollisions(): Promise<void> {
  const salonSlugs = DEMO_SALONS.map(({ slug }) => slug);
  const salonKeys = DEMO_SALONS.map(({ key }) => getSalonKey(key));
  const barberSlugs = DEMO_SALONS.map(({ slug }) => `demo-${slug}-barber`);
  const barberKeys = DEMO_SALONS.map(({ key }) => getBarberKey(key));
  const userSpecs = getDemoUserSpecs();
  const userKeys = userSpecs.map(({ demoKey }) => demoKey);

  const [salonConflicts, barberConflicts, userConflicts] = await Promise.all([
    Salon.find({ $or: [{ slug: { $in: salonSlugs } }, { demoKey: { $in: salonKeys } }] })
      .select('+demoKey slug')
      .lean(),
    Barber.find({ $or: [{ slug: { $in: barberSlugs } }, { demoKey: { $in: barberKeys } }] })
      .select('+demoKey slug')
      .lean(),
    User.find({
      $or: [
        { demoKey: { $in: userKeys } },
        { phone: { $in: userSpecs.map(({ phone }) => phone) } },
        { email: { $in: userSpecs.map(({ email }) => email) } },
      ],
    })
      .select('+demoKey phone email role')
      .lean(),
  ]);

  if (salonConflicts.some((record) => !salonKeys.includes(record.demoKey ?? ''))) {
    throw new Error('A salon slug is already owned by a record outside the Feature 22 demo dataset; no records were changed.');
  }
  if (barberConflicts.some((record) => !barberKeys.includes(record.demoKey ?? ''))) {
    throw new Error('A barber slug is already owned by a record outside the Feature 22 demo dataset; no records were changed.');
  }
  if (userConflicts.some((record) => !userKeys.includes(record.demoKey ?? ''))) {
    throw new Error('A demo account phone or email is already owned by a record outside this dataset; no records were changed.');
  }

  for (const spec of userSpecs) {
    const existing = userConflicts.find((record) => record.demoKey === spec.demoKey);
    if (existing && existing.role !== spec.role) {
      throw new Error(`Demo account ${spec.demoKey} has an unexpected role; no records were changed.`);
    }
  }

  for (const salon of salonConflicts) {
    const fixture = DEMO_SALONS.find(({ slug }) => slug === salon.slug);
    if (!fixture) throw new Error('A marked demo salon no longer matches a known fixture; no records were changed.');
    const serviceSlugs = DEMO_SERVICE_FIXTURES.map(({ slug }) => getServiceSlug(fixture.key, slug));
    const expectedServiceKeys = DEMO_SERVICE_FIXTURES.map(({ slug }) =>
      getServiceKey(fixture.key, slug),
    );
    const serviceConflicts = await Service.find({
      salon: salon._id,
      slug: { $in: serviceSlugs },
    })
      .select('+demoKey slug')
      .lean();
    if (serviceConflicts.some((service) => !expectedServiceKeys.includes(service.demoKey ?? ''))) {
      throw new Error('A demo service slug is already used by a record outside this dataset; no records were changed.');
    }
  }
}

async function findOrCreateDemoUser(spec: DemoUserSpec): Promise<InstanceType<typeof User>> {
  let user = await User.findOne({ demoKey: spec.demoKey }).select('+demoKey');
  if (user) {
    if (user.role !== spec.role) throw new Error(`Demo account ${spec.demoKey} has an unexpected role.`);
    return user;
  }

  user = await User.create({
    ...spec,
    isActive: true,
    isVerified: false,
  });
  return user;
}

async function saveOwnedRecord<T extends { save: () => Promise<unknown> }>(
  findExisting: () => Promise<T | null>,
  createNew: () => Promise<T>,
  demoKey: string,
  record: object,
): Promise<{ document: T; created: boolean }> {
  const existing = await findExisting();
  if (existing) {
    Object.assign(existing, record, { demoKey });
    await existing.save();
    return { document: existing, created: false };
  }
  return { document: await createNew(), created: true };
}

async function seedDemoData(databaseName: string): Promise<void> {
  const dataErrors = validateFeature22DemoData();
  if (dataErrors.length > 0) throw new Error(`Demo fixture validation failed: ${dataErrors.join('; ')}`);
  if (!existsSync(path.join(process.cwd(), 'public', DEMO_IMAGE_PATH.slice(1)))) {
    throw new Error(`Required local fallback image is missing: ${DEMO_IMAGE_PATH}`);
  }

  await connectDB();
  if (mongooseDatabaseName() !== databaseName) {
    throw new Error('Connected database does not match the explicitly confirmed database name.');
  }
  await ensureNoRealRecordCollisions();

  const counts = {
    salonsCreated: 0,
    salonsUpdated: 0,
    servicesCreated: 0,
    servicesUpdated: 0,
    barbersCreated: 0,
    barbersUpdated: 0,
    accountsCreated: 0,
  };
  const userByKey = new Map<string, InstanceType<typeof User>>();
  for (const spec of getDemoUserSpecs()) {
    const before = await User.exists({ demoKey: spec.demoKey });
    const user = await findOrCreateDemoUser(spec);
    userByKey.set(spec.demoKey, user);
    if (!before) counts.accountsCreated += 1;
  }

  for (const [index, fixture] of DEMO_SALONS.entries()) {
    const location = SUPPORTED_LAUNCH_CITIES.find(({ city }) => city === fixture.city);
    if (!location) throw new Error(`Unsupported configured launch city for ${fixture.key}.`);

    const owner = userByKey.get(`${FEATURE22_DEMO_KEY_PREFIX}owner:${fixture.key}`);
    const barberUser = userByKey.get(`${FEATURE22_DEMO_KEY_PREFIX}barber-user:${fixture.key}`);
    if (!owner || !barberUser) throw new Error(`Demo accounts are missing for ${fixture.key}.`);

    const salonInput = SalonCreateSchema.parse({
      name: fixture.name,
      slug: fixture.slug,
      description: `Temporary demonstration listing for discovery and booking-flow testing. This is not an operating business; its address, staff and sample prices are illustrative. ${fixture.concept}.`,
      logo: '',
      coverImage: '',
      images: [],
      address: {
        addressLine1: fixture.addressLine1,
        area: fixture.area,
        landmark: fixture.landmark,
        city: location.city,
        state: location.state,
        postalCode: fixture.postalCode,
        country: 'India',
      },
      location: { type: 'Point', coordinates: fixture.coordinates },
      contact: {
        phone: `+9993000${String(index + 1).padStart(3, '0')}`,
        email: `hello.${fixture.key}@example.com`,
      },
      openingHours: makeOpeningHours(),
      facilities: [
        SALON_FACILITY.AC,
        SALON_FACILITY.WIFI,
        SALON_FACILITY.WAITING_AREA,
        SALON_FACILITY.CARD_PAYMENT,
        SALON_FACILITY.UPI,
      ],
    });

    const salonDemoKey = getSalonKey(fixture.key);
    const salonRecord = {
      ...salonInput,
      logo: DEMO_IMAGE_PATH,
      coverImage: DEMO_IMAGE_PATH,
      images: [DEMO_IMAGE_PATH],
      owner: owner._id,
      barbers: [],
      services: [],
      capacity: 3,
      slotIntervalMinutes: 30,
      rating: 0,
      reviewCount: 0,
      isVerified: true,
      approvalStatus: 'APPROVED',
      rejectionReason: null,
      isActive: true,
    };
    const salonResult = await saveOwnedRecord(
      () => Salon.findOne({ demoKey: salonDemoKey }).select('+demoKey'),
      () => Salon.create({ ...salonRecord, demoKey: salonDemoKey }),
      salonDemoKey,
      salonRecord,
    );
    const salon = salonResult.document as InstanceType<typeof Salon>;
    counts[salonResult.created ? 'salonsCreated' : 'salonsUpdated'] += 1;

    const serviceDocuments: Array<InstanceType<typeof Service>> = [];
    for (const serviceFixture of DEMO_SERVICE_FIXTURES) {
      const serviceInput = ServiceCreateSchema.parse({
        salonId: salon._id.toString(),
        name: serviceFixture.name,
        description: serviceFixture.description,
        category: serviceFixture.category,
        duration: serviceFixture.duration,
        price: serviceFixture.price,
      });
      const { salonId: validatedSalonId, ...validatedServiceInput } = serviceInput;
      if (validatedSalonId !== salon._id.toString()) {
        throw new Error(`Service validation returned an unexpected salon for ${fixture.key}.`);
      }
      const serviceDemoKey = getServiceKey(fixture.key, serviceFixture.slug);
      const serviceRecord = {
        salon: salon._id,
        slug: getServiceSlug(fixture.key, serviceFixture.slug),
        ...validatedServiceInput,
        image: DEMO_IMAGE_PATH,
        isActive: true,
      };
      const serviceResult = await saveOwnedRecord(
        () => Service.findOne({ demoKey: serviceDemoKey }).select('+demoKey'),
        () => Service.create({ ...serviceRecord, demoKey: serviceDemoKey }),
        serviceDemoKey,
        serviceRecord,
      );
      serviceDocuments.push(serviceResult.document as InstanceType<typeof Service>);
      counts[serviceResult.created ? 'servicesCreated' : 'servicesUpdated'] += 1;
    }

    const barberInput = BarberCreateSchema.parse({
      salonId: salon._id.toString(),
      userId: barberUser._id.toString(),
      name: `Demo Barber ${fixture.city} ${String(index + 1).padStart(3, '0')}`,
      bio: `Temporary barber profile for the ${fixture.city} demo salon. Profile details are illustrative.`,
      experienceYears: 4 + (index % 9),
      specializations: [...DEMO_BARBER_SPECIALIZATIONS],
      services: serviceDocuments.map(({ _id }) => _id.toString()),
      offersHomeService: false,
    });
    const barberDemoKey = getBarberKey(fixture.key);
    const barberRecord = {
      user: barberUser._id,
      salon: salon._id,
      name: barberInput.name,
      slug: `demo-${fixture.slug}-barber`,
      bio: barberInput.bio,
      profileImage: DEMO_IMAGE_PATH,
      experienceYears: barberInput.experienceYears,
      specializations: barberInput.specializations,
      services: serviceDocuments.map(({ _id }) => _id),
      portfolio: [],
      rating: 0,
      reviewCount: 0,
      isAvailable: true,
      offersHomeService: false,
      isVerified: true,
      isActive: true,
    };
    const barberResult = await saveOwnedRecord(
      () => Barber.findOne({ demoKey: barberDemoKey }).select('+demoKey'),
      () => Barber.create({ ...barberRecord, demoKey: barberDemoKey }),
      barberDemoKey,
      barberRecord,
    );
    const barber = barberResult.document as InstanceType<typeof Barber>;
    counts[barberResult.created ? 'barbersCreated' : 'barbersUpdated'] += 1;

    salon.set({
      barbers: [barber._id],
      services: serviceDocuments.map(({ _id }) => _id),
    });
    await salon.save();
  }

  console.log('Feature 22 demo seed completed.', {
    dataset: 'feature22-demo-salons-v1',
    database: databaseName,
    ...counts,
    totalSalons: DEMO_SALONS.length,
    citiesCovered: SUPPORTED_LAUNCH_CITIES.length,
    servicesPerSalon: DEMO_SERVICE_FIXTURES.length,
  });
}

function mongooseDatabaseName(): string | undefined {
  return mongoose.connection.db?.databaseName;
}

async function cleanupDemoData(databaseName: string): Promise<void> {
  await connectDB();
  if (mongooseDatabaseName() !== databaseName) {
    throw new Error('Connected database does not match the explicitly confirmed database name.');
  }

  const keys = getFeature22DemoKeys();
  const [salons, services, barbers, users] = await Promise.all([
    Salon.find({ demoKey: { $in: keys } }).select('+demoKey').lean(),
    Service.find({ demoKey: { $in: keys } }).select('+demoKey').lean(),
    Barber.find({ demoKey: { $in: keys } }).select('+demoKey').lean(),
    User.find({ demoKey: { $in: keys } }).select('+demoKey').lean(),
  ]);
  const salonIds = salons.map(({ _id }) => _id);
  const serviceIds = services.map(({ _id }) => _id);
  const barberIds = barbers.map(({ _id }) => _id);
  const userIds = users.map(({ _id }) => _id);

  const [
    bookings,
    payments,
    reviews,
    notifications,
    favorites,
    pushSubscriptions,
    auditLogs,
    coupons,
    couponUsage,
    customerAddresses,
    loyaltyAccounts,
    loyaltyTransactions,
    memberships,
    payouts,
    supportTickets,
    inventoryItems,
    leaves,
    foreignSalons,
    foreignBarbers,
    foreignServices,
  ] = await Promise.all([
    Booking.exists({
      $or: [
        { salon: { $in: salonIds } },
        { service: { $in: serviceIds } },
        { barber: { $in: barberIds } },
        { customer: { $in: userIds } },
      ],
    }),
    Payment.exists({ customer: { $in: userIds } }),
    Review.exists({
      $or: [
        { customer: { $in: userIds } },
        { salon: { $in: salonIds } },
        { barber: { $in: barberIds } },
        { service: { $in: serviceIds } },
      ],
    }),
    Notification.exists({
      $or: [
        { recipientId: { $in: userIds } },
        { salonId: { $in: salonIds } },
        { barberId: { $in: barberIds } },
      ],
    }),
    Favorite.exists({
      $or: [
        { customer: { $in: userIds } },
        { target: { $in: [...salonIds, ...barberIds] } },
      ],
    }),
    PushSubscription.exists({ user: { $in: userIds } }),
    AuditLog.exists({
      $or: [
        { actorId: { $in: userIds } },
        { entityId: { $in: [...salonIds, ...serviceIds, ...barberIds] } },
      ],
    }),
    Coupon.exists({
      $or: [
        { 'applicable.salons': { $in: salonIds } },
        { 'applicable.services': { $in: serviceIds } },
        { 'applicable.customers': { $in: userIds } },
      ],
    }),
    CouponUsage.exists({ customer: { $in: userIds } }),
    CustomerAddress.exists({ customer: { $in: userIds } }),
    LoyaltyAccount.exists({ customer: { $in: userIds } }),
    LoyaltyTransaction.exists({ customer: { $in: userIds } }),
    CustomerMembership.exists({ customer: { $in: userIds } }),
    Payout.exists({ recipient: { $in: userIds } }),
    SupportTicket.exists({
      $or: [
        { customer: { $in: userIds } },
        { 'messages.author': { $in: userIds } },
      ],
    }),
    InventoryItem.exists({ salon: { $in: salonIds } }),
    Leave.exists({
      $or: [
        { salon: { $in: salonIds } },
        { barber: { $in: barberIds } },
      ],
    }),
    Salon.exists({
      _id: { $nin: salonIds },
      $or: [
        { barbers: { $in: barberIds } },
        { owner: { $in: userIds } },
        { staff: { $in: userIds } },
      ],
    }),
    Barber.exists({
      _id: { $nin: barberIds },
      $or: [
        { services: { $in: serviceIds } },
        { salon: { $in: salonIds } },
        { user: { $in: userIds } },
      ],
    }),
    Service.exists({ _id: { $nin: serviceIds }, salon: { $in: salonIds } }),
  ]);

  if (
    bookings || payments || reviews || notifications || favorites || pushSubscriptions ||
    auditLogs || coupons || couponUsage || customerAddresses || loyaltyAccounts ||
    loyaltyTransactions || memberships || payouts || supportTickets || inventoryItems || leaves ||
    foreignSalons || foreignBarbers || foreignServices
  ) {
    throw new Error('Cleanup stopped: demo records have booking/history or external relationships. No records were deleted.');
  }

  const serviceResult = await Service.deleteMany({ demoKey: { $in: keys } });
  const barberResult = await Barber.deleteMany({ demoKey: { $in: keys } });
  const salonResult = await Salon.deleteMany({ demoKey: { $in: keys } });
  const userResult = await User.deleteMany({ demoKey: { $in: keys } });

  console.log('Feature 22 demo cleanup completed.', {
    dataset: 'feature22-demo-salons-v1',
    database: databaseName,
    servicesDeleted: serviceResult.deletedCount,
    barbersDeleted: barberResult.deletedCount,
    salonsDeleted: salonResult.deletedCount,
    accountsDeleted: userResult.deletedCount,
  });
}

async function main(): Promise<void> {
  const mode = process.argv[2];
  if (mode !== 'seed' && mode !== 'cleanup') {
    throw new Error('Choose exactly one operation: seed or cleanup.');
  }
  const databaseName = getConfirmedDatabaseName(mode);
  if (mode === 'seed') {
    await seedDemoData(databaseName);
  } else {
    await cleanupDemoData(databaseName);
  }
  await mongoose.disconnect();
}

main().catch(async (error: unknown) => {
  await mongoose.disconnect().catch(() => undefined);
  const errorName = error instanceof Error ? error.name : 'UnknownError';
  const message = error instanceof Error ? error.message : 'Unknown failure';
  console.error(`Feature 22 demo operation failed (${errorName}): ${message}`);
  process.exitCode = 1;
});
