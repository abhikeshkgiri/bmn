import { Types } from 'mongoose';
import Notification, { type INotification } from '@/models/Notification';
import Booking from '@/models/Booking';
import Salon from '@/models/Salon';
import Barber from '@/models/Barber';
import { connectDB } from '@/lib/db';
import type { AuthUser } from '@/types';
import { USER_ROLES } from '@/constants/roles';
import { NOTIFICATION_PRIORITY, NOTIFICATION_TYPES, type NotificationType } from '@/constants/notifications';

export interface NotificationCreateInput {
  recipientId: string;
  recipientRole: (typeof USER_ROLES)[keyof typeof USER_ROLES];
  type: NotificationType;
  title: string;
  message: string;
  bookingId?: string;
  salonId?: string;
  barberId?: string;
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

export async function createNotification(input: NotificationCreateInput): Promise<INotification> {
  await connectDB();

  const notification = await Notification.create({
    recipientId: new Types.ObjectId(input.recipientId),
    recipientRole: input.recipientRole,
    type: input.type,
    title: input.title,
    message: input.message,
    bookingId: input.bookingId ? new Types.ObjectId(input.bookingId) : undefined,
    salonId: input.salonId ? new Types.ObjectId(input.salonId) : undefined,
    barberId: input.barberId ? new Types.ObjectId(input.barberId) : undefined,
    priority: input.priority ?? NOTIFICATION_PRIORITY.NORMAL,
    channel: input.channel ?? 'IN_APP',
    metadata: input.metadata ?? {},
    isRead: false,
  });

  return notification;
}

export async function createBulkNotifications(inputs: NotificationCreateInput[]): Promise<INotification[]> {
  if (inputs.length === 0) {
    return [];
  }

  const created = await Promise.all(inputs.map((input) => createNotification(input)));
  return created;
}

export async function getUserNotifications(
  userId: string,
  options: NotificationQueryOptions = {}
): Promise<{ notifications: INotification[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  await connectDB();

  const page = options.page && options.page > 0 ? options.page : 1;
  const limit = options.limit && options.limit > 0 ? Math.min(options.limit, 50) : 20;
  const query: Record<string, unknown> = { recipientId: new Types.ObjectId(userId) };

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
  return Notification.countDocuments({ recipientId: new Types.ObjectId(userId), isRead: false });
}

export async function markNotificationAsRead(notificationId: string, currentUser: AuthUser): Promise<INotification> {
  await connectDB();

  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw { code: 'NOTIFICATION_NOT_FOUND', message: 'Notification not found' };
  }

  if (notification.recipientId.toString() !== currentUser._id) {
    throw { code: 'FORBIDDEN', message: 'You do not have access to this notification' };
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  return notification;
}

export async function markAllNotificationsAsRead(userId: string): Promise<number> {
  await connectDB();

  const result = await Notification.updateMany(
    { recipientId: new Types.ObjectId(userId), isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  return result.modifiedCount;
}

export async function deleteNotification(notificationId: string, currentUser: AuthUser): Promise<boolean> {
  await connectDB();

  const notification = await Notification.findById(notificationId);
  if (!notification) {
    throw { code: 'NOTIFICATION_NOT_FOUND', message: 'Notification not found' };
  }

  if (notification.recipientId.toString() !== currentUser._id) {
    throw { code: 'FORBIDDEN', message: 'You do not have access to this notification' };
  }

  const result = await Notification.deleteOne({ _id: notificationId });
  return result.deletedCount > 0;
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

async function getBookingRecipients(bookingId: string): Promise<Array<{ recipientId: string; recipientRole: (typeof USER_ROLES)[keyof typeof USER_ROLES] }>> {
  const booking = await Booking.findById(bookingId).populate(['customer', 'salon', 'barber']);
  if (!booking) {
    return [];
  }

  const recipients = new Map<string, (typeof USER_ROLES)[keyof typeof USER_ROLES]>();

  const customerId = getObjectId(booking.customer);
  if (customerId) {
    recipients.set(customerId, USER_ROLES.CUSTOMER);
  }

  const salon = await Salon.findById(booking.salon).select('owner name');
  const salonOwnerId = salon ? getObjectId(salon.owner) : null;
  if (salonOwnerId) {
    recipients.set(salonOwnerId, USER_ROLES.SALON_OWNER);
  }

  const barber = await Barber.findById(booking.barber).select('user name');
  const barberUserId = barber ? getObjectId(barber.user) : null;
  if (barberUserId) {
    recipients.set(barberUserId, USER_ROLES.BARBER);
  }

  return Array.from(recipients.entries()).map(([recipientId, recipientRole]) => ({ recipientId, recipientRole }));
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
    type: recipientRole === USER_ROLES.CUSTOMER ? NOTIFICATION_TYPES.BOOKING_CREATED : recipientRole === USER_ROLES.SALON_OWNER ? NOTIFICATION_TYPES.SALON_BOOKING_RECEIVED : NOTIFICATION_TYPES.BARBER_BOOKING_ASSIGNED,
    title: recipientRole === USER_ROLES.CUSTOMER ? 'Booking request created' : recipientRole === USER_ROLES.SALON_OWNER ? 'New booking received' : 'New appointment assigned',
    message: recipientRole === USER_ROLES.CUSTOMER
      ? `Your booking request for ${serviceName} at ${salonName} has been created.`
      : recipientRole === USER_ROLES.SALON_OWNER
        ? `New booking received from ${customerName} for ${serviceName}.`
        : `New appointment assigned to you at ${salonName} for ${serviceName}.`,
    bookingId,
    salonId: booking.salon ? booking.salon.toString() : undefined,
    barberId: booking.barber ? booking.barber.toString() : undefined,
    priority: NOTIFICATION_PRIORITY.NORMAL,
    metadata: { bookingNumber: booking.bookingNumber },
  }));

  return createBulkNotifications(inputs);
}

export async function notifyBookingConfirmed(bookingId: string): Promise<INotification[]> {
  const booking = await Booking.findById(bookingId).populate(['customer', 'salon', 'barber', 'service']);
  if (!booking) {
    return [];
  }

  const customerId = getObjectId(booking.customer);
  const salonId = booking.salon ? booking.salon.toString() : undefined;
  const barberId = booking.barber ? booking.barber.toString() : undefined;

  const notifications: Array<Promise<INotification>> = [];

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
      }));
    }
  }

  if (salonId) {
    const salonRecord = await Salon.findById(salonId).select('owner');
    const salonOwnerId = salonRecord ? getObjectId(salonRecord.owner) : null;
    if (salonOwnerId) {
      notifications.push(createNotification({
        recipientId: salonOwnerId,
        recipientRole: USER_ROLES.SALON_OWNER,
        type: NOTIFICATION_TYPES.SALON_BOOKING_RECEIVED,
        title: 'Booking confirmed',
        message: `Booking ${booking.bookingNumber} has been confirmed.`,
        bookingId,
        salonId,
        barberId,
        priority: NOTIFICATION_PRIORITY.NORMAL,
        metadata: { bookingNumber: booking.bookingNumber },
      }));
    }
  }

  return Promise.all(notifications);
}

