import { z } from 'zod';
import { BARBER_SPECIALIZATION_ARRAY } from '@/constants/services';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB ObjectId');
const httpUrl = z.string().url().refine(
  (value) => /^https?:\/\//i.test(value),
  'URL must use HTTP or HTTPS',
);
const localImage = z.string().trim().refine((value) => value.startsWith('/uploads/') && value.slice('/uploads/'.length).split('/').every(
  (segment) => segment.length > 0 && segment !== '.' && segment !== '..' && /^[a-zA-Z0-9._-]+$/.test(segment),
));
const apiUploadedImage = z.string().regex(/^\/api\/uploads\/[a-f\d-]{36}$/i);
const imageReference = z.union([httpUrl, localImage, apiUploadedImage]);
const optionalUrl = z.union([imageReference, z.literal('')])
  .optional()
  .transform((value) => value || undefined);
const optionalUrlUpdate = z.union([imageReference, z.literal(''), z.null()])
  .optional()
  .transform((value) => value === '' ? null : value);

/**
 * Portfolio item schema
 */
export const PortfolioItemSchema = z.object({
  image: imageReference,
  title: z.string().trim().max(100).optional(),
  description: z.string().trim().max(500).optional(),
}).strict();

/**
 * Barber creation schema
 * Used when salon owner creates a barber
 */
export const BarberCreateSchema = z.object({
  salonId: objectId,
  userId: objectId.optional(),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must not exceed 100 characters'),
  title: z.string().trim().max(100).optional(),
  bio: z.string().trim().max(2000).optional(),
  profileImage: optionalUrl,
  experienceYears: z.number().min(0, 'Experience must be >= 0').max(60, 'Experience must be <= 60'),
  specializations: z.array(z.enum(BARBER_SPECIALIZATION_ARRAY as [string, ...string[]])).default([]),
  services: z.array(objectId).max(100).default([]).refine((values) => new Set(values).size === values.length, 'Services must not contain duplicates'),
  portfolio: z.array(PortfolioItemSchema).optional(),
  offersHomeService: z.boolean().default(false),
  homeServiceRadius: z.number().min(1, 'Radius must be >= 1 km').max(100, 'Radius must be <= 100 km').optional(),
}).strict();

/**
 * Barber update schema
 * For updates by salon owner or barber
 */
export const BarberUpdateSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must not exceed 100 characters').optional(),
  title: z.string().trim().max(100).optional(),
  bio: z.string().trim().max(2000).optional(),
  profileImage: optionalUrlUpdate,
  experienceYears: z.number().min(0, 'Experience must be >= 0').max(60, 'Experience must be <= 60').optional(),
  specializations: z.array(z.enum(BARBER_SPECIALIZATION_ARRAY as [string, ...string[]])).optional(),
  services: z.array(objectId).max(100).refine((values) => new Set(values).size === values.length, 'Services must not contain duplicates').optional(),
  portfolio: z.array(PortfolioItemSchema).optional(),
  offersHomeService: z.boolean().optional(),
  homeServiceRadius: z.number().min(1, 'Radius must be >= 1 km').max(100, 'Radius must be <= 100 km').optional(),
  isAvailable: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, 'At least one barber field must be provided');

/**
 * Barber status update schema
 * For toggling isActive status
 */
export const BarberStatusSchema = z.object({
  isActive: z.boolean(),
}).strict();

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
  salonId: objectId.optional(),
  search: z.string().trim().max(100).optional(),
  specialization: z.enum(BARBER_SPECIALIZATION_ARRAY as [string, ...string[]]).optional(),
  service: objectId.optional(),
  offersHomeService: z.enum(['true', 'false']).optional(),
  isActive: z.enum(['true', 'false']).optional(),
  isVerified: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(10),
  sortBy: z.enum(['createdAt', 'name', 'rating', 'experienceYears']).default('createdAt'),
}).strict();

export type BarberCreateInput = z.infer<typeof BarberCreateSchema>;
export type BarberUpdateInput = z.infer<typeof BarberUpdateSchema>;
export type BarberStatusInput = z.infer<typeof BarberStatusSchema>;
export type BarberVerifyInput = z.infer<typeof BarberVerifySchema>;
export type BarberListQuery = z.infer<typeof BarberListSchema>;
