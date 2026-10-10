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
import { getSingleQueryParam, SalonDiscoveryQuerySchema } from '@/validations/salon-discovery.schema';

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

      if (message.startsWith('CITY_NOT_SUPPORTED:')) {
        return NextResponse.json(
          { success: false, error: { code: 'CITY_NOT_SUPPORTED', message: message.split(':').slice(1).join(':').trim() } },
          { status: 422 }
        );
      }

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

      if (message === 'SALON_ALREADY_EXISTS') {
        return NextResponse.json(
          { success: false, error: { code: 'SALON_ALREADY_EXISTS', message: 'A salon is already associated with this owner.' } },
          { status: 409 }
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
    const params = SalonDiscoveryQuerySchema.parse({
      page: getSingleQueryParam(searchParams, 'page'),
      limit: getSingleQueryParam(searchParams, 'limit'),
      city: getSingleQueryParam(searchParams, 'city'),
      state: getSingleQueryParam(searchParams, 'state'),
      area: getSingleQueryParam(searchParams, 'area'),
      search: getSingleQueryParam(searchParams, 'search'),
      serviceSearch: getSingleQueryParam(searchParams, 'serviceSearch'),
      category: getSingleQueryParam(searchParams, 'category'),
      slug: getSingleQueryParam(searchParams, 'slug'),
      sortBy: getSingleQueryParam(searchParams, 'sortBy'),
    });

    const result = await listSalons({
      ...params,
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
  } catch (error) {
    if (error instanceof ZodError || error instanceof Error && error.message.startsWith('Duplicate query parameter:')) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'Invalid salon search parameters' } },
        { status: 400 }
      );
    }
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    console.error('Salon discovery request failed:', errorName);
    if (errorName === 'MongooseServerSelectionError' || errorName === 'MongoNetworkError') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'DATABASE_UNAVAILABLE',
            message: 'Salon listings are temporarily unavailable because the database cannot be reached. Please try again later.',
          },
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Unable to load salon listings right now. Please try again later.',
        },
      },
      { status: 500 }
    );
  }
}
