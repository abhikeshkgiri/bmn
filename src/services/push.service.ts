/**
 * Push Notification Service
 * Handles push subscription and notification sending
 */

import { Types } from 'mongoose';
import PushSubscription from '@/models/PushSubscription';
import User from '@/models/User';
import { connectDB } from '@/lib/db';
import webpush from 'web-push';

export interface PushSubscriptionPayload {
  endpoint: string;
  auth: string;
  p256dh: string;
  userAgent?: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any>;
}

/**
 * Subscribe user to push notifications
 */
export async function subscribeToPushNotifications(
  userId: string,
  subscription: PushSubscriptionPayload
): Promise<InstanceType<typeof PushSubscription>> {
  await connectDB();

  // Check if subscription already exists
  const existing = await PushSubscription.findOne({
    endpoint: subscription.endpoint,
    user: new Types.ObjectId(userId),
  });

  const ownedByAnotherUser = await PushSubscription.exists({
    endpoint: subscription.endpoint,
    user: { $ne: new Types.ObjectId(userId) },
  });
  if (ownedByAnotherUser) {
    throw new Error('PUSH_SUBSCRIPTION_OWNERSHIP_CONFLICT');
  }

  if (existing) {
    // Update existing subscription
    existing.auth = subscription.auth;
    existing.p256dh = subscription.p256dh;
    existing.isActive = true;
    existing.userAgent = subscription.userAgent || null;
    await existing.save();
    return existing;
  }

  // Create new subscription
  const pushSub = await PushSubscription.create({
    user: new Types.ObjectId(userId),
    endpoint: subscription.endpoint,
    auth: subscription.auth,
    p256dh: subscription.p256dh,
    userAgent: subscription.userAgent || null,
    isActive: true,
  });

  return pushSub;
}

/**
 * Unsubscribe user from push notifications
 */
export async function unsubscribeFromPushNotifications(
  userId: string,
  endpoint: string
): Promise<void> {
  await connectDB();

  await PushSubscription.findOneAndUpdate(
    {
      user: new Types.ObjectId(userId),
      endpoint,
    },
    {
      isActive: false,
    }
  );
}

/**
 * Get user's push subscriptions
 */
export async function getUserPushSubscriptions(
  userId: string
): Promise<InstanceType<typeof PushSubscription>[]> {
  await connectDB();

  return await PushSubscription.find({
    user: new Types.ObjectId(userId),
    isActive: true,
  });
}

/**
 * Check if user is subscribed to push notifications
 */
export async function isUserSubscribedToPush(userId: string): Promise<boolean> {
  await connectDB();

  const count = await PushSubscription.countDocuments({
    user: new Types.ObjectId(userId),
    isActive: true,
  });

  return count > 0;
}

/**
 * Send push notification to all user's subscriptions when VAPID is configured.
 */
export async function sendPushNotificationToUser(
  userId: string,
  _payload: PushNotificationPayload,
): Promise<number> {
  await connectDB();

  const subscriptions = await getUserPushSubscriptions(userId);

  if (subscriptions.length === 0) {
    return 0;
  }

  const publicKey = process.env.PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.PUSH_VAPID_PRIVATE_KEY;
  const subject = process.env.PUSH_VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    return 0;
  }
  const user = await User.findById(userId).select('notificationPreferences.push');
  if (user?.notificationPreferences?.push === false) return 0;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  let sent = 0;
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { auth: sub.auth, p256dh: sub.p256dh },
        },
        JSON.stringify(_payload),
      );
      await PushSubscription.findByIdAndUpdate(sub._id, { lastNotificationSent: new Date() });
      sent += 1;
    } catch (error) {
      const statusCode = error && typeof error === 'object' && 'statusCode' in error ? error.statusCode : undefined;
      if (statusCode === 404 || statusCode === 410) {
        await removeInvalidPushSubscription(sub.endpoint);
      } else {
        const errorName = error instanceof Error ? error.name : 'UnknownError';
        console.error('Push notification delivery failed', { statusCode, errorName });
      }
    }
  }

  return sent;
}

/**
 * Clean up invalid push subscriptions
 * Called when push service returns 410 Gone
 */
export async function removeInvalidPushSubscription(endpoint: string): Promise<void> {
  await connectDB();

  await PushSubscription.deleteOne({ endpoint });
}

/**
 * Get push notification stats
 */
export async function getPushNotificationStats(): Promise<{
  totalSubscriptions: number;
  activeSubscriptions: number;
  inactiveSubscriptions: number;
}> {
  await connectDB();

  const total = await PushSubscription.countDocuments();
  const active = await PushSubscription.countDocuments({ isActive: true });
  const inactive = total - active;

  return {
    totalSubscriptions: total,
    activeSubscriptions: active,
    inactiveSubscriptions: inactive,
  };
}
