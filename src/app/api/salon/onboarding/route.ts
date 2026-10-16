import { NextRequest, NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { getCurrentUser } from '@/lib/auth';
import { connectDB } from '@/lib/db';
import { isDatabaseUnavailableError } from '@/lib/db-errors';
import { USER_ROLES } from '@/constants/roles';
import Salon from '@/models/Salon';
import Barber from '@/models/Barber';
import Service from '@/models/Service';
import { createSalon, submitSalonApplication } from '@/services/salon.service';
import { SalonCreateSchema } from '@/validations/salon.schema';
import { getSalonApplicationBlockers } from '@/utils/salon-application-readiness';
import { finalizeStagedIdentityDocument, finalizeStagedSalonImage } from '@/lib/salon-uploads';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  }
  if (user.role !== USER_ROLES.SALON_OWNER) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Salon owner access required' } }, { status: 403 });
  }

  try {
    await connectDB();
    const salon = await Salon.findOne({ owner: user._id })
      .select('name slug salonType description logo coverImage images address contact socialLinks openingHours location facilities isActive isVerified approvalStatus rejectionReason approvalUpdatedAt +aadhaarDocument +panDocument')
      .lean();
    if (!salon) return NextResponse.json({ success: true, data: { salon: null } });
    const [services, barbers] = await Promise.all([
      Service.find({ salon: salon._id })
        .select('name description category price discountPrice duration image displayOrder isActive')
        .sort({ displayOrder: 1, name: 1 })
        .limit(100)
        .maxTimeMS(5000)
        .lean(),
      Barber.find({ salon: salon._id })
        .select('user name title bio profileImage experienceYears specializations isVerified isActive')
        .sort({ name: 1 })
        .limit(100)
        .maxTimeMS(5000)
        .lean(),
    ]);
    const [activeServiceCount, barberProfileCount] = await Promise.all([
      Service.countDocuments({ salon: salon._id, isActive: true }).maxTimeMS(5000),
      Barber.countDocuments({ salon: salon._id }).maxTimeMS(5000),
    ]);
    const hasAadhaarDocument = Boolean(salon.aadhaarDocument);
    const hasPanDocument = Boolean(salon.panDocument);
    const blockers = getSalonApplicationBlockers({
      activeServiceCount,
      barberProfileCount,
      hasAadhaarDocument,
      hasPanDocument,
    });
    const safeSalon = { ...salon };
    delete safeSalon.aadhaarDocument;
    delete safeSalon.panDocument;
    const ownerBarbers = barbers.map((barber) => ({
      _id: barber._id,
      name: barber.name,
      title: barber.title,
      bio: barber.bio,
      profileImage: barber.profileImage,
      experienceYears: barber.experienceYears,
      specializations: barber.specializations,
      isVerified: barber.isVerified,
      isActive: barber.isActive,
      accountLinked: Boolean(barber.user),
    }));
    return NextResponse.json({
      success: true,
      data: {
        salon: {
          ...safeSalon,
          services,
          barbers: ownerBarbers,
          identityDocuments: { aadhaar: hasAadhaarDocument, pan: hasPanDocument },
        },
        readiness: { activeServiceCount, barberProfileCount, hasAadhaarDocument, hasPanDocument, blockers },
      },
    });
  } catch (error) {
    const unavailable = isDatabaseUnavailableError(error);
    console.error('Salon onboarding lookup failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json(
      { success: false, error: { code: unavailable ? 'DATABASE_UNAVAILABLE' : 'SERVER_ERROR', message: unavailable ? 'The database cannot be reached. Salon onboarding is temporarily unavailable.' : 'Failed to load salon onboarding.' } },
      { status: unavailable ? 503 : 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } }, { status: 401 });
  }
  if (user.role !== USER_ROLES.SALON_OWNER) {
    return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Salon owner access required' } }, { status: 403 });
  }

  try {
    z.object({}).strict().parse(await request.json());
    const salon = await submitSalonApplication(user);
    return NextResponse.json({
      success: true,
      data: {
        _id: salon._id.toString(),
        name: salon.name,
        salonType: salon.salonType,
        isActive: salon.isActive,
        isVerified: salon.isVerified,
        approvalStatus: salon.approvalStatus,
        rejectionReason: salon.rejectionReason,
        address: { city: salon.address.city, state: salon.address.state },
      },
    }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid application submission request' } }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Failed to submit salon application';
    if (message.startsWith('SALON_APPLICATION_INCOMPLETE:')) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'APPLICATION_INCOMPLETE',
          message: message.slice('SALON_APPLICATION_INCOMPLETE:'.length).split('|').join(' '),
        },
      }, { status: 422 });
    }
    if (message.startsWith('SALON_APPLICATION_CONFLICT:')) {
      return NextResponse.json({ success: false, error: { code: 'APPLICATION_CONFLICT', message: message.split(':').slice(1).join(':').trim() } }, { status: 409 });
    }
    if (message === 'SALON_NOT_FOUND') {
      return NextResponse.json({ success: false, error: { code: 'SALON_NOT_FOUND', message: 'Create a salon profile before submitting an application.' } }, { status: 404 });
    }
    if (message.includes('SALON_ACCESS_DENIED')) {
      return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Salon owner access required' } }, { status: 403 });
    }
    const unavailable = isDatabaseUnavailableError(error);
    console.error('Salon application submission failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json(
      { success: false, error: { code: unavailable ? 'DATABASE_UNAVAILABLE' : 'SALON_SUBMIT_FAILED', message: unavailable ? 'The database cannot be reached. Application submission is temporarily unavailable.' : 'Failed to submit salon application.' } },
      { status: unavailable ? 503 : 500 },
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
    const {
      aadhaarUploadToken,
      panUploadToken,
      ...salonInput
    } = z.object({
      aadhaarUploadToken: z.string().uuid().optional(),
      panUploadToken: z.string().uuid().optional(),
    }).passthrough().parse(await request.json());
    const input = SalonCreateSchema.parse(salonInput);
    const salon = await createSalon(input, user);
    const [aadhaarDocument, panDocument, logo, coverImage, images] = await Promise.all([
      aadhaarUploadToken
        ? finalizeStagedIdentityDocument(user._id.toString(), salon._id.toString(), salon.name, 'aadhaar', aadhaarUploadToken)
        : Promise.resolve(undefined),
      panUploadToken
        ? finalizeStagedIdentityDocument(user._id.toString(), salon._id.toString(), salon.name, 'pan', panUploadToken)
        : Promise.resolve(undefined),
      input.logo ? finalizeStagedSalonImage(user._id.toString(), salon._id.toString(), salon.name, input.logo) : Promise.resolve(input.logo),
      input.coverImage ? finalizeStagedSalonImage(user._id.toString(), salon._id.toString(), salon.name, input.coverImage) : Promise.resolve(input.coverImage),
      Promise.all((input.images ?? []).map((image) => finalizeStagedSalonImage(user._id.toString(), salon._id.toString(), salon.name, image))),
    ]);
    const salonUpdates: Record<string, unknown> = { logo, coverImage, images };
    if (aadhaarDocument) salonUpdates.aadhaarDocument = aadhaarDocument;
    if (panDocument) salonUpdates.panDocument = panDocument;
    await Salon.updateOne(
      { _id: salon._id, owner: user._id },
      { $set: salonUpdates },
    );
    return NextResponse.json({
      success: true,
      data: {
        _id: salon._id.toString(),
        name: salon.name,
        salonType: salon.salonType,
        isActive: salon.isActive,
        isVerified: salon.isVerified,
        approvalStatus: salon.approvalStatus,
        rejectionReason: salon.rejectionReason,
        address: { city: salon.address.city, state: salon.address.state },
      },
    }, { status: 201 });
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
    const unavailable = isDatabaseUnavailableError(error);
    const errorName = error instanceof Error ? error.name : 'UnknownError';
    console.error('Salon onboarding create failed:', errorName);
    return NextResponse.json(
      { success: false, error: { code: unavailable ? 'DATABASE_UNAVAILABLE' : 'SALON_CREATE_FAILED', message: unavailable ? 'The database cannot be reached. Salon creation is temporarily unavailable.' : 'Failed to submit salon details.' } },
      { status: unavailable ? 503 : 500 }
    );
  }
}
