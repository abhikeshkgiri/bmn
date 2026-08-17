/**
 * POST /api/notifications/push/subscribe
 * Subscribe to push notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { subscribeToPushNotifications } from '@/services/push.service';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { endpoint, auth, p256dh, userAgent } = body;

    if (!endpoint || !auth || !p256dh) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Missing subscription details' },
        },
        { status: 400 }
      );
    }

    const subscription = await subscribeToPushNotifications(currentUser._id, {
      endpoint,
      auth,
      p256dh,
      userAgent: userAgent || navigator?.userAgent,
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          subscriptionId: subscription._id,
          endpoint: subscription.endpoint,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to subscribe' } },
      { status: 500 }
    );
  }
}
