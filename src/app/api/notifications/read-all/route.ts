import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { markAllNotificationsAsRead } from '@/services/notification.service';

export async function POST() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const updated = await markAllNotificationsAsRead(currentUser._id);

    return NextResponse.json({
      success: true,
      updated,
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update notifications' } },
      { status: 500 }
    );
  }
}
