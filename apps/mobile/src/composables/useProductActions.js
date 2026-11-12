import { useI18n } from 'vue-i18n';

import { errorMessage } from '@/core/errors.js';
import { useCartStore } from '@/stores/cart.js';
import { useFavoritesStore } from '@/stores/favorites.js';
import { useUiStore } from '@/stores/ui.js';

/** Ações de produto reutilizadas por card, detalhe e favoritos (com avisos ao usuário). */
export function useProductActions() {
  const { t } = useI18n();
  const cart = useCartStore();
  const favorites = useFavoritesStore();
  const ui = useUiStore();

  function addToCart(product) {
    const result = cart.add(product);

    if (result.ok) ui.showToast(t('common.addedToCart'));
    else if (result.available > 0)
      ui.showToast(t('common.onlyInStock', { count: result.available }));
    else ui.showToast(t('common.unavailable'));

    return result.ok;
  }

  async function toggleFavorite(product) {
    try {
      await favorites.toggle(product);
    } catch (error) {
      ui.showToast(errorMessage(error));
    }
  }

  return { addToCart, toggleFavorite };
}
