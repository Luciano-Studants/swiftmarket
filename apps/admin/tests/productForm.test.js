import { describe, expect, test } from 'vitest';

import { buildPayload, emptyForm, formFromProduct } from '@/features/products/productForm.js';

const valid = (overrides = {}) => ({
  ...emptyForm(),
  name: 'Teclado Mecânico',
  price: '159,50',
  stock: '12',
  ...overrides,
});

describe('formulário de produto', () => {
  test('monta o corpo da API em centavos', () => {
    const { body, errors } = buildPayload(
      valid({ promo: '129,90', featured: true, description: '  Switches táteis  ' }),
    );

    expect(errors).toEqual({});
    expect(body).toMatchObject({
      name: 'Teclado Mecânico',
      description: 'Switches táteis',
      priceCents: 15950,
      promoCents: 12990,
      stock: 12,
      featured: true,
      status: 'active',
      imageUrl: null,
    });
  });

  test('promoção em branco vira 0', () => {
    expect(buildPayload(valid({ promo: '' })).body.promoCents).toBe(0);
  });

  test('rejeita nome curto, preço ausente/zero e estoque inválido', () => {
    const result = buildPayload(valid({ name: 'A', price: '0', stock: '-1' }));

    expect(result.body).toBeNull();
    expect(Object.keys(result.errors).sort()).toEqual(['name', 'price', 'stock']);
  });

  test.each([['1,5'], ['abc'], ['']])('estoque %j não é inteiro >= 0', (stock) => {
    expect(buildPayload(valid({ stock })).errors.stock).toBe('stock');
  });

  test('promoção precisa ser menor que o preço', () => {
    expect(buildPayload(valid({ promo: '159,50' })).errors.promo).toBe('promo');
    expect(buildPayload(valid({ promo: '200' })).errors.promo).toBe('promo');
    expect(buildPayload(valid({ promo: 'xx' })).errors.promo).toBe('promo');
    expect(buildPayload(valid({ promo: '159,49' })).errors.promo).toBeUndefined();
  });

  test('formFromProduct converte centavos de volta para texto', () => {
    const form = formFromProduct({
      name: 'Tênis',
      description: '',
      category: 'fashion',
      status: 'active',
      priceCents: 8900,
      promoCents: 6900,
      stock: 30,
      featured: false,
      recommended: true,
      imageUrl: '/uploads/a.png',
    });

    expect(form).toMatchObject({ price: '89,00', promo: '69,00', stock: '30', recommended: true });
    expect(buildPayload(form).body.priceCents).toBe(8900);
  });
});
