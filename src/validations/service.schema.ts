import { z } from 'zod';
import { SERVICE_CATEGORY_ARRAY } from '@/constants/services';

export const ServiceCreateSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  category: z.enum(SERVICE_CATEGORY_ARRAY as [string, ...string[]]),
  image: z.string().optional(),
  duration: z.number().min(15).max(480),
  price: z.number().min(0),
  discountPrice: z.number().min(0).optional(),
});

export const ServiceUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  category: z.enum(SERVICE_CATEGORY_ARRAY as [string, ...string[]]).optional(),
  image: z.string().optional(),
  duration: z.number().min(15).max(480).optional(),
  price: z.number().min(0).optional(),
  discountPrice: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export type ServiceCreateInput = z.infer<typeof ServiceCreateSchema>;
export type ServiceUpdateInput = z.infer<typeof ServiceUpdateSchema>;
