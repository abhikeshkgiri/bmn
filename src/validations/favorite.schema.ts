import { z } from 'zod';

export const FavoriteInputSchema = z.object({
  targetType: z.enum(['SALON', 'BARBER']),
  targetId: z.string().regex(/^[a-f\d]{24}$/i),
});

export const FavoriteIdSchema = z.string().regex(/^[a-f\d]{24}$/i);

export type FavoriteInput = z.infer<typeof FavoriteInputSchema>;
