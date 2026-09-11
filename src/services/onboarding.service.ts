import mongoose from 'mongoose';
import { z } from 'zod';
import User from '@/models/User';
import Salon, { type ISalon } from '@/models/Salon';
import Barber from '@/models/Barber';
import Service from '@/models/Service';
import { USER_ROLES } from '@/constants/roles';
import { SERVICE_CATEGORY } from '@/constants/services';
import { connectDB } from '@/lib/db';
import { generateUniqueSlug } from '@/utils/slug';
import { recordAuditEvent } from '@/services/audit.service';
import type { AuthUser } from '@/types';

const id = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID');
const openingHours = {
  monday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
  tuesday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
  wednesday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
  thursday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
  friday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
  saturday: { isOpen: true, openTime: '10:00', closeTime: '20:00' },
  sunday: { isOpen: false, openTime: null, closeTime: null },
};

export const BarberOnboardingSchema = z.object({
  salonMode: z.enum(['existing', 'new']),
  existingSalonId: id.optional(),
  salon: z.object({
    name: z.string().trim().min(3).max(100),
    description: z.string().trim().max(500).optional(),
    addressLine1: z.string().trim().min(3).max(200),
    area: z.string().trim().max(100).optional(),
    city: z.enum(['Delhi', 'Mumbai', 'Bengaluru', 'Kolkata']),
    state: z.string().trim().min(2).max(80),
    postalCode: z.string().trim().min(3).max(12),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  }).optional(),
  newServices: z.array(z.object({
    name: z.string().trim().min(2).max(100),
    category: z.enum(Object.values(SERVICE_CATEGORY) as [string, ...string[]]),
    duration: z.number().int().min(15).max(480),
    price: z.number().int().min(0),
  })).max(20).default([]),
  barber: z.object({
    name: z.string().trim().min(2).max(100),
    bio: z.string().trim().max(1000).optional(),
    experienceYears: z.number().int().min(0).max(60),
    serviceIds: z.array(id).max(30).default([]),
  }),
}).strict().superRefine((value, context) => {
  if (value.salonMode === 'existing' && !value.existingSalonId) context.addIssue({ code: 'custom', path: ['existingSalonId'], message: 'Select an existing salon' });
  if (value.salonMode === 'new' && !value.salon) context.addIssue({ code: 'custom', path: ['salon'], message: 'Salon details are required' });
});

export type BarberOnboardingInput = z.infer<typeof BarberOnboardingSchema>;

export async function completeBarberOnboarding(actor: AuthUser, input: BarberOnboardingInput) {
  await connectDB();
  if (actor.role !== USER_ROLES.CUSTOMER && actor.role !== USER_ROLES.BARBER) throw new Error('ONBOARDING_FORBIDDEN');

  const session = await mongoose.startSession();
  const onboardingState: { result: { barberId: string; salonId: string } | null } = { result: null };
  try {
    await session.withTransaction(async () => {
      const user = await User.findById(actor._id).session(session);
      if (!user || !user.isActive) throw new Error('USER_INACTIVE');
      if (user.role !== USER_ROLES.CUSTOMER && user.role !== USER_ROLES.BARBER) throw new Error('ONBOARDING_FORBIDDEN');

      let salon: ISalon | null = null;
      if (input.salonMode === 'existing') {
        salon = await Salon.findOne({ _id: input.existingSalonId, isActive: true, isVerified: true }).session(session);
        if (!salon) throw new Error('SALON_NOT_AVAILABLE');
      } else {
        const details = input.salon!;
        const duplicate = await Salon.findOne({ 'address.city': details.city, name: new RegExp(`^${details.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).session(session);
        if (duplicate) throw new Error('SALON_DUPLICATE');
        const slug = await generateUniqueSlug(details.name);
        const created = await Salon.create([{
          name: details.name,
          slug,
          description: details.description || '',
          owner: user._id,
          address: { addressLine1: details.addressLine1, area: details.area, city: details.city, state: details.state, postalCode: details.postalCode, country: 'India' },
          location: { type: 'Point', coordinates: [details.longitude, details.latitude] },
          contact: { phone: details.phone },
          openingHours,
          capacity: 3,
          slotIntervalMinutes: 30,
          facilities: [],
          rating: 0,
          reviewCount: 0,
          isVerified: false,
          isActive: false,
        }], { session });
        const createdSalon = created[0];
        salon = createdSalon;
        if (input.newServices.length === 0) throw new Error('SERVICES_REQUIRED');
        const createdServices = await Service.create(input.newServices.map((service) => ({
          salon: createdSalon._id,
          name: service.name,
          slug: service.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          category: service.category,
          duration: service.duration,
          price: service.price,
          isActive: true,
        })), { session });
        createdSalon.services = createdServices.map((service) => service._id);
        await createdSalon.save({ session });
      }

      if (!salon) throw new Error('ONBOARDING_FAILED');
      const selectedSalon = salon;

      const services = input.barber.serviceIds.length > 0
        ? await Service.find({ _id: { $in: input.barber.serviceIds }, salon: selectedSalon._id, isActive: true }).session(session)
        : [];
      if (services.length !== input.barber.serviceIds.length) throw new Error('SERVICE_INVALID');

      const existingBarber = await Barber.findOne({ user: user._id }).session(session);
      if (existingBarber) {
        if (existingBarber.salon.toString() !== selectedSalon._id.toString()) throw new Error('BARBER_ALREADY_ONBOARDED');
        onboardingState.result = { barberId: existingBarber._id.toString(), salonId: selectedSalon._id.toString() };
        return;
      }

      user.role = USER_ROLES.BARBER;
      await user.save({ session });
      const slug = `${input.barber.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;
      const createdBarbers = await Barber.create([{
        user: user._id,
        salon: selectedSalon._id,
        name: input.barber.name,
        slug,
        bio: input.barber.bio || null,
        experienceYears: input.barber.experienceYears,
        specializations: [],
        services: services.map((service) => service._id),
        portfolio: [],
        rating: 0,
        reviewCount: 0,
        isAvailable: false,
        offersHomeService: false,
        isVerified: false,
        isActive: false,
      }], { session });
      const barber = createdBarbers[0];
      await Salon.updateOne({ _id: selectedSalon._id }, { $addToSet: { barbers: barber._id, ...(services.length ? { services: { $each: services.map((service) => service._id) } } : {}) } }, { session });
      onboardingState.result = { barberId: barber._id.toString(), salonId: selectedSalon._id.toString() };
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
