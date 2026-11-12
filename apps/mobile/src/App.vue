<script setup>
import { computed, watch } from 'vue';
import { useRoute } from 'vue-router';

import BottomNav from '@/components/BottomNav.vue';
import ToastHost from '@/components/ToastHost.vue';
import { useAuthStore } from '@/stores/auth.js';
import { useNotificationsStore } from '@/stores/notifications.js';

const route = useRoute();
const hasNav = computed(() => Boolean(route.meta.tab));

// Selo de notificações: consulta periódica só enquanto houver sessão.
const auth = useAuthStore();
const notifications = useNotificationsStore();
watch(
  () => auth.isAuthenticated,
  (logged) => (logged ? notifications.start() : notifications.stop()),
  { immediate: true },
);
</script>

<template>
  <div class="screen" :class="{ 'screen--with-nav': hasNav }">
    <RouterView v-slot="{ Component, route: current }">
      <component :is="Component" :key="current.path" class="page-enter" />
    </RouterView>
  </div>

  <BottomNav v-if="hasNav" />
  <ToastHost />
</template>

<style>
.screen {
  display: flex;
  flex-direction: column;
  flex: 1;
}

/* Espaço para a barra inferior flutuante não cobrir o conteúdo. */
.screen--with-nav {
  padding-bottom: 92px;
}
</style>
