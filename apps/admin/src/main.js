import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/jetbrains-mono/800.css';
import '@swiftmarket/shared/tokens.css';
import '@/styles/admin.css';

import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from '@/App.vue';
import { configureHttp } from '@/core/http.js';
import { i18n } from '@/i18n/index.js';
import { router } from '@/router/index.js';
import { useAuthStore } from '@/stores/auth.js';
import { useThemeStore } from '@/stores/theme.js';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia).use(i18n);

const auth = useAuthStore();
useThemeStore().hydrate();
auth.restore();

configureHttp({
  getToken: () => auth.token,
  // Token expirado ou conta removida: volta para o login.
  onUnauthorized: () => {
    auth.clear();
    router.replace({ name: 'login' });
  },
});

app.use(router);
app.mount('#app');
