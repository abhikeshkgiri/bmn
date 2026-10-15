/**
 * PATCH /api/salons/[id]/status
 * Activate or deactivate a salon
 * Only owner or admin can change status
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { activateSalon, deactivateSalon } from '@/services/salon.service';
import { z } from 'zod';
import { ZodError } from 'zod';
import { revalidateHomeSalons } from '@/lib/home-salon-cache';

const StatusSchema = z.object({
  isActive: z.boolean(),
});

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
    const validatedData = StatusSchema.parse(body);

    const salon = validatedData.isActive
      ? await activateSalon(id, currentUser)
      : await deactivateSalon(id, currentUser);
    revalidateHomeSalons();

    return NextResponse.json(
      {
        success: true,
        data: salon,
        message: `Salon ${validatedData.isActive ? 'activated' : 'deactivated'} successfully`,
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
            message: 'isActive must be a boolean',
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
              message: 'You do not have permission to change salon status',
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
            message: message || 'Failed to update salon status',
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
