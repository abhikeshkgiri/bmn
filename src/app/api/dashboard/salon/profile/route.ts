import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { USER_ROLES, type UserRole } from '@/constants/roles';
import Salon, { type ISalon } from '@/models/Salon';
import { updateSalon } from '@/services/salon.service';
import { SalonOwnerUpdateSchema, SalonUpdateSchema } from '@/validations/salon.schema';

const salonDashboardRoles: UserRole[] = [
  USER_ROLES.SALON_OWNER,
  USER_ROLES.ADMIN,
  USER_ROLES.SUPER_ADMIN,
];

function serializeSalonProfile(salon: ISalon) {
  return {
    _id: salon._id.toString(),
    name: salon.name,
    description: salon.description || '',
    logo: salon.logo || '',
    coverImage: salon.coverImage || '',
    images: salon.images || [],
    address: salon.address,
    location: salon.location,
    contact: salon.contact,
    openingHours: salon.openingHours,
    facilities: salon.facilities || [],
    isActive: salon.isActive,
    isVerified: salon.isVerified,
    approvalStatus: salon.approvalStatus || null,
  };
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
        { status: 401 }
      );
    }

    if (!salonDashboardRoles.includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const salon = await Salon.findOne({ owner: currentUser._id }).select(
      'name description logo coverImage images address location contact openingHours facilities isActive isVerified approvalStatus'
    );
    if (!salon) {
      return NextResponse.json(
        { success: false, error: { code: 'SALON_NOT_FOUND', message: 'Salon not found for this user' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: serializeSalonProfile(salon) }, { status: 200 });
  } catch (error) {
    console.error('Salon profile fetch error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Failed to load salon profile' } },
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

    if (!salonDashboardRoles.includes(currentUser.role)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = currentUser.role === USER_ROLES.SALON_OWNER
      ? SalonOwnerUpdateSchema.parse(body)
      : SalonUpdateSchema.parse(body);

    const salon = await Salon.findOne({ owner: currentUser._id });
    if (!salon) {
      return NextResponse.json(
        { success: false, error: { code: 'SALON_NOT_FOUND', message: 'Salon not found for this user' } },
        { status: 404 }
      );
    }

    const updatedSalon = await updateSalon(salon._id.toString(), validated, currentUser);
    return NextResponse.json({
      success: true,
      data: serializeSalonProfile(updatedSalon),
      message: 'Salon updated successfully',
    }, { status: 200 });
  } catch (error) {
    console.error('Salon profile update error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'INVALID_REQUEST', message: 'Invalid salon profile data', details: error.issues } },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: { code: 'SERVER_ERROR', message: error instanceof Error ? error.message : 'Failed to update salon profile' } },
      { status: 400 }
    );
  }
}
