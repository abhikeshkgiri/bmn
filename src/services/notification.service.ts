import { Types } from 'mongoose';
import Notification, { type INotification } from '@/models/Notification';
import Booking from '@/models/Booking';
import Payment from '@/models/Payment';
import Salon from '@/models/Salon';
import Barber from '@/models/Barber';
import User from '@/models/User';
import { sendPushNotificationToUser } from '@/services/push.service';
import { connectDB } from '@/lib/db';
import type { AuthUser } from '@/types';
import { USER_ROLES } from '@/constants/roles';
import { NOTIFICATION_PRIORITY, NOTIFICATION_TYPES, type NotificationType } from '@/constants/notifications';
import { BOOKING_STATUS, PAYMENT_STATUS } from '@/constants/booking';
import {
  getBookingNotificationEventKey,
  getCustomerNotificationChannel,
  isAppointmentReminderEligible,
  type AppointmentReminderType,
} from '@/utils/notification';

export interface NotificationCreateInput {
  recipientId: string;
  recipientRole: (typeof USER_ROLES)[keyof typeof USER_ROLES];
  type: NotificationType;
  title: string;
  message: string;
  bookingId?: string;
  salonId?: string;
  barberId?: string;
  eventKey?: string;
  priority?: 'LOW' | 'NORMAL' | 'HIGH';
  metadata?: Record<string, unknown>;
  channel?: 'IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';
}

export interface NotificationQueryOptions {
  page?: number;
  limit?: number;
  unread?: boolean;
  type?: NotificationType;
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;
}

export async function createNotification(input: NotificationCreateInput): Promise<INotification | null> {
  await connectDB();

  const recipientId = new Types.ObjectId(input.recipientId);
  let channel = input.channel ?? 'IN_APP';
  if (channel !== 'IN_APP' && channel !== 'PUSH') {
    throw new Error(`NOTIFICATION_CHANNEL_UNSUPPORTED:${channel}`);
  }
  if (input.recipientRole === USER_ROLES.CUSTOMER) {
    const customer = await User.findById(recipientId).select(
      'notificationPreferences.inApp notificationPreferences.push',
    );
    if (channel === 'IN_APP') {
      const preferredChannel = getCustomerNotificationChannel(
        customer?.notificationPreferences?.inApp,
        customer?.notificationPreferences?.push,
      );
      if (!preferredChannel) return null;
      channel = preferredChannel;
    } else if (customer?.notificationPreferences?.push === false) {
      return null;
    }
  }

  const notificationData = {
    recipientId,
    recipientRole: input.recipientRole,
    type: input.type,
    title: input.title,
    message: input.message,
    bookingId: input.bookingId ? new Types.ObjectId(input.bookingId) : undefined,
    salonId: input.salonId ? new Types.ObjectId(input.salonId) : undefined,
    barberId: input.barberId ? new Types.ObjectId(input.barberId) : undefined,
    priority: input.priority ?? NOTIFICATION_PRIORITY.NORMAL,
    channel,
    metadata: input.metadata ?? {},
    isRead: false,
    ...(input.eventKey ? { eventKey: input.eventKey } : {}),
  };

  let notification: INotification;
  let inserted = true;
  try {
    notification = await Notification.create(notificationData);
  } catch (error) {
    if (!input.eventKey || !isDuplicateKeyError(error)) throw error;
    const existing = await Notification.findOne({ recipientId, eventKey: input.eventKey });
    if (!existing) throw error;
    notification = existing;
    inserted = false;
  }

  if (inserted && (channel === 'IN_APP' || channel === 'PUSH')) {
    try {
      const delivery = await sendPushNotificationToUser(input.recipientId, {
        title: input.title,
        body: input.message,
        data: {
          url: input.bookingId ? getBookingNotificationHref(input.recipientRole, input.bookingId) : '/notifications',
        },
      });
      notification.pushDeliveryStatus = delivery.status;
      notification.pushAttempts = delivery.attempted > 0 ? 1 : 0;
      notification.pushDeliveredCount = delivery.sent;
      await notification.save();
    } catch (error) {
      notification.pushDeliveryStatus = 'FAILED';
      notification.pushAttempts = 1;
      await notification.save();
      const errorName = error instanceof Error ? error.name : 'UnknownError';
      console.error('Push notification delivery status update failed', { errorName });
    }
  }

  return notification;
}

