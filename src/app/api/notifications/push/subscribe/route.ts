/**
 * POST /api/notifications/push/subscribe
 * Subscribe to push notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { subscribeToPushNotifications } from '@/services/push.service';
import { PushSubscriptionSchema } from '@/validations/notification.schema';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const parsed = PushSubscriptionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid push subscription details' },
        },
        { status: 400 }
      );
    }

    const subscription = await subscribeToPushNotifications(currentUser._id, parsed.data);

    return NextResponse.json(
      {
        success: true,
        data: {
          subscriptionId: subscription._id,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' } },
        { status: 400 },
      );
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid push subscription details' } },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message === 'PUSH_SUBSCRIPTION_OWNERSHIP_CONFLICT') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Subscription is already registered to another account' } },
        { status: 409 },
      );
    }
    console.error('Error subscribing to push notifications.');
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to subscribe' } },
      { status: 500 }
    );
  }
}
