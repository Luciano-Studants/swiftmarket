<script setup>
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import { useCartStore } from '@/stores/cart.js';

const { t } = useI18n();
const route = useRoute();
const cart = useCartStore();

const TABS = [
  { key: 'home', icon: '⌂', route: 'home' },
  { key: 'catalog', icon: '▦', route: 'catalog' },
  { key: 'favorites', icon: '♡', route: 'favorites' },
  { key: 'cart', icon: '🛒', route: 'cart' },
  { key: 'profile', icon: '👤', route: 'profile' },
];
</script>

<template>
  <nav class="bottom-nav" aria-label="Navegação principal">
    <RouterLink
      v-for="tab in TABS"
      :key="tab.key"
      :to="{ name: tab.route }"
      class="icon-btn bottom-nav__tab"
      :class="{ 'is-active': route.meta.tab === tab.key }"
      :aria-label="t(`nav.${tab.key}`)"
    >
      {{ tab.icon }}
      <span v-if="tab.key === 'cart' && cart.count" class="badge-count">{{ cart.count }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(10px + env(safe-area-inset-bottom, 0px));
  z-index: 15;
  display: flex;
  justify-content: space-around;
  width: calc(100% - 28px);
  max-width: 402px;
  margin: 0 auto;
  padding: 4px 0;
  border: 1px solid var(--line);
  border-radius: 20px;
  background: color-mix(in srgb, var(--surface) 88%, transparent);
  box-shadow: var(--shadow-nav);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
}

.bottom-nav__tab {
  flex: 1;
  display: grid;
  place-items: center;
  width: auto;
  height: 44px; /* alvo de toque mínimo recomendado no Android */
  font-size: 20px;
}

.bottom-nav__tab.is-active {
  color: var(--accent);
}
</style>
