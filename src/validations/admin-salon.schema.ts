import { z } from 'zod';

export const SalonApprovalDecisionSchema = z.object({
  salonId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid salon id'),
  isVerified: z.boolean(),
  reason: z.string().trim().max(1000).optional(),
}).strict().refine(
  (input) => input.isVerified || Boolean(input.reason),
  { message: 'A rejection reason is required', path: ['reason'] },
);

export const AdminSalonStatusSchema = z.object({
  action: z.literal('status'),
  salonId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid salon id'),
  isActive: z.boolean(),
}).strict();

export const SalonVerificationSchema = z.object({
  isVerified: z.boolean(),
}).strict();