export async function notifyBookingCancelled(bookingId: string): Promise<INotification[]> {
  const booking = await Booking.findById(bookingId).populate(['customer', 'salon', 'barber']);
  if (!booking) {
    return [];
  }

  const customerId = getObjectId(booking.customer);
  const salonId = booking.salon ? booking.salon.toString() : undefined;
  const barberId = booking.barber ? booking.barber.toString() : undefined;

  const notifications: Array<Promise<INotification>> = [];

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
    }));
  }

  if (salonId) {
    const salonRecord = await Salon.findById(salonId).select('owner');
    const salonOwnerId = salonRecord ? getObjectId(salonRecord.owner) : null;
    if (salonOwnerId) {
      notifications.push(createNotification({
        recipientId: salonOwnerId,
        recipientRole: USER_ROLES.SALON_OWNER,
        type: NOTIFICATION_TYPES.BOOKING_CANCELLED,
        title: 'Booking cancelled',
        message: `Booking ${booking.bookingNumber} was cancelled.`,
        bookingId,
        salonId,
        barberId,
        priority: NOTIFICATION_PRIORITY.HIGH,
        metadata: { bookingNumber: booking.bookingNumber },
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
      }));
    }
  }

  return Promise.all(notifications);
}

export async function notifyBookingRescheduled(bookingId: string, newAppointmentDate: Date, newStartTime: string): Promise<INotification[]> {
  const booking = await Booking.findById(bookingId).populate(['customer', 'salon', 'barber']);
  if (!booking) {
    return [];
  }

  const customerId = getObjectId(booking.customer);
  const salonId = booking.salon ? booking.salon.toString() : undefined;
  const barberId = booking.barber ? booking.barber.toString() : undefined;
  const formattedDate = newAppointmentDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const notifications: Array<Promise<INotification>> = [];

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
    }));
  }

  if (salonId) {
    const salonRecord = await Salon.findById(salonId).select('owner');
    const salonOwnerId = salonRecord ? getObjectId(salonRecord.owner) : null;
    if (salonOwnerId) {
      notifications.push(createNotification({
        recipientId: salonOwnerId,
        recipientRole: USER_ROLES.SALON_OWNER,
        type: NOTIFICATION_TYPES.BOOKING_RESCHEDULED,
        title: 'Booking rescheduled',
        message: `Booking ${booking.bookingNumber} has been rescheduled.`,
        bookingId,
        salonId,
        barberId,
        priority: NOTIFICATION_PRIORITY.NORMAL,
        metadata: { bookingNumber: booking.bookingNumber },
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
      }));
    }
  }

  return Promise.all(notifications);
}

