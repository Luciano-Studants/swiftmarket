import { COMMERCE, COUPON_TYPES } from './constants.js';

/**
 * Fonte única das regras de preço, frete e imposto.
 * A API recalcula tudo com estas funções ao criar um pedido; os apps usam as
 * mesmas funções apenas para exibição (nunca confiar no total vindo do cliente).
 */

/** Preço efetivo em centavos: promoção quando existir, senão o preço cheio. */
export function effectiveCents(product) {
  return product.promoCents > 0 ? product.promoCents : product.priceCents;
}

/** Percentual de desconto arredondado (0 quando não há promoção). */
export function discountPercent(product) {
  if (!(product.promoCents > 0) || product.priceCents <= 0) return 0;
  return Math.round((1 - product.promoCents / product.priceCents) * 100);
}

/**
 * Desconto de um cupom sobre o subtotal (nunca maior que o subtotal; o frete não é descontado).
 * @param {{ type: string, value: number }} coupon  percent: 1..90 | fixed: centavos
 */
export function calcDiscount(coupon, subtotalCents) {
  if (!coupon || subtotalCents <= 0) return 0;

  const raw =
    coupon.type === COUPON_TYPES.PERCENT
      ? Math.floor((subtotalCents * coupon.value) / 100)
      : coupon.value;

  return Math.max(0, Math.min(raw, subtotalCents));
}

/**
 * Totais do pedido. Com desconto: o imposto incide sobre o valor já descontado e o frete
 * grátis considera o valor descontado (o cliente precisa gastar de fato o mínimo).
 * @param {Array<{ unitCents: number, quantity: number }>} lines
 * @param {number} [discountCents]
 * @returns {{ subtotalCents: number, discountCents: number, shippingCents: number,
 *             taxCents: number, totalCents: number }}
 */
export function calcTotals(lines, discountCents = 0) {
  const subtotalCents = lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0);
  const discount = Math.min(Math.max(0, discountCents), subtotalCents);
  const taxable = subtotalCents - discount;

  const isFreeShipping = subtotalCents === 0 || taxable >= COMMERCE.FREE_SHIPPING_FROM_CENTS;
  const shippingCents = isFreeShipping ? 0 : COMMERCE.SHIPPING_CENTS;
  const taxCents = Math.round(taxable * COMMERCE.TAX_RATE);

  return {
    subtotalCents,
    discountCents: discount,
    shippingCents,
    taxCents,
    totalCents: taxable + shippingCents + taxCents,
  };
}
