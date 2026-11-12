import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { favoritesApi } from '@/features/favorites/favorites.api.js';

/** Favoritos do usuário (fonte da verdade é a API; a UI atualiza de forma otimista). */
export const useFavoritesStore = defineStore('favorites', () => {
  const products = ref([]);

  const ids = computed(() => new Set(products.value.map((product) => product.id)));
  const count = computed(() => products.value.length);

  const isFavorite = (productId) => ids.value.has(productId);

  async function load() {
    products.value = await favoritesApi.list();
  }

  function reset() {
    products.value = [];
  }

  /** Alterna o favorito; se a API falhar, desfaz a mudança e repassa o erro. */
  async function toggle(product) {
    const previous = products.value;
    const wasFavorite = isFavorite(product.id);

    products.value = wasFavorite
      ? previous.filter((item) => item.id !== product.id)
      : [product, ...previous];

    try {
      await (wasFavorite ? favoritesApi.remove(product.id) : favoritesApi.add(product.id));
    } catch (error) {
      products.value = previous;
      throw error;
    }
  }

  return { products, count, isFavorite, load, reset, toggle };
});
