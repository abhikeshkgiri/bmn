import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import Favorite from '@/models/Favorite';
import Salon from '@/models/Salon';
import Barber from '@/models/Barber';
import User from '@/models/User';
import { connectDB } from '@/lib/db';
import { getSupportedSalonLocationFilter } from '@/constants/launch-cities';
import { APPROVED_SALON_STATUS_FILTER } from '@/utils/salon-approval';
import { FavoriteInputSchema } from '@/validations/favorite.schema';
import type { FavoriteInput } from '@/validations/favorite.schema';
import { ZodError } from 'zod';
import { USER_ROLES } from '@/constants/roles';

function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, error: { code: 'AUTHENTICATION_REQUIRED', message: 'Sign in as a customer to manage favorites.' } },
    { status: 401 },
  );
}

function publicSalonFilter() {
  return {
    isActive: true,
    isVerified: true,
    approvalStatus: APPROVED_SALON_STATUS_FILTER,
    ...getSupportedSalonLocationFilter(),
  };
}

export async function GET() {
  const current = await getCurrentUser();
  if (!current || current.role !== USER_ROLES.CUSTOMER) return unauthorizedResponse();

  try {
    await connectDB();
    const favorites = await Favorite.find({ customer: current._id })
      .sort({ createdAt: -1 })
      .select('_id targetType target createdAt')
      .maxTimeMS(5000)
      .lean();
    const salonFavorites = favorites.filter((item) => item.targetType === 'SALON');
    const barberFavorites = favorites.filter((item) => item.targetType === 'BARBER');
    const [salonDocs, initialBarberDocs] = await Promise.all([
      salonFavorites.length
        ? Salon.find({
            _id: { $in: salonFavorites.map((item) => item.target) },
            ...publicSalonFilter(),
          })
            .select('name slug logo coverImage images address.area address.city rating reviewCount')
            .maxTimeMS(5000)
            .lean()
        : [],
      barberFavorites.length
        ? Barber.find({
            _id: { $in: barberFavorites.map((item) => item.target) },
            isActive: true,
            isVerified: true,
          })
            .select('user salon name slug profileImage rating reviewCount')
            .maxTimeMS(5000)
            .lean()
        : [],
    ]);

    const publicSalons = new Map(salonDocs.map((salon) => [salon._id.toString(), salon]));
    const eligibleSalonIds = [...new Set(initialBarberDocs.map((barber) => barber.salon.toString()))];
    const [eligibleSalons, activeBarberUsers] = await Promise.all([
      eligibleSalonIds.length
        ? Salon.find({ _id: { $in: eligibleSalonIds }, ...publicSalonFilter() })
            .select('_id')
            .maxTimeMS(5000)
            .lean()
        : [],
      initialBarberDocs.length
        ? User.find({
            _id: { $in: initialBarberDocs.map((barber) => barber.user) },
            role: USER_ROLES.BARBER,
            isActive: true,
          })
            .select('_id')
            .maxTimeMS(5000)
            .lean()
        : [],
    ]);
    const eligibleSalonIdSet = new Set(eligibleSalons.map((salon) => salon._id.toString()));
    const eligibleUserIdSet = new Set(activeBarberUsers.map((user) => user._id.toString()));
    const publicBarbers = new Map(
      initialBarberDocs
        .filter((barber) =>
          eligibleSalonIdSet.has(barber.salon.toString()) &&
          eligibleUserIdSet.has(barber.user.toString())
        )
        .map((barber) => [barber._id.toString(), barber]),
    );

    return NextResponse.json({
      success: true,
      data: {
        salons: salonFavorites.flatMap((favorite) => {
          const salon = publicSalons.get(favorite.target.toString());
          return salon
            ? [{
                favoriteId: favorite._id.toString(),
                _id: salon._id.toString(),
                name: salon.name,
                slug: salon.slug,
                logo: salon.logo ?? null,
                coverImage: salon.coverImage ?? null,
                images: salon.images ?? [],
                address: {
                  area: salon.address?.area ?? null,
                  city: salon.address?.city ?? null,
                },
                rating: salon.rating,
                reviewCount: salon.reviewCount,
              }]
            : [];
        }),
        barbers: barberFavorites.flatMap((favorite) => {
          const barber = publicBarbers.get(favorite.target.toString());
          return barber
            ? [{
                favoriteId: favorite._id.toString(),
                _id: barber._id.toString(),
                name: barber.name,
                slug: barber.slug,
                profileImage: barber.profileImage ?? null,
                rating: barber.rating,
                reviewCount: barber.reviewCount,
              }]
            : [];
        }),
      },
    });
  } catch (error) {
    console.error('Favorite list request failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json(
      { success: false, error: { code: 'FAVORITES_UNAVAILABLE', message: 'Unable to load favorites right now.' } },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const current = await getCurrentUser();
  if (!current || current.role !== USER_ROLES.CUSTOMER) return unauthorizedResponse();
  let parsedInput: FavoriteInput | undefined;

  try {
    const input = parsedInput = FavoriteInputSchema.parse(await request.json());
    await connectDB();

    if (parsedInput.targetType === 'SALON') {
      const salon = await Salon.exists({
        _id: parsedInput.targetId,
        ...publicSalonFilter(),
      }).maxTimeMS(5000);
      if (!salon) {
        return NextResponse.json(
          { success: false, error: { code: 'TARGET_UNAVAILABLE', message: 'This salon is not available to favorite.' } },
          { status: 404 },
        );
      }
    } else {
      const barber = await Barber.findOne({
        _id: input.targetId,
        isActive: true,
        isVerified: true,
      })
        .select('user salon')
        .maxTimeMS(5000)
        .lean();
      if (!barber) {
        return NextResponse.json(
          { success: false, error: { code: 'TARGET_UNAVAILABLE', message: 'This barber is not available to favorite.' } },
          { status: 404 },
        );
      }

      const [salon, barberUser] = await Promise.all([
        Salon.exists({ _id: barber.salon, ...publicSalonFilter() }).maxTimeMS(5000),
        User.exists({ _id: barber.user, role: USER_ROLES.BARBER, isActive: true }).maxTimeMS(5000),
      ]);
      if (!salon || !barberUser) {
        return NextResponse.json(
          { success: false, error: { code: 'TARGET_UNAVAILABLE', message: 'This barber is not available to favorite.' } },
          { status: 404 },
        );
      }
    }

    const favorite = await Favorite.findOneAndUpdate(
      {
        customer: current._id,
        targetType: input.targetType,
        target: input.targetId,
      },
      {
        $setOnInsert: {
          customer: current._id,
          targetType: input.targetType,
          target: input.targetId,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
      .select('_id targetType target createdAt')
      .maxTimeMS(5000)
      .lean();

    return NextResponse.json(
      { success: true, data: favorite },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid favorite request.', details: error.issues } },
        { status: 400 },
      );
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid favorite request body.' } },
        { status: 400 },
      );
    }
    if (parsedInput && error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      try {
        const existing = await Favorite.findOne({
          customer: current._id,
          targetType: parsedInput.targetType,
          target: parsedInput.targetId,
        }).select('_id targetType target createdAt').maxTimeMS(5000).lean();
        if (existing) return NextResponse.json({ success: true, data: existing }, { status: 200 });
      } catch (duplicateRecoveryError) {
        console.error(
          'Favorite duplicate recovery failed:',
          duplicateRecoveryError instanceof Error ? duplicateRecoveryError.name : 'UnknownError',
        );
      }
    }
    console.error('Favorite save request failed:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json(
      { success: false, error: { code: 'FAVORITE_SAVE_FAILED', message: 'Unable to save this favorite right now.' } },
      { status: 500 },
    );
  }
}
