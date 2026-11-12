import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/jetbrains-mono/800.css';
import '@swiftmarket/shared/tokens.css';
import '@/styles/base.css';
import '@/styles/components.css';

import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from '@/App.vue';
import { configureHttp } from '@/core/http.js';
import { setupBackButton } from '@/core/platform.js';
import { endSession } from '@/core/session.js';
import { i18n } from '@/i18n/index.js';
import { TAB_ROUTES, router } from '@/router/index.js';
import { useAuthStore } from '@/stores/auth.js';
import { useCartStore } from '@/stores/cart.js';
import { useFavoritesStore } from '@/stores/favorites.js';
import { useThemeStore } from '@/stores/theme.js';
import { useUiStore } from '@/stores/ui.js';

async function boot() {
  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia).use(i18n);

  const auth = useAuthStore();
  const cart = useCartStore();
  const favorites = useFavoritesStore();
  const theme = useThemeStore();
  const ui = useUiStore();

  configureHttp({
    getToken: () => auth.token,
    onUnauthorized: () => endSession(router),
  });

  // Restaura tema, carrinho e sessão ANTES da primeira navegação (o guard precisa do login).
  await Promise.all([theme.hydrate(), cart.hydrate()]);
  await auth.restore();
  if (auth.isAuthenticated) favorites.load().catch(() => {});

  setupBackButton({ router, ui, tabRoutes: TAB_ROUTES });

  app.use(router);
  app.mount('#app');
}

boot();
