/**
 * PATCH /api/salons/[id]/verify
 * Verify or unverify a salon
 * Only ADMIN/SUPER_ADMIN can verify
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { verifySalon, unverifySalon } from '@/services/salon.service';
import { SalonVerificationSchema } from '@/validations/admin-salon.schema';
import { ZodError } from 'zod';

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
            message: 'Invalid salon ID',
          },
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = SalonVerificationSchema.parse(body);

    const salon = validatedData.isVerified
      ? await verifySalon(id, currentUser)
      : await unverifySalon(id, currentUser);

    return NextResponse.json(
      {
        success: true,
        data: salon,
        message: `Salon ${validatedData.isVerified ? 'verified' : 'unverified'} successfully`,
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
            message: 'isVerified must be a boolean',
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

      if (message.startsWith('SALON_APPROVAL_CONFLICT:')) {
        return NextResponse.json(
          { success: false, error: { code: 'SALON_APPROVAL_CONFLICT', message: 'Salon status changed while it was being reviewed. Reload and try again.' } },
          { status: 409 }
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

      if (message.includes('SALON_VERIFICATION_DENIED')) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'SALON_VERIFICATION_DENIED',
              message: 'Only admins can verify salons',
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
            message: message || 'Failed to update salon verification',
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