function getBookingNotificationHref(
  recipientRole: NotificationCreateInput['recipientRole'],
  bookingId: string,
): string {
  if (recipientRole === USER_ROLES.CUSTOMER) return `/booking/${bookingId}`;
  if (recipientRole === USER_ROLES.BARBER) return '/barber/bookings';
  if (recipientRole === USER_ROLES.SALON_OWNER || recipientRole === USER_ROLES.SALON_STAFF) {
    return '/salon/bookings';
  }
  return '/notifications';
}

export async function createBulkNotifications(inputs: NotificationCreateInput[]): Promise<INotification[]> {
  if (inputs.length === 0) {
    return [];
  }

  const created = await Promise.all(inputs.map((input) => createNotification(input)));
  return created.filter((notification): notification is INotification => notification !== null);
}

async function resolveNotifications(
  notifications: Array<Promise<INotification | null>>,
): Promise<INotification[]> {
  const resolved = await Promise.all(notifications);
  return resolved.filter((notification): notification is INotification => notification !== null);
}

export async function getUserNotifications(
  userId: string,
  options: NotificationQueryOptions = {}
): Promise<{ notifications: INotification[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  await connectDB();

  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const query: Record<string, unknown> = {
    recipientId: new Types.ObjectId(userId),
    channel: 'IN_APP',
  };

  if (options.unread) {
    query.isRead = false;
  }

  if (options.type) {
    query.type = options.type;
  }

  const total = await Notification.countDocuments(query);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const notifications = await Notification.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .exec();

  return {
    notifications,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  await connectDB();
  return Notification.countDocuments({
    recipientId: new Types.ObjectId(userId),
    channel: 'IN_APP',
    isRead: false,
  });
}

export async function markNotificationAsRead(notificationId: string, currentUser: AuthUser): Promise<INotification> {
  await connectDB();

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipientId: new Types.ObjectId(currentUser._id), channel: 'IN_APP', isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
    { new: true },
  );
  if (!notification) {
    const exists = await Notification.exists({
      _id: notificationId,
      recipientId: currentUser._id,
      channel: 'IN_APP',
    });
    if (!exists) throw { code: 'NOTIFICATION_NOT_FOUND', message: 'Notification not found' };
    const alreadyRead = await Notification.findOne({
      _id: notificationId,
      recipientId: currentUser._id,
      channel: 'IN_APP',
    });
    if (!alreadyRead) throw { code: 'NOTIFICATION_NOT_FOUND', message: 'Notification not found' };
    return alreadyRead;
  }

  return notification;
}

export async function markAllNotificationsAsRead(userId: string): Promise<number> {
  await connectDB();

  const result = await Notification.updateMany(
    { recipientId: new Types.ObjectId(userId), channel: 'IN_APP', isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  return result.modifiedCount;
}

export async function deleteNotification(notificationId: string, currentUser: AuthUser): Promise<boolean> {
  await connectDB();

  const result = await Notification.deleteOne({
    _id: notificationId,
    recipientId: new Types.ObjectId(currentUser._id),
    channel: 'IN_APP',
  });
  return result.deletedCount > 0;
}

export async function runNotificationSafely(
  eventName: string,
  dispatch: () => Promise<unknown>,
): Promise<void> {
  try {
    await dispatch();
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    console.error('Notification dispatch failed', { eventName, errorName });
  }
}

function getObjectId(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && value !== null && '_id' in value) {
    const nested = value as { _id?: string | { toString: () => string } };
    return nested._id ? nested._id.toString() : null;
  }

  return null;
}

type BookingRecipient = { recipientId: string; recipientRole: (typeof USER_ROLES)[keyof typeof USER_ROLES] };

async function getSalonPersonnel(salonId: string): Promise<BookingRecipient[]> {
  const salon = await Salon.findById(salonId).select('owner staff');
  if (!salon) return [];
  const recipients = new Map<string, BookingRecipient['recipientRole']>();
  const ownerId = getObjectId(salon.owner);
  if (ownerId) recipients.set(ownerId, USER_ROLES.SALON_OWNER);
  for (const staffId of salon.staff ?? []) {
    const id = getObjectId(staffId);
    if (id && !recipients.has(id)) recipients.set(id, USER_ROLES.SALON_STAFF);
  }
  return Array.from(recipients, ([recipientId, recipientRole]) => ({ recipientId, recipientRole }));
}

async function getBookingRecipients(bookingId: string): Promise<BookingRecipient[]> {
  const booking = await Booking.findById(bookingId);
  if (!booking) return [];
  const recipients = new Map<string, BookingRecipient['recipientRole']>();
  const customerId = getObjectId(booking.customer);
  if (customerId) {
    recipients.set(customerId, USER_ROLES.CUSTOMER);
  }

  for (const person of await getSalonPersonnel(booking.salon.toString())) {
    if (!recipients.has(person.recipientId)) recipients.set(person.recipientId, person.recipientRole);
  }

  const barber = await Barber.findById(booking.barber).select('user name');
  const barberUserId = barber ? getObjectId(barber.user) : null;
  if (barberUserId) {
    recipients.set(barberUserId, USER_ROLES.BARBER);
  }

  return Array.from(recipients, ([recipientId, recipientRole]) => ({ recipientId, recipientRole }));
}

export async function notifyBookingCreated(bookingId: string): Promise<INotification[]> {
  const recipients = await getBookingRecipients(bookingId);
  if (recipients.length === 0) {
    return [];
  }

  const booking = await Booking.findById(bookingId).populate(['customer', 'salon', 'barber', 'service']);
  if (!booking) {
    return [];
  }

  const salonName = booking.salon && typeof booking.salon === 'object' && 'name' in booking.salon ? String((booking.salon as { name?: string }).name ?? 'Salon') : 'Salon';
  const customerName = booking.customer && typeof booking.customer === 'object' && 'name' in booking.customer ? String((booking.customer as { name?: string }).name ?? 'Customer') : 'Customer';
  const serviceName = booking.service && typeof booking.service === 'object' && 'name' in booking.service ? String((booking.service as { name?: string }).name ?? 'Service') : 'Service';

  const inputs = recipients.map(({ recipientId, recipientRole }) => ({
    recipientId,
    recipientRole,
    type: recipientRole === USER_ROLES.CUSTOMER
      ? NOTIFICATION_TYPES.BOOKING_CREATED
      : recipientRole === USER_ROLES.BARBER
        ? NOTIFICATION_TYPES.BARBER_BOOKING_ASSIGNED
        : NOTIFICATION_TYPES.SALON_BOOKING_RECEIVED,
    title: recipientRole === USER_ROLES.CUSTOMER
      ? 'Booking request created'
      : recipientRole === USER_ROLES.BARBER
        ? 'New appointment assigned'
        : 'New booking received',
    message: recipientRole === USER_ROLES.CUSTOMER
      ? `Your booking request for ${serviceName} at ${salonName} has been created.`
      : recipientRole === USER_ROLES.BARBER
        ? `New appointment assigned to you at ${salonName} for ${serviceName}.`
        : `New booking received from ${customerName} for ${serviceName}.`,
    bookingId,
    salonId: booking.salon ? booking.salon.toString() : undefined,
    barberId: booking.barber ? booking.barber.toString() : undefined,
    priority: NOTIFICATION_PRIORITY.NORMAL,
    metadata: { bookingNumber: booking.bookingNumber },
    eventKey: getBookingNotificationEventKey(bookingId, 'created'),
  }));

  return createBulkNotifications(inputs);
}

export async function notifyBookingConfirmed(bookingId: string): Promise<INotification[]> {
  const booking = await Booking.findById(bookingId).populate(['customer', 'salon', 'barber', 'service']);
  if (!booking) {
    return [];
  }
  if (booking.status !== BOOKING_STATUS.CONFIRMED) return [];

  const customerId = getObjectId(booking.customer);
  const salonId = booking.salon ? booking.salon.toString() : undefined;
  const barberId = booking.barber ? booking.barber.toString() : undefined;

  const notifications: Array<Promise<INotification | null>> = [];

  if (customerId) {
    notifications.push(createNotification({
      recipientId: customerId,
      recipientRole: USER_ROLES.CUSTOMER,
      type: NOTIFICATION_TYPES.BOOKING_CONFIRMED,
      title: 'Appointment confirmed',
      message: `Your appointment at ${booking.salon && typeof booking.salon === 'object' && 'name' in booking.salon ? String((booking.salon as { name?: string }).name ?? 'Salon') : 'Salon'} is confirmed.`,
      bookingId,
      salonId,
      barberId,
      priority: NOTIFICATION_PRIORITY.NORMAL,
      metadata: { bookingNumber: booking.bookingNumber },
      eventKey: getBookingNotificationEventKey(bookingId, 'confirmed'),
    }));
  }

  if (barberId) {
    const barberRecord = await Barber.findById(barberId).select('user');
    const barberUserId = barberRecord ? getObjectId(barberRecord.user) : null;
    if (barberUserId) {
      notifications.push(createNotification({
        recipientId: barberUserId,
        recipientRole: USER_ROLES.BARBER,
        type: NOTIFICATION_TYPES.BOOKING_CONFIRMED,
        title: 'Appointment confirmed',
        message: 'Your appointment has been confirmed.',
        bookingId,
        salonId,
        barberId,
        priority: NOTIFICATION_PRIORITY.NORMAL,
        metadata: { bookingNumber: booking.bookingNumber },
        eventKey: getBookingNotificationEventKey(bookingId, 'confirmed'),
      }));
    }
  }

  if (salonId) {
    const personnel = await getSalonPersonnel(salonId);
    for (const person of personnel) {
      notifications.push(createNotification({
        recipientId: person.recipientId,
        recipientRole: person.recipientRole,
        type: NOTIFICATION_TYPES.SALON_BOOKING_RECEIVED,
        title: 'Booking confirmed',
        message: `Booking ${booking.bookingNumber} has been confirmed.`,
        bookingId,
        salonId,
        barberId,
        priority: NOTIFICATION_PRIORITY.NORMAL,
        metadata: { bookingNumber: booking.bookingNumber },
        eventKey: getBookingNotificationEventKey(bookingId, 'confirmed'),
      }));
    }
  }

  return resolveNotifications(notifications);
}

export async function notifyBookingCancelled(bookingId: string): Promise<INotification[]> {
  const booking = await Booking.findById(bookingId).populate(['customer', 'salon', 'barber']);
  if (!booking) {
    return [];
  }
  if (booking.status !== BOOKING_STATUS.CANCELLED) return [];

  const customerId = getObjectId(booking.customer);
  const salonId = booking.salon ? booking.salon.toString() : undefined;
  const barberId = booking.barber ? booking.barber.toString() : undefined;

  const notifications: Array<Promise<INotification | null>> = [];

  if (customerId) {
    notifications.push(createNotification({
      recipientId: customerId,
      recipientRole: USER_ROLES.CUSTOMER,
      type: NOTIFICATION_TYPES.BOOKING_CANCELLED,
      title: 'Booking cancelled',
      message: 'Your booking has been cancelled.',
      bookingId,
      salonId,
      barberId,
      priority: NOTIFICATION_PRIORITY.HIGH,
      metadata: { bookingNumber: booking.bookingNumber },
      eventKey: getBookingNotificationEventKey(bookingId, 'cancelled'),
    }));
  }

  if (salonId) {
    const personnel = await getSalonPersonnel(salonId);
    for (const person of personnel) {
      notifications.push(createNotification({
        recipientId: person.recipientId,
        recipientRole: person.recipientRole,
        type: NOTIFICATION_TYPES.BOOKING_CANCELLED,
        title: 'Booking cancelled',
        message: `Booking ${booking.bookingNumber} was cancelled.`,
        bookingId,
        salonId,
        barberId,
        priority: NOTIFICATION_PRIORITY.HIGH,
        metadata: { bookingNumber: booking.bookingNumber },
        eventKey: getBookingNotificationEventKey(bookingId, 'cancelled'),
      }));
    }
  }

  if (barberId) {
    const barberRecord = await Barber.findById(barberId).select('user');
    const barberUserId = barberRecord ? getObjectId(barberRecord.user) : null;
    if (barberUserId) {
      notifications.push(createNotification({
        recipientId: barberUserId,
        recipientRole: USER_ROLES.BARBER,
        type: NOTIFICATION_TYPES.BOOKING_CANCELLED,
        title: 'Appointment cancelled',
        message: 'Your appointment has been cancelled.',
        bookingId,
        salonId,
        barberId,
        priority: NOTIFICATION_PRIORITY.HIGH,
        metadata: { bookingNumber: booking.bookingNumber },
        eventKey: getBookingNotificationEventKey(bookingId, 'cancelled'),
      }));
    }
  }

  return resolveNotifications(notifications);
}

export async function notifyBookingRescheduled(bookingId: string, newAppointmentDate: Date, newStartTime: string): Promise<INotification[]> {
  const booking = await Booking.findById(bookingId).populate(['customer', 'salon', 'barber']);
  if (!booking) {
    return [];
  }
  if (
    ![BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED].includes(booking.status) ||
    booking.appointmentDate.getTime() !== newAppointmentDate.getTime() ||
    booking.startTime !== newStartTime
  ) return [];

  const customerId = getObjectId(booking.customer);
  const salonId = booking.salon ? booking.salon.toString() : undefined;
  const barberId = booking.barber ? booking.barber.toString() : undefined;
  const formattedDate = newAppointmentDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const eventKey = getBookingNotificationEventKey(
    bookingId,
    'rescheduled',
    `${newAppointmentDate.toISOString()}:${newStartTime}`,
  );
  const notifications: Array<Promise<INotification | null>> = [];

  if (customerId) {
    notifications.push(createNotification({
      recipientId: customerId,
      recipientRole: USER_ROLES.CUSTOMER,
      type: NOTIFICATION_TYPES.BOOKING_RESCHEDULED,
      title: 'Appointment rescheduled',
      message: `Your appointment has been rescheduled to ${formattedDate} at ${newStartTime}.`,
      bookingId,
      salonId,
      barberId,
      priority: NOTIFICATION_PRIORITY.NORMAL,
      metadata: { bookingNumber: booking.bookingNumber, newStartTime, newAppointmentDate: newAppointmentDate.toISOString() },
      eventKey,
    }));
  }

  if (salonId) {
    const personnel = await getSalonPersonnel(salonId);
    for (const person of personnel) {
      notifications.push(createNotification({
        recipientId: person.recipientId,
        recipientRole: person.recipientRole,
        type: NOTIFICATION_TYPES.BOOKING_RESCHEDULED,
        title: 'Booking rescheduled',
        message: `Booking ${booking.bookingNumber} has been rescheduled.`,
        bookingId,
        salonId,
        barberId,
        priority: NOTIFICATION_PRIORITY.NORMAL,
        metadata: { bookingNumber: booking.bookingNumber },
        eventKey,
      }));
    }
  }

  if (barberId) {
    const barberRecord = await Barber.findById(barberId).select('user');
    const barberUserId = barberRecord ? getObjectId(barberRecord.user) : null;
    if (barberUserId) {
      notifications.push(createNotification({
        recipientId: barberUserId,
        recipientRole: USER_ROLES.BARBER,
        type: NOTIFICATION_TYPES.BOOKING_RESCHEDULED,
        title: 'Appointment rescheduled',
        message: `Booking ${booking.bookingNumber} has been rescheduled.`,
        bookingId,
        salonId,
        barberId,
        priority: NOTIFICATION_PRIORITY.NORMAL,
        metadata: { bookingNumber: booking.bookingNumber },
        eventKey,
      }));
    }
  }

  return resolveNotifications(notifications);
}

export async function notifyBookingCompleted(bookingId: string): Promise<INotification[]> {
  const booking = await Booking.findById(bookingId);
  if (!booking || booking.status !== BOOKING_STATUS.COMPLETED) return [];

  const customerId = getObjectId(booking.customer);
  if (!customerId) return [];
  const notification = await createNotification({
    recipientId: customerId,
    recipientRole: USER_ROLES.CUSTOMER,
    type: NOTIFICATION_TYPES.APPOINTMENT_COMPLETED,
    title: 'Appointment completed',
    message: `Your appointment ${booking.bookingNumber} has been completed.`,
    bookingId,
    salonId: booking.salon.toString(),
    barberId: booking.barber.toString(),
    priority: NOTIFICATION_PRIORITY.NORMAL,
    metadata: { bookingNumber: booking.bookingNumber },
    eventKey: getBookingNotificationEventKey(bookingId, 'completed'),
  });
  return notification ? [notification] : [];
}

export async function notifyPaymentSuccess(bookingId: string): Promise<INotification[]> {
  const booking = await Booking.findById(bookingId).populate(['customer']);
  if (!booking) {
    return [];
  }
  if (booking.status !== BOOKING_STATUS.CONFIRMED || booking.paymentStatus !== PAYMENT_STATUS.PAID) {
    return [];
  }

  const customerId = getObjectId(booking.customer);
  if (!customerId) {
    return [];
  }

  const notification = await createNotification({
    recipientId: customerId,
    recipientRole: USER_ROLES.CUSTOMER,
    type: NOTIFICATION_TYPES.PAYMENT_SUCCESS,
    title: 'Payment successful',
    message: `Payment successful for booking ${booking.bookingNumber}.`,
    bookingId,
    priority: NOTIFICATION_PRIORITY.NORMAL,
    metadata: { bookingNumber: booking.bookingNumber },
    eventKey: getBookingNotificationEventKey(bookingId, 'payment-success'),
  });

  return notification ? [notification] : [];
}

export async function notifyPaymentFailed(bookingId: string, message?: string): Promise<INotification[]> {
  const booking = await Booking.findById(bookingId).populate(['customer']);
  if (!booking) {
    return [];
  }

  const customerId = getObjectId(booking.customer);
  if (!customerId) {
    return [];
  }

  const notification = await createNotification({
    recipientId: customerId,
    recipientRole: USER_ROLES.CUSTOMER,
    type: NOTIFICATION_TYPES.PAYMENT_FAILED,
    title: 'Payment failed',
    message: message || `Payment failed for booking ${booking.bookingNumber}. Please try again.`,
    bookingId,
    priority: NOTIFICATION_PRIORITY.HIGH,
    metadata: { bookingNumber: booking.bookingNumber },
    eventKey: getBookingNotificationEventKey(bookingId, 'payment-failed'),
  });

  return notification ? [notification] : [];
}

export async function notifyPaymentRefunded(bookingId: string): Promise<INotification[]> {
  const booking = await Booking.findById(bookingId).populate(['customer']);
  const refundedPayment = await Payment.exists({
    booking: bookingId,
    status: PAYMENT_STATUS.REFUNDED,
  });
  if (!booking || booking.paymentStatus !== PAYMENT_STATUS.REFUNDED || !refundedPayment) {
    return [];
  }

  const customerId = getObjectId(booking.customer);
  if (!customerId) {
    return [];
  }

  const notification = await createNotification({
    recipientId: customerId,
    recipientRole: USER_ROLES.CUSTOMER,
    type: NOTIFICATION_TYPES.PAYMENT_REFUNDED,
    title: 'Refund processed',
    message: `Refund has been processed for booking ${booking.bookingNumber}.`,
    bookingId,
    priority: NOTIFICATION_PRIORITY.NORMAL,
    metadata: { bookingNumber: booking.bookingNumber },
    eventKey: getBookingNotificationEventKey(bookingId, 'payment-refunded'),
  });

  return notification ? [notification] : [];
}

export async function notifyAppointmentReminder(
  bookingId: string,
  reminderType: AppointmentReminderType,
): Promise<INotification[]> {
  const booking = await Booking.findById(bookingId);
  if (!booking) {
    return [];
  }
  if (!isAppointmentReminderEligible(booking.status, booking.appointmentDate, booking.startTime)) return [];

  const appointmentAt = new Date(booking.appointmentDate);
  const [hours, minutes] = booking.startTime.split(':').map(Number);
  appointmentAt.setHours(hours, minutes, 0, 0);
  const reminderKey = getBookingNotificationEventKey(
    bookingId,
    `reminder-${reminderType}`,
    appointmentAt.toISOString(),
  );
  const recipients = await getBookingRecipients(bookingId);
  return createBulkNotifications(recipients.map(({ recipientId, recipientRole }) => ({
    recipientId,
    recipientRole,
    type: NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
    title: reminderType === 'TODAY' ? 'Appointment today' : 'Upcoming appointment',
    message: reminderType === 'TODAY'
      ? `Your appointment with ${booking.bookingNumber} is today.`
      : `Your appointment with ${booking.bookingNumber} is coming up soon.`,
    bookingId,
    salonId: booking.salon.toString(),
    barberId: booking.barber.toString(),
    priority: NOTIFICATION_PRIORITY.NORMAL,
    metadata: { bookingNumber: booking.bookingNumber, reminderKey, reminderType },
    eventKey: reminderKey,
  })));
}
