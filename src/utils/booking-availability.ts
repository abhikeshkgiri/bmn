import { isTimeOverlap } from '@/utils/booking';

interface BookingTimeRange {
  startTime: string;
  endTime: string;
}

export interface AvailabilitySlot {
  startTime: string;
  endTime: string;
  available: boolean;
  capacity: number;
  booked: number;
  remaining: number;
}

export function buildAvailabilitySlots(options: {
  isOpen: boolean;
  openingTime: string;
  closingTime: string;
  serviceDuration: number;
  salonCapacity: number;
  slotIntervalMinutes: number;
  bookings: BookingTimeRange[];
  barberUnavailable: boolean;
  appointmentDate?: Date;
  now?: Date;
}): AvailabilitySlot[] {
  if (!options.isOpen) {
    return [];
  }

  const slots: AvailabilitySlot[] = [];
  const [openHour, openMin] = options.openingTime.split(':').map(Number);
  const [closeHour, closeMin] = options.closingTime.split(':').map(Number);

  let currentHour = openHour;
  let currentMin = openMin;
  const closeTotalMin = closeHour * 60 + closeMin;
  const now = options.now || new Date();
  const isToday = options.appointmentDate !== undefined &&
    options.appointmentDate.getFullYear() === now.getFullYear() &&
    options.appointmentDate.getMonth() === now.getMonth() &&
    options.appointmentDate.getDate() === now.getDate();

  while (currentHour * 60 + currentMin + options.serviceDuration <= closeTotalMin) {
    const startTime = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
    const endHour = Math.floor((currentHour * 60 + currentMin + options.serviceDuration) / 60);
    const endMin = (currentHour * 60 + currentMin + options.serviceDuration) % 60;
    const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
    const booked = options.bookings.filter((booking) =>
      isTimeOverlap(booking.startTime, booking.endTime, startTime, endTime)
    ).length;
    const remaining = Math.max(0, options.salonCapacity - booked);

    slots.push({
      startTime,
      endTime,
      available: remaining > 0 &&
        !options.barberUnavailable &&
        (!isToday || currentHour * 60 + currentMin > now.getHours() * 60 + now.getMinutes()),
      capacity: options.salonCapacity,
      booked,
      remaining,
    });

    currentMin += options.slotIntervalMinutes;
    if (currentMin >= 60) {
      currentHour += Math.floor(currentMin / 60);
      currentMin %= 60;
    }
  }

  return slots;
}
