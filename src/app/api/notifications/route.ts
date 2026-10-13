import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getUserNotifications } from '@/services/notification.service';
import { NotificationQuerySchema } from '@/validations/notification.schema';
import { USER_ROLES } from '@/constants/roles';

export async function GET(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    const searchParams = new URL(request.url).searchParams;
    const query = NotificationQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
    if (!query.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid notification query' } },
        { status: 400 },
      );
    }

    const result = await getUserNotifications(currentUser._id, {
      page: query.data.page,
      limit: query.data.limit,
      unread: query.data.unread === 'true',
      type: query.data.type,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        notifications: result.notifications.map((notification) => ({
          _id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          bookingId: notification.bookingId ?? null,
          bookingHref: notification.bookingId
            ? currentUser.role === USER_ROLES.CUSTOMER
              ? `/booking/${notification.bookingId.toString()}`
              : currentUser.role === USER_ROLES.BARBER
                ? '/barber/bookings'
                : currentUser.role === USER_ROLES.SALON_OWNER || currentUser.role === USER_ROLES.SALON_STAFF
                  ? '/salon/bookings'
                  : null
            : null,
          salonId: notification.salonId ?? null,
          barberId: notification.barberId ?? null,
          priority: notification.priority,
          isRead: notification.isRead,
          readAt: notification.readAt ?? null,
          createdAt: notification.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Fetch notifications error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to load notifications' } },
      { status: 500 }
    );
  }
}
