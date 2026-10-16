/**
 * POST /api/notifications/push/unsubscribe
 * Unsubscribe from push notifications
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { unsubscribeFromPushNotifications } from '@/services/push.service';
import { PushUnsubscribeSchema } from '@/validations/notification.schema';

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const parsed = PushUnsubscribeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Endpoint is required' },
        },
        { status: 400 }
      );
    }

    await unsubscribeFromPushNotifications(currentUser._id, parsed.data.endpoint);

    return NextResponse.json(
      { success: true, message: 'Unsubscribed successfully' },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' } },
        { status: 400 },
      );
    }
    console.error('Error unsubscribing from push notifications:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to unsubscribe' } },
      { status: 500 }
    );
  }
}
