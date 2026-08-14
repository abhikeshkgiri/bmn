import { NextRequest, NextResponse } from 'next/server';
import { getServiceById, updateService, deleteService } from '@/services/service.service';
import { requireAuth } from '@/lib/auth';
import { ServiceUpdateSchema } from '@/validations/service.schema';
import { ZodError } from 'zod';
import type { AuthUser } from '@/types';

/**
 * GET /api/services/[id]
 * Get a single service by ID
 * Public users see only active services
 * Authorized users can see inactive services they have access to
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ID format
    if (!id || id.length !== 24) {
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

    // Try to get current user (optional for public access)
    let currentUser: AuthUser | undefined;
    try {
      const { requireAuth: auth } = await import('@/lib/auth');
      currentUser = await auth();
    } catch {
      // User not authenticated, continue with public access
    }

    // Get service
    const service = await getServiceById(id, currentUser);

    if (!service) {
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

    return NextResponse.json(
      {
        success: true,
        data: service,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch service';

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

/**
 * PATCH /api/services/[id]
 * Update a service
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
    if (!id || id.length !== 24) {
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
    const validated = ServiceUpdateSchema.parse(body);

    // Update service
    const service = await updateService(id, validated, currentUser);

    return NextResponse.json(
      {
        success: true,
        data: service,
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

    const message = error instanceof Error ? error.message : 'Failed to update service';

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
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/services/[id]
 * Soft delete a service (set isActive to false)
 * Authorization: SALON_OWNER (own salon only), ADMIN, SUPER_ADMIN
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth();
    const { id } = await params;

    // Validate ID format
    if (!id || id.length !== 24) {
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

    // Delete service
    const service = await deleteService(id, currentUser);

    return NextResponse.json(
      {
        success: true,
        data: service,
        message: 'Service deactivated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete service';

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
