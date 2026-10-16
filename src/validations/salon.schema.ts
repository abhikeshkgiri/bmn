import { z } from 'zod';
import { SALON_FACILITY, SALON_TYPE } from '@/constants/services';

export const AddressSchema = z.object({
  addressLine1: z.string().trim().min(2).max(200),
  addressLine2: z.string().trim().max(200).optional(),
  area: z.string().trim().max(100).optional(),
  landmark: z.string().trim().max(100).optional(),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().min(3).max(12),
  country: z.string().trim().min(2).max(80).default('India'),
}).strict();

export const LocationSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([
    z.number().min(-180).max(180),
    z.number().min(-90).max(90),
  ]),
}).strict();

const OpeningDaySchema = z.object({
  isOpen: z.boolean(),
  openTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
}).strict().superRefine((hours, context) => {
  if (!hours.isOpen) return;
  if (!hours.openTime || !hours.closeTime) {
    context.addIssue({
      code: 'custom',
      message: 'Opening and closing times are required when the salon is open',
    });
    return;
  }
  if (hours.closeTime <= hours.openTime) {
    context.addIssue({
      code: 'custom',
      path: ['closeTime'],
      message: 'Closing time must be later than opening time',
    });
  }
});

export const OpeningHoursSchema = z.object({
  monday: OpeningDaySchema,
  tuesday: OpeningDaySchema,
  wednesday: OpeningDaySchema,
  thursday: OpeningDaySchema,
  friday: OpeningDaySchema,
  saturday: OpeningDaySchema,
  sunday: OpeningDaySchema,
}).strict();

const HttpUrlSchema = z.string().trim().max(2048).refine((value) => {
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}, 'URL must use HTTP or HTTPS');

const OptionalHttpUrlSchema = z.union([HttpUrlSchema, z.literal('')]).optional();
const LocalPublicImageSchema = z.string().trim().refine((value) => {
  if (!value.startsWith('/uploads/')) return false;
  return value.slice('/uploads/'.length).split('/').every(
    (segment) => segment.length > 0 && segment !== '.' && segment !== '..' && /^[a-zA-Z0-9._-]+$/.test(segment),
  );
}, 'Image must be an uploaded salon image');
const PublicImageSchema = z.union([HttpUrlSchema, LocalPublicImageSchema]);
const OptionalPublicImageSchema = z.union([PublicImageSchema, z.literal('')]).optional();

export const ContactSchema = z.object({
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Phone number must be exactly 10 digits'),
  email: z.union([z.string().trim().toLowerCase().email().max(160), z.literal('')]).optional(),
  website: OptionalHttpUrlSchema,
}).strict();

export const SocialLinksSchema = z.object({
  instagram: OptionalHttpUrlSchema,
  facebook: OptionalHttpUrlSchema,
  youtube: OptionalHttpUrlSchema,
}).strict();

export const SalonCreateSchema = z.object({
  name: z.string().trim().min(3).max(100),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/),
  salonType: z.enum(SALON_TYPE),
  description: z.string().trim().max(1000).optional(),
  logo: OptionalPublicImageSchema,
  coverImage: OptionalPublicImageSchema,
  images: z.array(PublicImageSchema).max(20).optional(),
  socialLinks: SocialLinksSchema.optional(),
  address: AddressSchema,
  location: LocationSchema,
  contact: ContactSchema,
  openingHours: OpeningHoursSchema,
  facilities: z.array(z.enum(SALON_FACILITY)).max(30).optional(),
}).strict();

export const SalonUpdateSchema = z.object({
  name: z.string().trim().min(3).max(100).optional(),
  salonType: z.enum(SALON_TYPE).optional(),
  description: z.string().trim().max(1000).optional(),
  logo: OptionalPublicImageSchema,
  coverImage: OptionalPublicImageSchema,
  images: z.array(PublicImageSchema).max(20).optional(),
  socialLinks: SocialLinksSchema.partial().optional(),
  address: AddressSchema.partial().optional(),
  location: LocationSchema.optional(),
  contact: ContactSchema.partial().optional(),
  openingHours: OpeningHoursSchema.partial().optional(),
  facilities: z.array(z.enum(SALON_FACILITY)).max(30).optional(),
  isActive: z.boolean().optional(),
}).strict();

export const SalonOwnerUpdateSchema = SalonUpdateSchema.omit({ isActive: true });

export type SalonCreateInput = z.infer<typeof SalonCreateSchema>;
export type SalonUpdateInput = z.infer<typeof SalonUpdateSchema>;
export type SalonOwnerUpdateInput = z.infer<typeof SalonOwnerUpdateSchema>;
export type AddressInput = z.infer<typeof AddressSchema>;
export type LocationInput = z.infer<typeof LocationSchema>;
