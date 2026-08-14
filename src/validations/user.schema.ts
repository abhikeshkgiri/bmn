import { z } from 'zod';
import { USER_ROLES, USER_ROLE_ARRAY } from '@/constants/roles';

export const UserCreateSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  email: z.string().email().optional(),
  role: z.enum(USER_ROLE_ARRAY as [string, ...string[]]).default(USER_ROLES.CUSTOMER),
});

export const UserUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  avatar: z.string().optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
});

export type UserCreateInput = z.infer<typeof UserCreateSchema>;
export type UserUpdateInput = z.infer<typeof UserUpdateSchema>;
