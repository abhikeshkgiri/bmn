import { z } from 'zod';
import { BARBER_SPECIALIZATION_ARRAY } from '@/constants/services';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB ObjectId');

/**
 * Portfolio item schema
 */
export const PortfolioItemSchema = z.object({
  image: z.string().url('Portfolio image must be a valid URL'),
  title: z.string().optional(),
  description: z.string().optional(),
});

/**
 * Barber creation schema
 * Used when salon owner creates a barber
 */
export const BarberCreateSchema = z.object({
  salonId: objectId,
  userId: objectId,
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must not exceed 100 characters'),
  bio: z.string().optional(),
  profileImage: z.string().url('Profile image must be a valid URL').optional(),
  experienceYears: z.number().min(0, 'Experience must be >= 0').max(60, 'Experience must be <= 60'),
  specializations: z.array(z.enum(BARBER_SPECIALIZATION_ARRAY as [string, ...string[]])).default([]),
  services: z.array(objectId).default([]),
  portfolio: z.array(PortfolioItemSchema).optional(),
  offersHomeService: z.boolean().default(false),
  homeServiceRadius: z.number().min(1, 'Radius must be >= 1 km').max(100, 'Radius must be <= 100 km').optional(),
});

/**
 * Barber update schema
 * For updates by salon owner or barber
 */
export const BarberUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must not exceed 100 characters').optional(),
  bio: z.string().optional(),
  profileImage: z.string().url('Profile image must be a valid URL').optional(),
  experienceYears: z.number().min(0, 'Experience must be >= 0').max(60, 'Experience must be <= 60').optional(),
  specializations: z.array(z.enum(BARBER_SPECIALIZATION_ARRAY as [string, ...string[]])).optional(),
  services: z.array(objectId).optional(),
  portfolio: z.array(PortfolioItemSchema).optional(),
  offersHomeService: z.boolean().optional(),
  homeServiceRadius: z.number().min(1, 'Radius must be >= 1 km').max(100, 'Radius must be <= 100 km').optional(),
  isAvailable: z.boolean().optional(),
});

/**
 * Barber status update schema
 * For toggling isActive status
 */
export const BarberStatusSchema = z.object({
  isActive: z.boolean(),
});

/**
 * Barber verification schema
 * Admin only
 */
export const BarberVerifySchema = z.object({
  isVerified: z.boolean(),
});

/**
 * Barber list query schema
 */
export const BarberListSchema = z.object({
  salonId: z.string().optional(),
  search: z.string().optional(),
  specialization: z.string().optional(),
  service: z.string().optional(),
  offersHomeService: z.enum(['true', 'false']).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  isVerified: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  sortBy: z.enum(['createdAt', 'name', 'rating', 'experienceYears']).default('createdAt'),
});

export type BarberCreateInput = z.infer<typeof BarberCreateSchema>;
export type BarberUpdateInput = z.infer<typeof BarberUpdateSchema>;
export type BarberStatusInput = z.infer<typeof BarberStatusSchema>;
export type BarberVerifyInput = z.infer<typeof BarberVerifySchema>;
export type BarberListQuery = z.infer<typeof BarberListSchema>;
