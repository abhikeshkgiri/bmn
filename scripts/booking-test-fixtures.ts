import { Types } from 'mongoose';
import { BOOKING_STATUS, BOOKING_TYPE, PAYMENT_STATUS } from '../src/constants/booking';
import { BARBER_SPECIALIZATION, SERVICE_CATEGORY } from '../src/constants/services';
import Booking from '../src/models/Booking';
import Barber from '../src/models/Barber';
import Salon from '../src/models/Salon';
import Service from '../src/models/Service';
import User from '../src/models/User';

const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

function createSyntheticUser(role: 'SALON_OWNER' | 'BARBER' | 'CUSTOMER') {
  const token = new Types.ObjectId().toHexString();
  const phoneSuffix = Number.parseInt(token.slice(-8), 16).toString().padStart(10, '0');
  return new User({
    name: `Synthetic ${role.toLowerCase()} ${token.slice(-6)}`,
    phone: `+1${phoneSuffix}`,
    role,
    isActive: true,
    isVerified: true,
  });
}

export function createBookingTestFixtures(options?: {
  capacity?: number;
  customerCount?: number;
  barberCount?: number;
  appointmentDate?: Date;
  startTime?: string;
}) {
  const capacity = options?.capacity ?? 2;
  const customerCount = options?.customerCount ?? 3;
  const barberCount = options?.barberCount ?? 3;
  const appointmentDate = options?.appointmentDate ?? new Date(Date.now() + 24 * 60 * 60 * 1000);
  const startTime = options?.startTime ?? '17:00';
  const token = new Types.ObjectId().toHexString();

  const owner = createSyntheticUser('SALON_OWNER');
  const customers = Array.from({ length: customerCount }, () => createSyntheticUser('CUSTOMER'));
  const barberUsers = Array.from({ length: barberCount }, () => createSyntheticUser('BARBER'));
  const serviceId = new Types.ObjectId();
  const barbers = barberUsers.map((user, index) => new Barber({
    _id: new Types.ObjectId(),
    user: user._id,
    salon: new Types.ObjectId(),
    name: `Synthetic Barber ${index + 1}`,
    slug: `synthetic-barber-${token}-${index + 1}`,
    experienceYears: 5,
    specializations: [BARBER_SPECIALIZATION.HAIRCUT],
    services: [serviceId],
    isAvailable: true,
    isActive: true,
    isVerified: true,
  }));
  const salonId = new Types.ObjectId();
  const salon = new Salon({
    _id: salonId,
    name: `Synthetic Salon ${token.slice(-6)}`,
    slug: `synthetic-salon-${token}`,
    owner: owner._id,
    barbers: barbers.map((barber) => barber._id),
    services: [serviceId],
    address: {
      addressLine1: '1 Synthetic Test Lane',
      city: 'Delhi',
      state: 'Delhi',
      postalCode: '110001',
      country: 'India',
    },
    location: { type: 'Point', coordinates: [77.209, 28.6139] },
    contact: { phone: '+15551234567' },
    openingHours: Object.fromEntries(
      WEEKDAYS.map((day) => [day, { isOpen: true, openTime: '09:00', closeTime: '21:00' }]),
    ),
    capacity,
    slotIntervalMinutes: 30,
    isActive: true,
    isVerified: true,
    approvalStatus: 'APPROVED',
  });
  const service = new Service({
    _id: serviceId,
    salon: salon._id,
    name: 'Synthetic Haircut',
    slug: `synthetic-haircut-${token}`,
    category: SERVICE_CATEGORY.HAIRCUT,
    duration: 30,
    price: 500,
    isActive: true,
  });
  for (const barber of barbers) {
    barber.salon = salon._id;
  }

  const baselineBookings = Array.from({ length: Math.max(0, capacity - 1) }, (_, index) => new Booking({
    bookingNumber: `BMN-TEST-${token}-${index + 1}`,
    customer: customers[0]._id,
    salon: salon._id,
    barber: barbers[index % barbers.length]._id,
    service: service._id,
    appointmentDate,
    startTime,
    endTime: '17:30',
    duration: service.duration,
    servicePrice: service.price,
    totalAmount: service.price,
    status: BOOKING_STATUS.CONFIRMED,
    paymentStatus: PAYMENT_STATUS.PAID,
    bookingType: BOOKING_TYPE.SALON,
  }));

  return {
    owner,
    customers,
    barberUsers,
    salon,
    barbers,
    service,
    baselineBookings,
  };
}
