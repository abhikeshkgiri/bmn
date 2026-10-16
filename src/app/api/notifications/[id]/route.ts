import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { deleteNotification } from '@/services/notification.service';
import { NotificationIdSchema } from '@/validations/notification.schema';

export async function DELETE(
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
    if (!NotificationIdSchema.safeParse(id).success) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_ID', message: 'Notification ID is invalid' } },
        { status: 400 },
      );
    }
    const deleted = await deleteNotification(id, currentUser);

    return NextResponse.json({
      success: true,
      deleted,
    });
  } catch (error) {
    const err = error as { code?: string; message?: string };
    const status = err.code === 'NOTIFICATION_NOT_FOUND' ? 404 : err.code === 'FORBIDDEN' ? 403 : 500;

    return NextResponse.json(
      { success: false, error: { code: err.code ?? 'SERVER_ERROR', message: err.message ?? 'Failed to delete notification' } },
      { status }
    );
  }
}
