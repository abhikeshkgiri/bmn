import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { USER_ROLES } from '@/constants/roles';
import Salon from '@/models/Salon';
import { createSalon } from '@/services/salon.service';
import { SalonCreateSchema } from '@/validations/salon.schema';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  }
  if (user.role !== USER_ROLES.SALON_OWNER) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Salon owner access required' } }, { status: 403 });
  }

  try {
    const salon = await Salon.findOne({ owner: user._id })
      .select('name slug description logo coverImage address contact openingHours location isActive isVerified approvalStatus rejectionReason approvalUpdatedAt services')
      .lean();
    return NextResponse.json({ success: true, data: { salon } });
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    console.error('Salon onboarding lookup failed:', errorName);
    const unavailable = errorName === 'MongooseServerSelectionError' || errorName === 'MongoNetworkError';
    return NextResponse.json(
      { success: false, error: { code: unavailable ? 'DATABASE_UNAVAILABLE' : 'SERVER_ERROR', message: unavailable ? 'The database cannot be reached. Salon onboarding is temporarily unavailable.' : 'Failed to load salon onboarding.' } },
      { status: unavailable ? 503 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  }
  if (user.role !== USER_ROLES.SALON_OWNER) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Salon owner access required' } }, { status: 403 });
  }

  try {
    const input = SalonCreateSchema.parse(await request.json());
    const salon = await createSalon(input, user);
    return NextResponse.json({ success: true, data: salon }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid salon details', details: error.issues } }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Failed to create salon';
    if (message.startsWith('CITY_NOT_SUPPORTED:')) {
      return NextResponse.json({ success: false, error: { code: 'CITY_NOT_SUPPORTED', message: message.split(':').slice(1).join(':').trim() } }, { status: 422 });
    }
    if (message === 'SALON_ALREADY_EXISTS') {
      return NextResponse.json({ success: false, error: { code: message, message: 'A salon is already associated with this owner.' } }, { status: 409 });
    }
    if (message.includes('SALON_ACCESS_DENIED')) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Salon owner access required' } }, { status: 403 });
    }
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    console.error('Salon onboarding create failed:', errorName);
    const unavailable = errorName === 'MongooseServerSelectionError' || errorName === 'MongoNetworkError';
    return NextResponse.json(
      { success: false, error: { code: unavailable ? 'DATABASE_UNAVAILABLE' : 'SALON_CREATE_FAILED', message: unavailable ? 'The database cannot be reached. Salon creation is temporarily unavailable.' : 'Failed to submit salon details.' } },
      { status: unavailable ? 503 : 400 }
    );
  }
}
