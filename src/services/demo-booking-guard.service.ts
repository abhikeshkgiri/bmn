import type mongoose from 'mongoose';
import type { Types } from 'mongoose';
import Salon from '@/models/Salon';
import Barber from '@/models/Barber';
import Service from '@/models/Service';
import { isFeature22DemoRecord } from '@/utils/transaction-eligibility';

export async function isFeature22Booking(
  booking: {
    salon: Types.ObjectId;
    barber?: Types.ObjectId | null;
    service?: Types.ObjectId | null;
  },
  session?: mongoose.ClientSession,
): Promise<boolean> {
  const salonQuery = Salon.findById(booking.salon).select('+demoKey');
  const barberQuery = booking.barber
    ? Barber.findById(booking.barber).select('+demoKey')
    : null;
  const serviceQuery = booking.service
    ? Service.findById(booking.service).select('+demoKey')
    : null;
  if (session) {
    salonQuery.session(session);
    barberQuery?.session(session);
    serviceQuery?.session(session);
  }
  const [salon, barber, service] = await Promise.all([
    salonQuery,
    barberQuery,
    serviceQuery,
  ]);
  return isFeature22DemoRecord(salon?.demoKey, barber?.demoKey, service?.demoKey);
}
