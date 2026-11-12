<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import AppShell from '@/components/AppShell.vue';
import ToastHost from '@/components/ToastHost.vue';

const route = useRoute();
const hasShell = computed(() => Boolean(route.meta.shell));
</script>

<template>
  <AppShell v-if="hasShell">
    <RouterView :key="route.path" />
  </AppShell>
  <RouterView v-else />

  <ToastHost />
</template>
