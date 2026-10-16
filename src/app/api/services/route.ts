import { NextRequest, NextResponse } from 'next/server';
import {
  createService,
  listServices,
} from '@/services/service.service';
import { getCurrentUser, requireAuth } from '@/lib/auth';
import { ServiceCreateSchema, ServiceListSchema } from '@/validations/service.schema';
import { ZodError } from 'zod';
import { USER_ROLES } from '@/constants/roles';

/**
 * POST /api/services
 * Create a new service
 * Authorization: SALON_OWNER, ADMIN, SUPER_ADMIN
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const body = await request.json();

    // Validate input
    const validated = ServiceCreateSchema.parse(body);

    // Create service
    const service = await createService(validated, currentUser);

    return NextResponse.json(
      {
        success: true,
        data: service,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : 'Failed to create service';

    // Authorization error
    if (message.includes('ACCESS_DENIED')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SERVICE_ACCESS_DENIED',
            message: message.replace('SERVICE_ACCESS_DENIED: ', ''),
          },
        },
        { status: 403 }
      );
    }

    // Salon not found
    if (message.includes('SALON_NOT_FOUND')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SALON_NOT_FOUND',
            message: 'Salon not found',
          },
        },
        { status: 404 }
      );
    }

    // User inactive
    if (message.includes('USER_INACTIVE')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_INACTIVE',
            message: 'Your account is inactive',
          },
        },
        { status: 403 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ERROR',
          message,
        },
      },
      { status: 400 }
    );
  }
}

/**
 * GET /api/services
 * List services with pagination, filtering, and search
 * Public endpoint (authenticated users can see inactive services if authorized)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const options = ServiceListSchema.parse(Object.fromEntries(searchParams.entries()));
    const currentUser = await getCurrentUser();
    const canManageServices = currentUser?.role === USER_ROLES.SALON_OWNER ||
      currentUser?.role === USER_ROLES.ADMIN ||
      currentUser?.role === USER_ROLES.SUPER_ADMIN;
    if (options.isActive === false && !canManageServices) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Authentication is required to view inactive services.' } },
        { status: 403 }
      );
    }

    // Fetch services
    const { data, pagination } = await listServices({
      ...options,
      page: options.page ?? 1,
      limit: options.limit ?? 10,
    }, currentUser || undefined);

    return NextResponse.json(
      {
        success: true,
        data,
        pagination,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid service query', details: error.issues } },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : 'Failed to fetch services';
    if (message.includes('SERVICE_ACCESS_DENIED')) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'You do not have access to these salon services.' } },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ERROR',
          message,
        },
      },
      { status: 400 }
    );
  }
}