export async function notifyPaymentSuccess(bookingId: string): Promise<INotification[]> {
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
    type: NOTIFICATION_TYPES.PAYMENT_SUCCESS,
    title: 'Payment successful',
    message: `Payment successful for booking ${booking.bookingNumber}.`,
    bookingId,
    priority: NOTIFICATION_PRIORITY.NORMAL,
    metadata: { bookingNumber: booking.bookingNumber },
  });

  return [notification];
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
  });

  return [notification];
}

export async function notifyPaymentRefunded(bookingId: string): Promise<INotification[]> {
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
    type: NOTIFICATION_TYPES.PAYMENT_REFUNDED,
    title: 'Refund processed',
    message: `Refund has been processed for booking ${booking.bookingNumber}.`,
    bookingId,
    priority: NOTIFICATION_PRIORITY.NORMAL,
    metadata: { bookingNumber: booking.bookingNumber },
  });

  return [notification];
}

export async function notifyAppointmentReminder(bookingId: string, reminderType: '24H' | '2H' | 'TODAY'): Promise<INotification[]> {
  const booking = await Booking.findById(bookingId).populate(['customer', 'salon', 'barber']);
  if (!booking) {
    return [];
  }

  const reminderKey = `${bookingId}:${reminderType}`;
  const recipients = new Map<string, (typeof USER_ROLES)[keyof typeof USER_ROLES]>();

  const customerId = getObjectId(booking.customer);
  if (customerId) {
    recipients.set(customerId, USER_ROLES.CUSTOMER);
  }

  const salonRecord = await Salon.findById(booking.salon).select('owner');
  const salonOwnerId = salonRecord ? getObjectId(salonRecord.owner) : null;
  if (salonOwnerId) {
    recipients.set(salonOwnerId, USER_ROLES.SALON_OWNER);
  }

  const barberRecord = await Barber.findById(booking.barber).select('user');
  const barberUserId = barberRecord ? getObjectId(barberRecord.user) : null;
  if (barberUserId) {
    recipients.set(barberUserId, USER_ROLES.BARBER);
  }

  const notifications = Array.from(recipients.entries()).map(async ([recipientId, recipientRole]) => {
    const existing = await Notification.findOne({
      recipientId: new Types.ObjectId(recipientId),
      type: NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
      bookingId: new Types.ObjectId(bookingId),
      'metadata.reminderKey': reminderKey,
    });

    if (existing) {
      return null;
    }

    return createNotification({
      recipientId,
      recipientRole,
      type: NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
      title: reminderType === 'TODAY' ? 'Appointment today' : 'Upcoming appointment',
      message: reminderType === 'TODAY'
        ? `Your appointment with ${booking.bookingNumber} is today.`
        : `Your appointment with ${booking.bookingNumber} is coming up soon.`,
      bookingId,
      salonId: booking.salon ? booking.salon.toString() : undefined,
      barberId: booking.barber ? booking.barber.toString() : undefined,
      priority: NOTIFICATION_PRIORITY.NORMAL,
      metadata: { bookingNumber: booking.bookingNumber, reminderKey, reminderType },
    });
  });

  const resolved = await Promise.all(notifications);
  return resolved.filter((notification): notification is INotification => notification !== null);
}
