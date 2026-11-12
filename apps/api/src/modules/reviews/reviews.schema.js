import { z } from 'zod';
import { REVIEW } from '@swiftmarket/shared';

export const productIdParams = z.object({ id: z.coerce.number().int().positive() });
export const productParams = z.object({ productId: z.coerce.number().int().positive() });
export const reviewIdParams = z.object({ id: z.coerce.number().int().positive() });

export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const reviewBody = z.object({
  rating: z.number().int().min(REVIEW.MIN_RATING).max(REVIEW.MAX_RATING),
  comment: z.string().trim().max(REVIEW.MAX_COMMENT_LENGTH).default(''),
});

export const adminReviewsQuery = pageQuery.extend({
  status: z.enum(Object.values(REVIEW.STATUS)).optional(),
});

export const moderationBody = z.object({ status: z.enum(Object.values(REVIEW.STATUS)) });
