import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { markNotificationAsRead } from '@/services/notification.service';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const notification = await markNotificationAsRead(id, currentUser);

    return NextResponse.json({
      success: true,
      data: notification,
    });
  } catch (error) {
    const err = error as { code?: string; message?: string };
    const status = err.code === 'NOTIFICATION_NOT_FOUND' ? 404 : err.code === 'FORBIDDEN' ? 403 : 500;

    return NextResponse.json(
      { success: false, error: { code: err.code ?? 'SERVER_ERROR', message: err.message ?? 'Failed to mark notification as read' } },
      { status }
    );
  }
}
