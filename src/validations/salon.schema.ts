import { z } from 'zod';

export const AddressSchema = z.object({
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  area: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().min(1).default('India'),
});

export const LocationSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]),
});

export const OpeningHoursSchema = z.object({
  monday: z.object({
    isOpen: z.boolean(),
    openTime: z.string().optional(),
    closeTime: z.string().optional(),
  }),
  tuesday: z.object({
    isOpen: z.boolean(),
    openTime: z.string().optional(),
    closeTime: z.string().optional(),
  }),
  wednesday: z.object({
    isOpen: z.boolean(),
    openTime: z.string().optional(),
    closeTime: z.string().optional(),
  }),
  thursday: z.object({
    isOpen: z.boolean(),
    openTime: z.string().optional(),
    closeTime: z.string().optional(),
  }),
  friday: z.object({
    isOpen: z.boolean(),
    openTime: z.string().optional(),
    closeTime: z.string().optional(),
  }),
  saturday: z.object({
    isOpen: z.boolean(),
    openTime: z.string().optional(),
    closeTime: z.string().optional(),
  }),
  sunday: z.object({
    isOpen: z.boolean(),
    openTime: z.string().optional(),
    closeTime: z.string().optional(),
  }),
});

export const ContactSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  email: z.string().email().optional(),
  website: z.string().optional(),
});

export const SalonCreateSchema = z.object({
  name: z.string().min(3).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  logo: z.string().optional(),
  coverImage: z.string().optional(),
  address: AddressSchema,
  location: LocationSchema,
  contact: ContactSchema,
  openingHours: OpeningHoursSchema,
  facilities: z.array(z.string()).optional(),
});

export const SalonUpdateSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  description: z.string().optional(),
  logo: z.string().optional(),
  coverImage: z.string().optional(),
  address: AddressSchema.partial().optional(),
  location: LocationSchema.optional(),
  contact: ContactSchema.partial().optional(),
  openingHours: OpeningHoursSchema.partial().optional(),
  facilities: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export type SalonCreateInput = z.infer<typeof SalonCreateSchema>;
export type SalonUpdateInput = z.infer<typeof SalonUpdateSchema>;
export type AddressInput = z.infer<typeof AddressSchema>;
export type LocationInput = z.infer<typeof LocationSchema>;
