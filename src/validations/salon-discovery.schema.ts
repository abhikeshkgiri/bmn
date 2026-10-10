import { z } from 'zod';
import { SERVICE_CATEGORY_ARRAY } from '@/constants/services';

const integerQuery = (fallback: string, maximum: number) => z
  .string()
  .regex(/^\d+$/, 'Must be a positive integer')
  .transform(Number)
  .pipe(z.number().int().min(1).max(maximum))
  .optional()
  .transform((value) => value ?? Number(fallback));

const optionalText = (maximum: number) => z
  .string()
  .trim()
  .max(maximum)
  .optional()
  .transform((value) => value || undefined);

export const SalonDiscoveryQuerySchema = z.object({
  page: integerQuery('1', 1000),
  limit: integerQuery('20', 50),
  city: optionalText(60),
  state: optionalText(60),
  area: optionalText(80),
  search: optionalText(100),
  serviceSearch: optionalText(80),
  category: z.enum(SERVICE_CATEGORY_ARRAY as [string, ...string[]]).optional(),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i).optional(),
  sortBy: z.enum(['newest', 'rating', 'name']).default('newest'),
});

export const NearbySalonQuerySchema = z.object({
  latitude: z.string().regex(/^-?\d+(?:\.\d+)?$/).transform(Number).pipe(z.number().min(-90).max(90)),
  longitude: z.string().regex(/^-?\d+(?:\.\d+)?$/).transform(Number).pipe(z.number().min(-180).max(180)),
  radius: z.string().regex(/^\d+(?:\.\d+)?$/).transform(Number).pipe(z.number().min(1).max(100)),
  page: integerQuery('1', 1000),
  limit: integerQuery('20', 50),
  city: optionalText(60),
  area: optionalText(80),
  search: optionalText(100),
  serviceId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  serviceSearch: optionalText(80),
  category: z.enum(SERVICE_CATEGORY_ARRAY as [string, ...string[]]).optional(),
});

export const SalonDetailParamSchema = z.string()
  .trim()
  .min(1)
  .max(120)
  .refine(
    (value) => /^[a-f\d]{24}$/i.test(value) || /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(value),
    'Must be a valid salon ID or slug',
  );

export function getSingleQueryParam(params: URLSearchParams, key: string): string | undefined {
  const values = params.getAll(key);
  if (values.length > 1) throw new Error(`Duplicate query parameter: ${key}`);
  return values[0];
}
