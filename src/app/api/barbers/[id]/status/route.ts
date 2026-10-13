/**
 * PATCH /api/barbers/[id]/status
 * Toggle barber status (isActive)
 */

import { NextRequest, NextResponse } from 'next/server';
import { updateBarberStatus } from '@/services/barber.service';
import { requireAuth } from '@/lib/auth';
import { BarberStatusSchema } from '@/validations/barber.schema';
import { ZodError } from 'zod';

/**
 * PATCH /api/barbers/[id]/status
 * Toggle barber status
 * Authorization: SALON_OWNER, ADMIN, SUPER_ADMIN
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
    const validated = BarberStatusSchema.parse(body);

    // Update status
    const barber = await updateBarberStatus(id, validated.isActive, currentUser);

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

    const message = error instanceof Error ? error.message : 'Failed to update barber status';

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
            message: 'You do not have permission to update this barber\'s status',
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
