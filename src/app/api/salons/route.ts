/**
 * POST /api/salons
 * Create a new salon
 * Only SALON_OWNER, ADMIN, SUPER_ADMIN can create
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { createSalon, listSalons } from '@/services/salon.service';
import { SalonCreateSchema } from '@/validations/salon.schema';
import { ZodError } from 'zod';

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const currentUser = await requireAuth();

    const body = await request.json();

    // Validate request
    const validatedData = SalonCreateSchema.parse(body);

    // Create salon
    const salon = await createSalon(validatedData, currentUser);

    return NextResponse.json(
      {
        success: true,
        data: salon,
        message: 'Salon created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid salon data',
            details: error.issues,
          },
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      const message = error.message;

      // Authorization errors
      if (message.includes('SALON_ACCESS_DENIED')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'SALON_ACCESS_DENIED',
              message: 'You do not have permission to create salons',
            },
          },
          { status: 403 }
        );
      }

      // User not found or inactive
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

      // Owner validation
      if (message.includes('OWNER_NOT_FOUND') || message.includes('INVALID_OWNER_ROLE')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_OWNER',
              message: message,
            },
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ERROR',
            message: message || 'Failed to create salon',
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/salons
 * List salons with pagination and filtering
 * Public endpoint - no authentication required
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const city = searchParams.get('city') || undefined;
    const state = searchParams.get('state') || undefined;
    const isVerified = searchParams.get('isVerified') ? searchParams.get('isVerified') === 'true' : undefined;
    const search = searchParams.get('search') || undefined;
    const sortBy = searchParams.get('sortBy') || 'newest';

    // Validate page and limit
    if (page < 1 || !Number.isInteger(page)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Page must be a positive integer',
          },
        },
        { status: 400 }
      );
    }

    if (limit < 1 || limit > 50 || !Number.isInteger(limit)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Limit must be between 1 and 50',
          },
        },
        { status: 400 }
      );
    }

    const result = await listSalons({
      page,
      limit,
      city,
      state,
      isVerified,
      search,
      sortBy,
      isActive: true, // Public endpoint only shows active salons
    });

    return NextResponse.json(
      {
        success: true,
        data: result.salons,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit),
        },
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch salons',
        },
      },
      { status: 500 }
    );
  }
}
