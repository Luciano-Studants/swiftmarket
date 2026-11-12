import { z } from 'zod';
import { COUPON_TYPES, MAX_COUPON_PERCENT } from '@swiftmarket/shared';

export const couponIdParams = z.object({ id: z.coerce.number().int().positive() });

/** Código em caixa alta, sem espaços (o banco compara sem diferenciar maiúsculas). */
const code = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9_-]{3,30}$/)
  .transform((value) => value.toUpperCase());

const fields = {
  type: z.enum(Object.values(COUPON_TYPES)),
  value: z.number().int().min(1).max(100_000_000),
  minSubtotalCents: z.number().int().min(0).max(100_000_000).default(0),
  maxUses: z.number().int().min(1).max(1_000_000).nullable().default(null),
  expiresAt: z.iso.datetime().nullable().default(null),
  active: z.boolean().default(true),
};

/** Percentual vai de 1 a 90 (nunca 100%: o pedido não pode sair de graça por engano). */
const percentRule = (data) =>
  data.type !== COUPON_TYPES.PERCENT || data.value <= MAX_COUPON_PERCENT;
const percentIssue = { path: ['value'], message: 'PERCENT_TOO_HIGH' };

export const couponCreateBody = z.object({ code, ...fields }).refine(percentRule, percentIssue);
export const couponUpdateBody = z.object(fields).refine(percentRule, percentIssue);

export const couponsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** Código digitado pelo cliente: normaliza para a comparação. */
export const couponCodeField = z
  .string()
  .trim()
  .min(1)
  .max(30)
  .transform((value) => value.toUpperCase());
