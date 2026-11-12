<script setup>
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import BrandMark from '@/components/BrandMark.vue';
import { useAuthStore } from '@/stores/auth.js';
import { useThemeStore } from '@/stores/theme.js';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const theme = useThemeStore();

const NAV = [
  { key: 'dashboard', icon: '▦', to: { name: 'dashboard' } },
  { key: 'products', icon: '📦', to: { name: 'products' } },
  { key: 'orders', icon: '🧾', to: { name: 'orders' } },
  { key: 'reviews', icon: '⭐', to: { name: 'reviews' } },
  { key: 'coupons', icon: '🏷️', to: { name: 'coupons' } },
  { key: 'users', icon: '👥', to: { name: 'users' } },
];

function logout() {
  auth.clear();
  router.replace({ name: 'login' });
}
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="sidebar__brand">
        <div class="sidebar__logo"><BrandMark :size="26" /></div>
        <div>
          <div class="sidebar__name mono">{{ t('shell.brand') }}</div>
          <div class="sidebar__sub">{{ t('shell.subtitle') }}</div>
        </div>
      </div>

      <nav class="sidebar__nav" :aria-label="t('nav.main')">
        <RouterLink
          v-for="item in NAV"
          :key="item.key"
          :to="item.to"
          class="sidebar__link"
          :class="{ 'is-active': route.meta.nav === item.key }"
          :aria-current="route.meta.nav === item.key ? 'page' : undefined"
        >
          <span aria-hidden="true">{{ item.icon }}</span>
          {{ t(`nav.${item.key}`) }}
        </RouterLink>
      </nav>

      <div class="sidebar__footer">
        <div class="sidebar__user">
          <b>{{ auth.user?.name }}</b>
          <span class="mono">{{ auth.user?.email }}</span>
        </div>

        <RouterLink :to="{ name: 'change-password' }" class="sidebar__pw">
          {{ t('shell.changePassword') }}
        </RouterLink>

        <div class="sidebar__buttons">
          <button
            type="button"
            class="sidebar__btn"
            :aria-label="theme.mode === 'dark' ? t('shell.toLight') : t('shell.toDark')"
            :title="t('shell.theme')"
            @click="theme.toggle()"
          >
            {{ theme.mode === 'dark' ? '☀' : '☾' }}
          </button>
          <button type="button" class="sidebar__btn sidebar__btn--wide" @click="logout">
            {{ t('shell.logout') }}
          </button>
        </div>
      </div>
    </aside>

    <main class="main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  min-height: 100vh;
}

.sidebar {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
  height: 100vh;
  padding: 20px 14px;
  background: var(--header-dark);
  color: #cbd5e1;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 6px;
}

.sidebar__logo {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  color: var(--accent);
  font-size: 18px;
}

.sidebar__name {
  font-weight: 800;
  font-size: 14px;
  color: var(--accent);
}

.sidebar__sub {
  font-size: 11px;
  color: #94a3b8;
}

.sidebar__nav {
  display: grid;
  gap: 4px;
}

.sidebar__link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  font-weight: 600;
  color: #cbd5e1;
  transition: background 0.15s;
}

.sidebar__link:hover {
  background: #ffffff12;
}

.sidebar__link.is-active {
  background: var(--gradient);
  color: #fff;
}

.sidebar__footer {
  display: grid;
  gap: 12px;
  margin-top: auto;
}

.sidebar__user {
  display: grid;
  padding: 0 6px;
  font-size: 12px;
  color: #fff;
  overflow: hidden;
}

.sidebar__user span {
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  color: #94a3b8;
}

.sidebar__pw {
  display: block;
  margin: 0 0 10px;
  font-size: 12px;
  color: #94a3b8;
  text-decoration: underline;
}

.sidebar__pw:hover {
  color: #fff;
}

.sidebar__buttons {
  display: flex;
  gap: 8px;
}

.sidebar__btn {
  padding: 8px 12px;
  border: 1px solid #ffffff2a;
  border-radius: var(--radius-md);
  background: transparent;
  color: #e5e7eb;
}

.sidebar__btn--wide {
  flex: 1;
  font-weight: 600;
}

.sidebar__btn:hover {
  background: #ffffff12;
}

.main {
  min-width: 0;
  max-width: 1280px;
  padding: 32px 36px 56px;
}

@media (max-width: 860px) {
  .shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    height: auto;
  }

  .sidebar__nav {
    display: flex;
    flex-wrap: wrap;
    order: 3;
    width: 100%;
  }

  .sidebar__footer {
    display: flex;
    align-items: center;
    margin: 0 0 0 auto;
  }

  .sidebar__user {
    display: none;
  }

  .main {
    padding: 20px 16px 40px;
  }
}
</style>
