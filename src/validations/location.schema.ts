/**
 * Location validation schema
 */

import { z } from 'zod';

export const CoordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const LocationSearchSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius: z.number().min(1).max(100), // km
  serviceId: z.string().optional(),
  limit: z.number().min(1).max(50).default(20),
  page: z.number().min(1).default(1),
});

export type CoordinatesInput = z.infer<typeof CoordinatesSchema>;
export type LocationSearchInput = z.infer<typeof LocationSearchSchema>;
