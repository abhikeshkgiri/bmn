import { z } from 'zod';

function isHttpUrl(value: string): boolean {
  if (!value) return true;
  try {
    const protocol = new URL(value).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export const CustomerProfileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  email: z.string().trim().email().max(160).optional().or(z.literal('')),
  avatar: z.string().url().max(500).refine(isHttpUrl, 'Avatar URL must use HTTP or HTTPS').optional().or(z.literal('')),
  notificationPreferences: z.object({
    inApp: z.boolean(),
    push: z.boolean(),
  }).strict().optional(),
}).strict().refine((profile) => Object.keys(profile).length > 0, 'Provide at least one profile field to update');

export const CustomerAddressSchema = z.object({
  label: z.string().trim().min(1).max(40),
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(20).optional(),
  addressLine1: z.string().trim().min(2).max(200),
  addressLine2: z.string().trim().max(200).optional(),
  area: z.string().trim().max(100).optional(),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().min(3).max(12),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().default(false),
}).strict().refine(
  (address) => (address.latitude === undefined) === (address.longitude === undefined),
  'Latitude and longitude must be provided together',
);

export type CustomerProfileUpdate = z.infer<typeof CustomerProfileUpdateSchema>;
export type CustomerAddressInput = z.infer<typeof CustomerAddressSchema>;
