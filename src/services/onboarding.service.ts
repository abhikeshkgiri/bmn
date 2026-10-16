import mongoose from 'mongoose';
import { z } from 'zod';
import User from '@/models/User';
import Salon from '@/models/Salon';
import Barber from '@/models/Barber';
import Service from '@/models/Service';
import { USER_ROLES } from '@/constants/roles';
import { connectDB } from '@/lib/db';
import { recordAuditEvent } from '@/services/audit.service';
import type { AuthUser } from '@/types';
import { normalizeSupportedSalonLocation } from '@/constants/launch-cities';
import { APPROVED_SALON_STATUS_FILTER } from '@/utils/salon-approval';

const id = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID');

export const BarberOnboardingSchema = z.object({
  salonMode: z.literal('existing'),
  existingSalonId: id,
  barber: z.object({
    name: z.string().trim().min(2).max(100),
    bio: z.string().trim().max(1000).optional(),
    experienceYears: z.number().int().min(0).max(60),
    serviceIds: z.array(id).min(1, 'Select at least one salon service').max(30),
  }),
}).strict();

export type BarberOnboardingInput = z.infer<typeof BarberOnboardingSchema>;

export async function completeBarberOnboarding(actor: AuthUser, input: BarberOnboardingInput) {
  await connectDB();
  if (actor.role !== USER_ROLES.CUSTOMER && actor.role !== USER_ROLES.BARBER) throw new Error('ONBOARDING_FORBIDDEN');

  const session = await mongoose.startSession();
  const onboardingState: { result: { barberId: string; salonId: string } | null } = { result: null };
  let barberServiceIds: mongoose.Types.ObjectId[] = [];
  try {
    await session.withTransaction(async () => {
      const user = await User.findById(actor._id).session(session);
      if (!user || !user.isActive) throw new Error('USER_INACTIVE');
      if (user.role !== USER_ROLES.CUSTOMER && user.role !== USER_ROLES.BARBER) throw new Error('ONBOARDING_FORBIDDEN');

      const salon = await Salon.findOne({
        _id: input.existingSalonId,
        isActive: true,
        isVerified: true,
        approvalStatus: APPROVED_SALON_STATUS_FILTER,
      }).session(session);
      if (!salon || !normalizeSupportedSalonLocation(salon.address.city, salon.address.state)) {
        throw new Error('SALON_NOT_AVAILABLE');
      }

      const services = await Service.find({
        _id: { $in: input.barber.serviceIds },
        salon: salon._id,
        isActive: true,
      }).session(session);
      if (services.length !== input.barber.serviceIds.length) throw new Error('SERVICE_INVALID');
      barberServiceIds = services.map((service) => service._id);

      const existingBarber = await Barber.findOne({ user: user._id }).session(session);
      if (existingBarber) {
        if (existingBarber.salon.toString() !== salon._id.toString()) throw new Error('BARBER_ALREADY_ONBOARDED');
        onboardingState.result = { barberId: existingBarber._id.toString(), salonId: salon._id.toString() };
        return;
      }

      user.role = USER_ROLES.BARBER;
      await user.save({ session });
      const slug = `${input.barber.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;
      const createdBarbers = await Barber.create([{
        user: user._id,
        salon: salon._id,
        name: input.barber.name,
        slug,
        bio: input.barber.bio || null,
        experienceYears: input.barber.experienceYears,
        specializations: [],
        services: barberServiceIds,
        portfolio: [],
        rating: 0,
        reviewCount: 0,
        isAvailable: false,
        offersHomeService: false,
        isVerified: false,
        isActive: false,
      }], { session });
      const barber = createdBarbers[0];
      await Salon.updateOne({ _id: salon._id }, { $addToSet: { barbers: barber._id } }, { session });
      onboardingState.result = { barberId: barber._id.toString(), salonId: salon._id.toString() };
    });
  } finally {
    await session.endSession();
  }

  if (!onboardingState.result) throw new Error('ONBOARDING_FAILED');
  await recordAuditEvent({ actor, action: 'BARBER_ONBOARDING_SUBMITTED', entityType: 'Barber', entityId: onboardingState.result.barberId, metadata: { salonId: onboardingState.result.salonId } });
  return { ...onboardingState.result, status: 'PENDING_APPROVAL' };
}

export async function getBarberOnboardingStatus(actor: AuthUser) {
  await connectDB();
  const barber = await Barber.findOne({ user: actor._id }).populate('salon', 'name slug isActive isVerified address');
  return {
    complete: Boolean(barber),
    approval: barber?.isVerified && barber?.isActive ? 'APPROVED' : 'PENDING_APPROVAL',
    barber,
  };
}
