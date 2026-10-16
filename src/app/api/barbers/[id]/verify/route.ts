/**
 * PATCH /api/barbers/[id]/verify
 * Verify barber (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyBarber } from '@/services/barber.service';
import { requireAuth } from '@/lib/auth';
import { BarberVerifySchema } from '@/validations/barber.schema';
import { ZodError } from 'zod';

/**
 * PATCH /api/barbers/[id]/verify
 * Verify barber
 * Authorization: ADMIN, SUPER_ADMIN only
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
            message: 'Invalid barber ID',
          },
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate input
    const validated = BarberVerifySchema.parse(body);

    // Verify barber
    const barber = await verifyBarber(id, validated.isVerified, currentUser);

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

    const message = error instanceof Error ? error.message : 'Failed to verify barber';

    // Authorization error
    if (message.includes('VERIFICATION_DENIED')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'BARBER_VERIFICATION_DENIED',
            message: 'Only admins can verify barbers',
          },
        },
        { status: 403 }
      );
    }

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
