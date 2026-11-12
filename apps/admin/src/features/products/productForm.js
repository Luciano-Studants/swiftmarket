import { PRODUCT_STATUS } from '@swiftmarket/shared';

import { centsToInput, parseMoneyToCents } from '@/core/money.js';

export const MAX_IMAGE_BYTES = 1_500_000;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Valores iniciais do formulário de um produto novo. */
export const emptyForm = () => ({
  name: '',
  description: '',
  category: 'electronics',
  status: PRODUCT_STATUS.ACTIVE,
  price: '',
  promo: '',
  stock: '0',
  featured: false,
  recommended: false,
  imageUrl: null,
});

/** Produto da API -> valores do formulário (dinheiro em texto "159,50"). */
export const formFromProduct = (product) => ({
  name: product.name,
  description: product.description,
  category: product.category,
  status: product.status,
  price: centsToInput(product.priceCents),
  promo: centsToInput(product.promoCents),
  stock: String(product.stock),
  featured: product.featured,
  recommended: product.recommended,
  imageUrl: product.imageUrl,
});

/**
 * Valida o formulário e monta o corpo da API.
 * @returns {{ body: object | null, errors: Record<string, string> }}  chaves de erro = i18n `products.form.errors.*`
 */
export function buildPayload(form) {
  const errors = {};

  const name = form.name.trim();
  if (name.length < 2) errors.name = 'name';

  const priceCents = parseMoneyToCents(form.price);
  if (!priceCents || priceCents < 1) errors.price = 'price';

  let promoCents = 0;
  if (String(form.promo).trim() !== '') {
    promoCents = parseMoneyToCents(form.promo);
    if (!promoCents || (priceCents && promoCents >= priceCents)) errors.promo = 'promo';
  }

  const stockText = String(form.stock).trim();
  if (!/^\d+$/.test(stockText)) errors.stock = 'stock';

  if (Object.keys(errors).length) return { body: null, errors };

  return {
    errors,
    body: {
      name,
      description: form.description.trim(),
      category: form.category,
      status: form.status,
      priceCents,
      promoCents,
      stock: Number(stockText),
      featured: form.featured,
      recommended: form.recommended,
      imageUrl: form.imageUrl,
    },
  };
}
