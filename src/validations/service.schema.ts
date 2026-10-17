import { z } from 'zod';
import { SERVICE_CATEGORY_ARRAY } from '@/constants/services';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB ObjectId');
const serviceName = z.string().trim().min(2).max(100);
const serviceDescription = z.string().trim().max(2000).optional();
const localImage = z.string().trim().refine((value) => value.startsWith('/uploads/') && value.slice('/uploads/'.length).split('/').every(
  (segment) => segment.length > 0 && segment !== '.' && segment !== '..' && /^[a-zA-Z0-9._-]+$/.test(segment),
));
const apiUploadedImage = z.string().regex(/^\/api\/uploads\/[a-f\d-]{36}$/i);
const imageUrl = z.string().url();
const serviceImage = z.union([imageUrl, localImage, apiUploadedImage, z.literal('')])
  .optional()
  .transform((value) => value || undefined);
const serviceImageUpdate = z.union([imageUrl, localImage, apiUploadedImage, z.literal(''), z.null()])
  .optional()
  .transform((value) => value === '' ? null : value);
const servicePrice = z.number().int().min(0);
const serviceDuration = z.number().int().min(15).max(480);

export function isDiscountPriceValid(price: number, discountPrice?: number | null): boolean {
  return discountPrice == null || discountPrice <= price;
}

export const ServiceCreateSchema = z
  .object({
    salonId: objectId,
    name: serviceName,
    description: serviceDescription,
    category: z.enum(SERVICE_CATEGORY_ARRAY as [string, ...string[]]),
    image: serviceImage,
    duration: serviceDuration,
    price: servicePrice,
    discountPrice: z.number().int().min(0).optional(),
    displayOrder: z.number().int().min(0).max(10000).default(0),
  }).strict()
  .refine(
    (data) => isDiscountPriceValid(data.price, data.discountPrice),
    {
      message: 'Discount price must not exceed regular price',
      path: ['discountPrice'],
    },
  );

export const ServiceUpdateSchema = z
  .object({
    name: serviceName.optional(),
    description: serviceDescription,
    category: z.enum(SERVICE_CATEGORY_ARRAY as [string, ...string[]]).optional(),
    image: serviceImageUpdate,
    duration: serviceDuration.optional(),
    price: servicePrice.optional(),
    discountPrice: z.number().int().min(0).nullable().optional(),
    displayOrder: z.number().int().min(0).max(10000).optional(),
  }).strict()
  .refine((data) => Object.keys(data).length > 0, 'At least one service field must be provided')
  .refine(
    (data) => {
      return data.price === undefined || isDiscountPriceValid(data.price, data.discountPrice);
    },
    {
      message: 'Discount price must not exceed regular price',
      path: ['discountPrice'],
    },
  );

export const ServiceStatusSchema = z.object({
  isActive: z.boolean(),
}).strict();

export const ServiceListSchema = z.object({
  salonId: objectId.optional(),
  category: z.enum(SERVICE_CATEGORY_ARRAY as [string, ...string[]]).optional(),
  isActive: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
  search: z.string().trim().max(100).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(50)).optional(),
  sortBy: z.enum(['createdAt', 'name', 'price', 'duration', 'displayOrder']).optional(),
}).strict();

export type ServiceCreateInput = z.infer<typeof ServiceCreateSchema>;
export type ServiceUpdateInput = z.infer<typeof ServiceUpdateSchema>;
export type ServiceStatusInput = z.infer<typeof ServiceStatusSchema>;
export type ServiceListQuery = z.infer<typeof ServiceListSchema>;
