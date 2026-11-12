import { useAuthStore } from '@/stores/auth.js';
import { useCartStore } from '@/stores/cart.js';
import { useFavoritesStore } from '@/stores/favorites.js';

/**
 * Encerra a sessão neste aparelho: limpa login, carrinho e favoritos
 * (evita que outra pessoa que use o aparelho veja dados do usuário anterior).
 */
export async function endSession(router) {
  await useAuthStore().clearSession();
  useCartStore().clear();
  useFavoritesStore().reset();
  await router.replace({ name: 'login' });
}
