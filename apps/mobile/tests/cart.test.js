import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@/features/catalog/catalog.api.js', () => ({ catalogApi: { list: vi.fn() } }));

import { catalogApi } from '@/features/catalog/catalog.api.js';
import { useCartStore } from '@/stores/cart.js';

const product = (overrides = {}) => ({
  id: 1,
  name: 'Luminária',
  emoji: '🏠',
  hue: 45,
  imageUrl: null,
  priceCents: 4500,
  promoCents: 0,
  stock: 5,
  status: 'active',
  ...overrides,
});

let cart;

beforeEach(() => {
  localStorage.clear();
  setActivePinia(createPinia());
  cart = useCartStore();
  vi.clearAllMocks();
});

describe('carrinho: adicionar e quantidades', () => {
  test('soma quantidades do mesmo produto e respeita o estoque', () => {
    expect(cart.add(product()).ok).toBe(true);
    expect(cart.add(product(), 4).ok).toBe(true);
    expect(cart.count).toBe(5);

    const overflow = cart.add(product());
    expect(overflow).toEqual({ ok: false, available: 5 });
    expect(cart.count).toBe(5);
  });

  test('não adiciona produto esgotado ou indisponível', () => {
    expect(cart.add(product({ stock: 0 })).ok).toBe(false);
    expect(cart.add(product({ status: 'out_of_stock' })).ok).toBe(false);
    expect(cart.items).toHaveLength(0);
  });

  test('setQuantity abaixo de 1 remove o item; acima do estoque é recusado', () => {
    cart.add(product());
    expect(cart.setQuantity(1, 9)).toEqual({ ok: false, available: 5 });
    expect(cart.setQuantity(1, 3).ok).toBe(true);
    expect(cart.count).toBe(3);

    cart.setQuantity(1, 0);
    expect(cart.items).toHaveLength(0);
  });
});

describe('carrinho: totais (mesmas regras do servidor)', () => {
  test('usa preço promocional, frete e imposto de 8,5%', () => {
    cart.add(product({ id: 1, priceCents: 4500 }), 2); // 9.000
    cart.add(product({ id: 2, priceCents: 12900, promoCents: 9900 }), 1); // 9.900

    expect(cart.totals.subtotalCents).toBe(18900);
    expect(cart.totals.shippingCents).toBe(1200);
    expect(cart.totals.taxCents).toBe(1607); // round(18900 * 0,085)
    expect(cart.totals.totalCents).toBe(18900 + 1200 + 1607);
  });

  test('frete grátis a partir de R$ 500,00', () => {
    cart.add(product({ priceCents: 50000 }));
    expect(cart.totals.shippingCents).toBe(0);
  });
});

describe('carrinho: persistência', () => {
  test('salva no aparelho e restaura no hydrate', async () => {
    cart.add(product(), 2);
    await Promise.resolve();

    setActivePinia(createPinia());
    const restored = useCartStore();
    await restored.hydrate();

    expect(restored.count).toBe(2);
    expect(restored.items[0].product.name).toBe('Luminária');
  });
});

describe('carrinho: sincronização com a API', () => {
  test('atualiza preço, ajusta estoque e remove item que saiu do catálogo', async () => {
    cart.add(product({ id: 1, stock: 5 }), 4);
    cart.add(product({ id: 2, stock: 5 }), 1);
    cart.add(product({ id: 3, stock: 5 }), 1);

    catalogApi.list.mockResolvedValue({
      items: [
        product({ id: 1, stock: 2, priceCents: 4000 }), // estoque caiu e preço mudou
        product({ id: 2, stock: 0, status: 'out_of_stock' }), // esgotou
        // id 3 não veio: saiu do catálogo
      ],
    });

    const changed = await cart.refresh();

    expect(changed).toBe(true);
    expect(catalogApi.list).toHaveBeenCalledWith({ ids: [1, 2, 3], limit: 50 });
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(2);
    expect(cart.items[0].product.priceCents).toBe(4000);
  });

  test('sem mudanças devolve false', async () => {
    cart.add(product(), 1);
    catalogApi.list.mockResolvedValue({ items: [product()] });
    expect(await cart.refresh()).toBe(false);
  });
});
