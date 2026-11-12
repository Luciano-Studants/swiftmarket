<script setup>
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AppHeader from '@/components/AppHeader.vue';
import LogoutSheet from '@/components/LogoutSheet.vue';
import { initials } from '@/core/product.js';
import { useAuthStore } from '@/stores/auth.js';
import { useFavoritesStore } from '@/stores/favorites.js';

const { t } = useI18n();
const auth = useAuthStore();
const favorites = useFavoritesStore();

const logoutOpen = ref(false);

const isAdmin = computed(() => auth.user?.role === 'admin');
const ordersCount = computed(() => auth.profile?.stats?.orders ?? 0);

const MENU = [
  { icon: '👤', label: 'profile.edit', to: { name: 'profile-edit' } },
  { icon: '🕘', label: 'profile.history', to: { name: 'orders' } },
  { icon: '♡', label: 'profile.favoritesLink', to: { name: 'favorites' } },
  { icon: '⚙', label: 'profile.settings', to: { name: 'settings' } },
];

// Atualiza contagens (pedidos); sem rede, mantém o que já está salvo.
onMounted(() => auth.loadProfile().catch(() => {}));
</script>

<template>
  <div>
    <AppHeader :title="t('profile.title')" :show-cart="false" />

    <section class="page-section">
      <div class="profile__identity">
        <div class="profile__avatar mono">{{ initials(auth.user?.name) }}</div>
        <div>
          <b class="profile__name">{{ auth.user?.name }}</b>
          <div class="mono profile__email">{{ auth.user?.email }}</div>
          <span class="badge">{{ isAdmin ? t('profile.roleAdmin') : t('profile.roleUser') }}</span>
        </div>
      </div>

      <div class="stats profile__stats">
        <div class="card">
          <span class="eyebrow">{{ t('profile.orders') }}</span>
          <b>{{ ordersCount }}</b>
        </div>
        <div class="card">
          <span class="eyebrow">{{ t('profile.favorites') }}</span>
          <b>{{ String(favorites.count).padStart(2, '0') }}</b>
        </div>
      </div>

      <span class="eyebrow">{{ t('profile.account') }}</span>
      <nav class="card profile__menu">
        <RouterLink v-for="item in MENU" :key="item.label" :to="item.to" class="row profile__link">
          <span>{{ item.icon }}</span>
          <span class="row__body">{{ t(item.label) }}</span>
          <span>›</span>
        </RouterLink>
      </nav>

      <button type="button" class="btn btn--outline profile__logout" @click="logoutOpen = true">
        {{ t('profile.logout') }}
      </button>
    </section>

    <LogoutSheet v-model:open="logoutOpen" />
  </div>
</template>

<style scoped>
.profile__identity {
  display: flex;
  align-items: center;
  gap: 14px;
}

.profile__avatar {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: var(--radius-sm);
  background: var(--ink);
  color: var(--on-ink);
  font-size: 18px;
  font-weight: 800;
}

.profile__name {
  font-size: 17px;
}

.profile__email {
  font-size: 11px;
  color: var(--muted);
}

.profile__stats {
  padding: 16px 0;
  text-align: center;
}

.profile__menu {
  margin-top: 8px;
  padding: 0 14px;
}

.profile__link {
  padding: 14px 0;
  font-size: 13px;
}

.profile__logout {
  margin-top: 20px;
}
</style>
