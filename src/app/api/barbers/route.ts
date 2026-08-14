/**
 * POST /api/barbers - Create barber
 * GET /api/barbers - List barbers
 */

import { NextRequest, NextResponse } from 'next/server';
import { createBarber, listBarbers } from '@/services/barber.service';
import { requireAuth } from '@/lib/auth';
import { BarberCreateSchema, BarberListSchema } from '@/validations/barber.schema';
import { ZodError } from 'zod';

/**
 * POST /api/barbers
 * Create a new barber
 * Authorization: SALON_OWNER, ADMIN, SUPER_ADMIN
 */
export async function POST(request: NextRequest) {
  try {
    const currentUser = await requireAuth();
    const body = await request.json();

    // Validate input
    const validated = BarberCreateSchema.parse(body);

    // Create barber
    const barber = await createBarber(validated, currentUser);

    return NextResponse.json(
      {
        success: true,
        data: barber,
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

    const message = error instanceof Error ? error.message : 'Failed to create barber';

    // Authorization error
    if (message.includes('ACCESS_DENIED')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BARBER_ACCESS_DENIED',
            message: 'You do not have permission to create barbers',
          },
        },
        { status: 403 }
      );
    }

    // Not found errors
    if (message.includes('NOT_FOUND')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: message.split(':')[1]?.trim() || 'Resource not found',
          },
        },
        { status: 404 }
      );
    }

    // Duplicate barber
    if (message.includes('DUPLICATE')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BARBER_DUPLICATE',
            message: 'User is already a barber in this salon',
          },
        },
        { status: 409 }
      );
    }

    // Service validation error
    if (message.includes('SERVICE_INVALID')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SERVICE_INVALID',
            message: 'Some services do not belong to this salon',
          },
        },
        { status: 400 }
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

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: message,
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/barbers
 * List barbers with filtering
 * Public endpoint - optional authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Try to get current user (optional)
    let currentUser = undefined;
    try {
      const { requireAuth: auth } = await import('@/lib/auth');
      currentUser = await auth();
    } catch {
      // User not authenticated, continue with public access
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryData = {
      salonId: searchParams.get('salonId') || undefined,
      search: searchParams.get('search') || undefined,
      specialization: searchParams.get('specialization') || undefined,
      service: searchParams.get('service') || undefined,
      offersHomeService: searchParams.get('offersHomeService') || undefined,
      isActive: searchParams.get('isActive') || undefined,
      isVerified: searchParams.get('isVerified') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10',
      sortBy: searchParams.get('sortBy') || 'createdAt',
    };

    // Validate query parameters
    const validated = BarberListSchema.parse(queryData);

    // Enforce limit max
    if (validated.limit > 50) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Limit cannot exceed 50',
          },
        },
        { status: 400 }
      );
    }

    // List barbers
    const result = await listBarbers(validated, currentUser);

    return NextResponse.json(
      {
        success: true,
        data: result.data,
        pagination: result.pagination,
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
            message: 'Invalid query parameters',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    const message = error instanceof Error ? error.message : 'Failed to list barbers';

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: message,
        },
      },
      { status: 500 }
    );
  }
}
