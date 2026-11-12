import { calcTotals, effectiveCents } from '@swiftmarket/shared';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { STORAGE_KEYS, storage } from '@/core/storage.js';
import { catalogApi } from '@/features/catalog/catalog.api.js';

/** Só guardamos o necessário para exibir o carrinho sem nova chamada à API. */
const snapshot = (product) => ({
  id: product.id,
  name: product.name,
  emoji: product.emoji,
  hue: product.hue,
  imageUrl: product.imageUrl,
  priceCents: product.priceCents,
  promoCents: product.promoCents,
  stock: product.stock,
  status: product.status,
});

const isPurchasable = (product) => product.status === 'active' && product.stock > 0;

/**
 * Carrinho local (no aparelho). O pedido só nasce no checkout e o servidor
 * recalcula tudo: os totais daqui servem apenas para exibição.
 */
export const useCartStore = defineStore('cart', () => {
  /** [{ product: snapshot, quantity }] */
  const items = ref([]);

  const count = computed(() => items.value.reduce((sum, item) => sum + item.quantity, 0));

  const lines = computed(() =>
    items.value.map((item) => ({
      product: item.product,
      quantity: item.quantity,
      unitCents: effectiveCents(item.product),
    })),
  );

  const totals = computed(() => calcTotals(lines.value));

  const persist = () => storage.set(STORAGE_KEYS.cart, items.value);

  async function hydrate() {
    const saved = await storage.get(STORAGE_KEYS.cart, []);
    items.value = Array.isArray(saved) ? saved : [];
  }

  const find = (productId) => items.value.find((item) => item.product.id === productId);

  /** @returns {{ ok: boolean, available?: number }} */
  function add(product, quantity = 1) {
    if (!isPurchasable(product)) return { ok: false, available: 0 };

    const existing = find(product.id);
    const next = (existing?.quantity ?? 0) + quantity;
    if (next > product.stock) return { ok: false, available: product.stock };

    if (existing) {
      existing.quantity = next;
      existing.product = snapshot(product);
    } else {
      items.value.push({ product: snapshot(product), quantity });
    }

    persist();
    return { ok: true };
  }

  /** @returns {{ ok: boolean, available?: number }} */
  function setQuantity(productId, quantity) {
    const item = find(productId);
    if (!item) return { ok: false };

    if (quantity < 1) {
      remove(productId);
      return { ok: true };
    }
    if (quantity > item.product.stock) return { ok: false, available: item.product.stock };

    item.quantity = quantity;
    persist();
    return { ok: true };
  }

  function remove(productId) {
    items.value = items.value.filter((item) => item.product.id !== productId);
    persist();
  }

  function clear() {
    items.value = [];
    persist();
  }

  /**
   * Sincroniza preço/estoque com a API: atualiza dados, remove itens que saíram
   * do catálogo ou esgotaram e ajusta quantidades acima do estoque.
   * @returns {Promise<boolean>} true se algo mudou (para avisar o usuário)
   */
  async function refresh() {
    if (!items.value.length) return false;

    const { items: fresh } = await catalogApi.list({
      ids: items.value.map((item) => item.product.id),
      limit: 50,
    });
    const byId = new Map(fresh.map((product) => [product.id, product]));

    let changed = false;
    const next = [];

    for (const item of items.value) {
      const product = byId.get(item.product.id);

      if (!product || !isPurchasable(product)) {
        changed = true;
        continue;
      }

      const quantity = Math.min(item.quantity, product.stock);
      const updated = snapshot(product);

      if (
        quantity !== item.quantity ||
        updated.priceCents !== item.product.priceCents ||
        updated.promoCents !== item.product.promoCents
      ) {
        changed = true;
      }

      next.push({ product: updated, quantity });
    }

    items.value = next;
    persist();
    return changed;
  }

  return { items, count, lines, totals, hydrate, add, setQuantity, remove, clear, refresh };
});
