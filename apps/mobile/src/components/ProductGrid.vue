<script setup>
import { useI18n } from 'vue-i18n';

import ProductCard from '@/components/ProductCard.vue';

defineProps({
  products: { type: Array, required: true },
  loading: { type: Boolean, default: false },
  emptyText: { type: String, default: '' },
});

const { t } = useI18n();
</script>

<template>
  <div class="product-grid">
    <ProductCard v-for="product in products" :key="product.id" :product="product" />

    <p v-if="!products.length && !loading" class="empty-state">
      {{ emptyText || t('common.emptyProducts') }}
    </p>
  </div>
  <div v-if="loading && !products.length" class="spinner" role="progressbar"></div>
</template>
