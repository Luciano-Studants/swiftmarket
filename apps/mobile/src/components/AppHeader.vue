<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useAuthStore } from '@/stores/auth.js';
import { useCartStore } from '@/stores/cart.js';
import { useNotificationsStore } from '@/stores/notifications.js';

const props = defineProps({
  title: { type: String, default: '' },
  /** true = mostra seta de voltar (volta no histórico) */
  back: { type: Boolean, default: false },
  /** Cabeçalho escuro da tela inicial (mostra a marca em vez do título) */
  dark: { type: Boolean, default: false },
  showCart: { type: Boolean, default: true },
});

const { t } = useI18n();
const router = useRouter();
const cart = useCartStore();
const auth = useAuthStore();
const notifications = useNotificationsStore();

const cartCount = computed(() => cart.count);

function goBack() {
  // Sem histórico (ex.: abriu direto no link), cai no início.
  if (window.history.state?.back) router.back();
  else router.replace({ name: 'home' });
}
</script>

<template>
  <header class="app-header" :class="{ 'app-header--dark': props.dark }">
    <button
      v-if="props.back"
      class="icon-btn"
      type="button"
      :aria-label="t('common.back')"
      @click="goBack"
    >
      ←
    </button>

    <h1 class="app-header__title" :class="{ 'app-header__brand': props.dark }">
      {{ props.dark ? 'SWIFTMARKET' : props.title }}
    </h1>

    <slot name="right">
      <RouterLink
        v-if="props.showCart && auth.isAuthenticated"
        :to="{ name: 'notifications' }"
        class="icon-btn"
        :aria-label="t('notifications.title')"
      >
        🔔<span v-if="notifications.unread" class="badge-count">{{ notifications.unread }}</span>
      </RouterLink>

      <RouterLink
        v-if="props.showCart"
        :to="{ name: 'cart' }"
        class="icon-btn"
        :aria-label="t('nav.cart')"
      >
        🛒<span v-if="cartCount" class="badge-count">{{ cartCount }}</span>
      </RouterLink>
    </slot>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 9;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: calc(10px + env(safe-area-inset-top, 0px)) 12px 10px;
  border-bottom: 1px solid var(--line);
  background: color-mix(in srgb, var(--surface) 82%, transparent);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
}

.app-header--dark {
  border: 0;
  background: color-mix(in srgb, var(--header-dark) 88%, transparent);
  color: #fff;
}

.app-header__title {
  flex: 1;
  font: 700 16px var(--font-sans);
}

.app-header__brand {
  font: 800 16px var(--font-mono);
  color: var(--accent);
}

.icon-btn {
  display: grid;
  place-items: center;
}
</style>
