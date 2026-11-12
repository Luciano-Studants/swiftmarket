import { z } from 'zod';
import { CATEGORIES, PRODUCT_STATUS } from '@swiftmarket/shared';

/** Query strings chegam como texto: "1"/"true" viram true. */
const flag = z.enum(['1', 'true', '0', 'false']).transform((v) => v === '1' || v === 'true');

export const listQuery = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.enum(CATEGORIES).optional(),
  // Filtro por situação (útil no painel admin; na vitrine rascunhos nunca aparecem).
  status: z.enum(Object.values(PRODUCT_STATUS)).optional(),
  inStock: flag.optional(),
  featured: flag.optional(),
  recommended: flag.optional(),
  // Lista de ids ("1,2,3"): usada pelo app para sincronizar preço/estoque do carrinho.
  ids: z
    .string()
    .regex(/^\d+(,\d+){0,49}$/)
    .transform((value) => value.split(',').map(Number))
    .optional(),
  sort: z
    .enum(['featured', 'rating', 'price_asc', 'price_desc', 'name', 'newest'])
    .default('featured'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const idParams = z.object({ id: z.coerce.number().int().positive() });

export const productBody = z
  .object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(2000).default(''),
    category: z.enum(CATEGORIES),
    status: z.enum(Object.values(PRODUCT_STATUS)).default(PRODUCT_STATUS.ACTIVE),
    priceCents: z.number().int().min(1).max(100_000_000),
    promoCents: z.number().int().min(0).default(0),
    stock: z.number().int().min(0).max(1_000_000),
    featured: z.boolean().default(false),
    recommended: z.boolean().default(false),
    imageUrl: z.string().max(300).nullable().default(null),
    emoji: z.string().max(8).optional(),
    hue: z.number().int().min(0).max(359).optional(),
  })
  .refine((p) => p.promoCents === 0 || p.promoCents < p.priceCents, {
    path: ['promoCents'],
    message: 'PROMO_MUST_BE_LOWER',
  });
