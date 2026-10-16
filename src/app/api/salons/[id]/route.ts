/**
 * GET /api/salons/[id]
 * Get public salon details by ID or slug.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPublicSalonDetails, updateSalon, softDeleteSalon } from '@/services/salon.service';
import { revalidateHomeSalons } from '@/lib/home-salon-cache';
import { requireAuth } from '@/lib/auth';
import { USER_ROLES } from '@/constants/roles';
import { SalonOwnerUpdateSchema, SalonUpdateSchema } from '@/validations/salon.schema';
import { SalonDetailParamSchema } from '@/validations/salon-discovery.schema';
import { ZodError } from 'zod';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const identifier = SalonDetailParamSchema.parse(id);
    const salon = await getPublicSalonDetails(identifier);

    if (!salon) {
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

    return NextResponse.json(
      {
        success: true,
        data: salon,
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'Invalid salon identifier' } },
        { status: 400 },
      );
    }

    console.error('Public salon detail request failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch salon',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/salons/[id]
 * Update a salon
 * Only owner or admin can update
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
            message: 'Invalid salon ID',
          },
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request
    const validatedData = currentUser.role === USER_ROLES.SALON_OWNER
      ? SalonOwnerUpdateSchema.parse(body)
      : SalonUpdateSchema.parse(body);

    // Update salon
    const salon = await updateSalon(id, validatedData, currentUser);
    revalidateHomeSalons();
    return NextResponse.json(
      {
        success: true,
        data: salon,
        message: 'Salon updated successfully',
      },
      { status: 200 }
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

      // Not found
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

      // Authorization errors
      if (message.includes('SALON_ACCESS_DENIED')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'SALON_ACCESS_DENIED',
              message: 'You do not have permission to update this salon',
            },
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ERROR',
            message: message || 'Failed to update salon',
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
 * DELETE /api/salons/[id]
 * Soft delete a salon (deactivate)
 * Only owner or admin can delete
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
            message: 'Invalid salon ID',
          },
        },
        { status: 400 }
      );
    }

    // Soft delete (deactivate)
    const salon = await softDeleteSalon(id, currentUser);
    revalidateHomeSalons();
    return NextResponse.json(
      {
        success: true,
        data: salon,
        message: 'Salon deactivated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete salon';

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

    if (message.includes('SALON_ACCESS_DENIED')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SALON_ACCESS_DENIED',
            message: 'You do not have permission to delete this salon',
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
          message,
        },
      },
      { status: 500 }
    );
  }
}
