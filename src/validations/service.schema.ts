import { z } from 'zod';
import { SERVICE_CATEGORY_ARRAY } from '@/constants/services';

export const ServiceCreateSchema = z
  .object({
    salonId: z.string().min(24).max(24), // MongoDB ObjectId
    name: z.string().min(2).max(100),
    description: z.string().optional(),
    category: z.enum(SERVICE_CATEGORY_ARRAY as [string, ...string[]]),
    image: z.string().url().optional(),
    duration: z.number().int().min(5).max(480), // 5 to 480 minutes
    price: z.number().int().min(1), // At least 1 paise (₹0.01)
    discountPrice: z.number().int().min(0).optional(),
  })
  .refine((data) => {
    // If discountPrice is provided, ensure it's less than price
    if (data.discountPrice !== undefined && data.discountPrice > 0) {
      return data.discountPrice < data.price;
    }
    return true;
  }, {
    message: 'Discount price must be less than regular price',
    path: ['discountPrice'],
  });

export const ServiceUpdateSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    description: z.string().optional(),
    category: z.enum(SERVICE_CATEGORY_ARRAY as [string, ...string[]]).optional(),
    image: z.string().url().optional(),
    duration: z.number().int().min(5).max(480).optional(),
    price: z.number().int().min(1).optional(),
    discountPrice: z.number().int().min(0).optional(),
  })
  .refine(
    (data) => {
      // If both price and discountPrice are provided, validate the relationship
      if (data.price !== undefined && data.discountPrice !== undefined && data.discountPrice > 0) {
        return data.discountPrice < data.price;
      }
      return true;
    },
    {
      message: 'Discount price must be less than regular price',
      path: ['discountPrice'],
    }
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
