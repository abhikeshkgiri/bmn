import { z } from 'zod';
import { NOTIFICATION_TYPES, type NotificationType } from '@/constants/notifications';

const mongoIdSchema = z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid MongoDB ID');
const notificationTypes = Object.values(NOTIFICATION_TYPES) as [NotificationType, ...NotificationType[]];

export const NotificationIdSchema = mongoIdSchema;

export const NotificationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  unread: z.enum(['true', 'false']).optional(),
  type: z.enum(notificationTypes).optional(),
}).strict();

export const PushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2048).refine((value) => {
    try {
      return new URL(value).protocol === 'https:';
    } catch {
      return false;
    }
  }, 'Push endpoint must use HTTPS'),
  auth: z.string().regex(/^[A-Za-z0-9_-]{16,128}={0,2}$/),
  p256dh: z.string().regex(/^[A-Za-z0-9_-]{40,128}={0,2}$/),
  userAgent: z.string().max(500).optional(),
}).strict();

export const PushUnsubscribeSchema = z.object({
  endpoint: PushSubscriptionSchema.shape.endpoint,
}).strict();
