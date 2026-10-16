import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { USER_ROLES } from '@/constants/roles';
import Barber from '@/models/Barber';
import { updateBarber } from '@/services/barber.service';
import { BarberUpdateSchema } from '@/validations/barber.schema';

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    if (currentUser.role !== USER_ROLES.BARBER) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const barber = await Barber.findOne({ user: currentUser._id }).lean();
    if (!barber) {
      return NextResponse.json(
        { success: false, error: { code: 'BARBER_NOT_FOUND', message: 'Barber profile not found for this user' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: barber }, { status: 200 });
  } catch (error) {
    console.error('Barber profile fetch error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to load barber profile' } },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    if (currentUser.role !== USER_ROLES.BARBER) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = BarberUpdateSchema.parse(body);

    const barber = await Barber.findOne({ user: currentUser._id });
    if (!barber) {
      return NextResponse.json(
        { success: false, error: { code: 'BARBER_NOT_FOUND', message: 'Barber profile not found for this user' } },
        { status: 404 }
      );
    }

    const updatedBarber = await updateBarber(barber._id.toString(), validated, currentUser);
    return NextResponse.json({ success: true, data: updatedBarber, message: 'Barber profile updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Barber profile update error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'Invalid barber profile data', details: error.issues } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Failed to update barber profile' } },
      { status: 400 }
    );
  }
}
