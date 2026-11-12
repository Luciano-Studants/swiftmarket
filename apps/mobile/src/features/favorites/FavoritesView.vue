<script setup>
import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import AppHeader from '@/components/AppHeader.vue';
import ProductGrid from '@/components/ProductGrid.vue';
import { useFavoritesStore } from '@/stores/favorites.js';

const { t } = useI18n();
const favorites = useFavoritesStore();

// Atualiza a lista ao abrir (preços/estoque podem ter mudado); falha de rede mantém a lista atual.
onMounted(() => favorites.load().catch(() => {}));
</script>

<template>
  <div>
    <AppHeader :title="t('favorites.title')" />
    <ProductGrid :products="favorites.products" :empty-text="t('favorites.empty')" />
  </div>
</template>
