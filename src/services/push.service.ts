/**
 * Push Notification Service
 * Handles push subscription and notification sending
 */

import { Types } from 'mongoose';
import PushSubscription from '@/models/PushSubscription';
import { connectDB } from '@/lib/db';

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
  const existing = await PushSubscription.findOne({ endpoint: subscription.endpoint });

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
 * Send push notification to all user's subscriptions
 * Note: Full web push implementation would require web-push library
 * This is a placeholder for the API structure
 */
export async function sendPushNotificationToUser(
  userId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _payload: PushNotificationPayload,
): Promise<number> {
  await connectDB();

  const subscriptions = await getUserPushSubscriptions(userId);

  if (subscriptions.length === 0) {
    return 0;
  }

  // In production, use web-push library to send actual push notifications
  // For now, just mark as sent
  const sendPromises = subscriptions.map((sub) =>
    PushSubscription.findByIdAndUpdate(sub._id, { lastNotificationSent: new Date() })
  );

  await Promise.all(sendPromises);

  return subscriptions.length;
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
