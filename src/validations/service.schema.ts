import { z } from 'zod';
import { SERVICE_CATEGORY_ARRAY } from '@/constants/services';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid MongoDB ObjectId');
const serviceName = z.string().trim().min(2).max(100);
const serviceDescription = z.string().trim().max(2000).optional();
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
    image: z.string().url().optional(),
    duration: serviceDuration,
    price: servicePrice,
    discountPrice: z.number().int().min(0).optional(),
  })
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
    image: z.string().url().optional(),
    duration: serviceDuration.optional(),
    price: servicePrice.optional(),
    discountPrice: z.number().int().min(0).optional(),
  })
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
});

export const ServiceListSchema = z.object({
  salonId: z.string().optional(),
  category: z.string().optional(),
  isActive: z.string().transform((val) => val === 'true').optional(),
  search: z.string().optional(),
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
  sortBy: z.enum(['createdAt', 'name', 'price', 'duration']).optional(),
});

export type ServiceCreateInput = z.infer<typeof ServiceCreateSchema>;
export type ServiceUpdateInput = z.infer<typeof ServiceUpdateSchema>;
export type ServiceStatusInput = z.infer<typeof ServiceStatusSchema>;
export type ServiceListQuery = z.infer<typeof ServiceListSchema>;
