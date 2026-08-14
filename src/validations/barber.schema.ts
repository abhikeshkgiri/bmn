import { z } from 'zod';
import { BARBER_SPECIALIZATION_ARRAY } from '@/constants/services';

export const PortfolioItemSchema = z.object({
  image: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
});

export const BarberCreateSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  profileImage: z.string().optional(),
  bio: z.string().optional(),
  experienceYears: z.number().min(0),
  specializations: z.array(z.enum(BARBER_SPECIALIZATION_ARRAY as [string, ...string[]])).default([]),
  portfolio: z.array(PortfolioItemSchema).optional(),
  offersHomeService: z.boolean().default(false),
  homeServiceRadius: z.number().min(1).max(100).optional(),
});

export const BarberUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  profileImage: z.string().optional(),
  bio: z.string().optional(),
  experienceYears: z.number().min(0).optional(),
  specializations: z.array(z.enum(BARBER_SPECIALIZATION_ARRAY as [string, ...string[]])).optional(),
  portfolio: z.array(PortfolioItemSchema).optional(),
  offersHomeService: z.boolean().optional(),
  homeServiceRadius: z.number().min(1).max(100).optional(),
  isAvailable: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type BarberCreateInput = z.infer<typeof BarberCreateSchema>;
export type BarberUpdateInput = z.infer<typeof BarberUpdateSchema>;
