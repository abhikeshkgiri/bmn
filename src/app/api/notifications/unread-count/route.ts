import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUnreadNotificationCount } from '@/services/notification.service';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const unreadCount = await getUnreadNotificationCount(currentUser._id);

    return NextResponse.json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error('Fetch unread notification count error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to load notification count' } },
      { status: 500 }
    );
  }
}
