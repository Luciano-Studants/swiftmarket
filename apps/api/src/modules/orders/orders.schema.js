import { z } from 'zod';
import { COMMERCE, ORDER_STATUS, PAYMENT_METHODS } from '@swiftmarket/shared';

import { couponCodeField } from '../coupons/coupons.schema.js';

const orderItems = z
  .array(
    z.object({
      productId: z.number().int().positive(),
      quantity: z.number().int().min(1).max(COMMERCE.MAX_QTY_PER_ITEM),
    }),
  )
  .min(1)
  .max(50);

/** Pré-visualização: itens + cupom opcional; devolve totais sem criar o pedido. */
export const previewOrderBody = z.object({
  items: orderItems,
  couponCode: couponCodeField.optional(),
});

export const createOrderBody = z.object({
  items: orderItems,
  paymentMethod: z.enum(PAYMENT_METHODS),
  couponCode: couponCodeField.optional(),
  // Opcional: se ausente, usa o endereço salvo no perfil.
  address: z.string().trim().min(5).max(300).optional(),
});

export const orderIdParams = z.object({ id: z.string().min(3).max(32) });

export const statusBody = z.object({ status: z.enum(Object.values(ORDER_STATUS)) });

export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const adminOrdersQuery = pageQuery.extend({
  status: z.enum(Object.values(ORDER_STATUS)).optional(),
});
