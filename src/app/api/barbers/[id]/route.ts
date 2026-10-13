/**
 * GET /api/barbers/[id] - Get barber
 * PATCH /api/barbers/[id] - Update barber
 * DELETE /api/barbers/[id] - Delete (soft delete) barber
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBarberById, updateBarber, deleteBarber } from '@/services/barber.service';
import { requireAuth } from '@/lib/auth';
import { BarberUpdateSchema } from '@/validations/barber.schema';
import { ZodError } from 'zod';
import type { AuthUser } from '@/types';

/**
 * GET /api/barbers/[id]
 * Get a single barber
 * Public endpoint - optional authentication
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ID format
    if (!/^[a-f\d]{24}$/i.test(id)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid barber ID',
          },
        },
        { status: 400 }
      );
    }

    // Try to get current user (optional)
    let currentUser: AuthUser | undefined;
    try {
      const { requireAuth: auth } = await import('@/lib/auth');
      currentUser = await auth();
    } catch {
      // User not authenticated, continue with public access
    }

    // Get barber
    const barber = await getBarberById(id, currentUser);

    if (!barber) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BARBER_NOT_FOUND',
            message: 'Barber not found',
          },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: barber,
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch barber';

    if (message.includes('NOT_FOUND')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BARBER_NOT_FOUND',
            message: 'Barber not found',
          },
        },
        { status: 404 }
      );
    }

    if (message.includes('ACCESS_DENIED')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BARBER_ACCESS_DENIED',
            message: 'You do not have access to this barber',
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
 * PATCH /api/barbers/[id]
 * Update a barber
 * Authorization: Owner or Admin
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
            message: 'Invalid barber ID',
          },
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate input
    const validated = BarberUpdateSchema.parse(body);

    // Update barber
    const barber = await updateBarber(id, validated, currentUser);

    return NextResponse.json(
      {
        success: true,
        data: barber,
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

    const message = error instanceof Error ? error.message : 'Failed to update barber';

    // Not found
    if (message.includes('NOT_FOUND')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BARBER_NOT_FOUND',
            message: 'Barber not found',
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
            code: 'BARBER_ACCESS_DENIED',
            message: 'You do not have permission to update this barber',
          },
        },
        { status: 403 }
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
 * DELETE /api/barbers/[id]
 * Soft delete a barber
 * Authorization: Owner or Admin
 */
export async function DELETE(
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
            message: 'Invalid barber ID',
          },
        },
        { status: 400 }
      );
    }

    // Soft delete
    const barber = await deleteBarber(id, currentUser);

    return NextResponse.json(
      {
        success: true,
        data: barber,
        message: 'Barber deactivated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete barber';

    // Not found
    if (message.includes('NOT_FOUND')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BARBER_NOT_FOUND',
            message: 'Barber not found',
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
            code: 'BARBER_ACCESS_DENIED',
            message: 'You do not have permission to delete this barber',
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
