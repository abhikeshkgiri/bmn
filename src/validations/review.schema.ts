import { z } from 'zod';
import { REVIEW_TARGET } from '@/constants/reviews';

const ratingSchema = z.number().int().min(1).max(5);
const reviewTextSchema = z.string()
  .trim()
  .max(500)
  .refine((value) => value.length === 0 || value.length >= 10, 'Review must be at least 10 characters');

export const ReviewIdSchema = z.string().regex(/^[a-f\d]{24}$/i);

export const ReviewCreateSchema = z.object({
  bookingId: ReviewIdSchema,
  rating: ratingSchema,
  review: reviewTextSchema.optional(),
  target: z.enum([
    REVIEW_TARGET.SALON,
    REVIEW_TARGET.BARBER,
    REVIEW_TARGET.SERVICE,
  ]),
}).strict();

export const ReviewUpdateSchema = z.object({
  rating: ratingSchema.optional(),
  review: reviewTextSchema.optional(),
}).strict().refine((input) => input.rating !== undefined || input.review !== undefined, {
  message: 'Provide a rating or review text to update',
});

const paginationValue = (fallback: number, maximum: number) => z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(1).max(maximum))
  .optional()
  .transform((value) => value ?? fallback);

export const ReviewListQuerySchema = z.object({
  page: paginationValue(1, 10000),
  limit: paginationValue(10, 50),
});
