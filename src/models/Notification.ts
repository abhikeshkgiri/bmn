import mongoose, { Schema, Document, Types } from 'mongoose';
import { USER_ROLES, type UserRole } from '@/constants/roles';
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PRIORITY,
  NOTIFICATION_TYPES,
  type NotificationChannel,
  type NotificationPriority,
  type NotificationType,
} from '@/constants/notifications';

interface INotification extends Document {
  _id: Types.ObjectId;
  recipientId: Types.ObjectId;
  recipientRole: UserRole;
  type: NotificationType;
  title: string;
  message: string;
  bookingId?: Types.ObjectId;
  salonId?: Types.ObjectId;
  barberId?: Types.ObjectId;
  priority?: NotificationPriority;
  channel?: NotificationChannel;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientRole: {
      type: String,
      enum: Object.values(USER_ROLES),
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(NOTIFICATION_TYPES),
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    bookingId: {
      type: Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
      index: true,
    },
    salonId: {
      type: Schema.Types.ObjectId,
      ref: 'Salon',
      default: null,
      index: true,
    },
    barberId: {
      type: Schema.Types.ObjectId,
      ref: 'Barber',
      default: null,
      index: true,
    },
    priority: {
      type: String,
      enum: Object.values(NOTIFICATION_PRIORITY),
      default: NOTIFICATION_PRIORITY.NORMAL,
      index: true,
    },
    channel: {
      type: String,
      enum: Object.values(NOTIFICATION_CHANNELS),
      default: NOTIFICATION_CHANNELS.IN_APP,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientId: 1, createdAt: -1 });
NotificationSchema.index({ recipientId: 1, isRead: 1 });
NotificationSchema.index({ recipientId: 1, type: 1 });

const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export type { INotification };
export default Notification;
