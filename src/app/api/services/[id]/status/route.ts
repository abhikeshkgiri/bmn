import { NextRequest, NextResponse } from 'next/server';
import { updateServiceStatus } from '@/services/service.service';
import { requireAuth } from '@/lib/auth';
import { ServiceStatusSchema } from '@/validations/service.schema';
import { ZodError } from 'zod';

/**
 * PATCH /api/services/[id]/status
 * Update service status (activate/deactivate)
 * Authorization: SALON_OWNER (own salon only), ADMIN, SUPER_ADMIN
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth();
    const { id } = await params;

    // Validate ID format
    if (!/^[a-f\d]{24}$/i.test(id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid service ID',
          },
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate input
    const validated = ServiceStatusSchema.parse(body);

    // Update status
    const service = await updateServiceStatus(id, validated.isActive, currentUser);

    return NextResponse.json(
      {
        success: true,
        data: service,
        message: `Service ${validated.isActive ? 'activated' : 'deactivated'} successfully`,
      },
      { status: 200 }
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

    const message = error instanceof Error ? error.message : 'Failed to update service status';

    // Service not found
    if (message.includes('SERVICE_NOT_FOUND')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SERVICE_NOT_FOUND',
            message: 'Service not found',
          },
        },
        { status: 404 }
      );
    }

    // Salon not found
    if (message.includes('SALON_NOT_FOUND')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SALON_NOT_FOUND',
            message: 'Associated salon not found',
          },
        },
        { status: 404 }
      );
    }

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

    // Generic error
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ERROR',
          message,
        },
      },
      { status: 500 }
    );
  }
}
