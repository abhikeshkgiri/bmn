/**
 * GET /api/salons/[id]
 * Get a single salon by ID
 * Public endpoint - shows active salons
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSalonById, updateSalon, softDeleteSalon } from '@/services/salon.service';
import { requireAuth } from '@/lib/auth';
import { SalonUpdateSchema } from '@/validations/salon.schema';
import { ZodError } from 'zod';

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
            message: 'Invalid salon ID',
          },
        },
        { status: 400 }
      );
    }

    const salon = await getSalonById(id);

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

    // Only show active salons publicly
    if (!salon.isActive) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SALON_INACTIVE',
            message: 'This salon is currently unavailable',
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
    const validatedData = SalonUpdateSchema.parse(body);

    // Update salon
    const salon = await updateSalon(id, validatedData, currentUser);

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

    return NextResponse.json(
      {
        success: true,
        data: salon,
        message: 'Salon deactivated successfully',
      },
      { status: 200 }
    );
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
