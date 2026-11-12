<script setup>
import { discountPercent, effectiveCents, formatMoney } from '@swiftmarket/shared';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import AppHeader from '@/components/AppHeader.vue';
import StarRating from '@/components/StarRating.vue';
import { useProductActions } from '@/composables/useProductActions.js';
import { errorMessage } from '@/core/errors.js';
import { isAvailable, productBackground } from '@/core/product.js';
import { catalogApi } from '@/features/catalog/catalog.api.js';
import ReviewsSection from '@/features/catalog/ReviewsSection.vue';
import { useFavoritesStore } from '@/stores/favorites.js';

const { t } = useI18n();
const route = useRoute();
const favorites = useFavoritesStore();
const { addToCart, toggleFavorite } = useProductActions();

const product = ref(null);
const loading = ref(true);
const error = ref('');

const available = computed(() => product.value && isAvailable(product.value));
const discount = computed(() => (product.value ? discountPercent(product.value) : 0));
const isFavorite = computed(() => product.value && favorites.isFavorite(product.value.id));

async function load(id) {
  loading.value = true;
  error.value = '';
  product.value = null;

  try {
    product.value = await catalogApi.get(id);
  } catch (caught) {
    error.value = errorMessage(caught);
  } finally {
    loading.value = false;
  }
}

/** A seção de avaliações mudou a nota: reflete no topo sem recarregar a página. */
function onReviewsChanged(summary) {
  if (!product.value) return;
  product.value.rating = summary.average;
  product.value.ratingCount = summary.count;
}

// Reage também a navegar de um produto para outro (mesma tela, id diferente).
watch(() => route.params.id, load, { immediate: true });
</script>

<template>
  <div>
    <AppHeader :title="t('product.title')" back />

    <div v-if="loading" class="spinner" role="progressbar"></div>
    <p v-else-if="error" class="error-text" role="alert">{{ error }}</p>

    <template v-else-if="product">
      <div class="detail__visual" :style="productBackground(product)">
        <span v-if="!product.imageUrl">{{ product.emoji }}</span>
      </div>

      <section class="page-section">
        <span class="badge">{{ t(`categories.${product.category}`).toUpperCase() }}</span>
        <h2 class="detail__name">{{ product.name }}</h2>

        <div class="mono detail__meta">
          <template v-if="product.ratingCount">
            <StarRating :value="product.rating" />
            {{ product.rating.toFixed(1) }} ({{ product.ratingCount }})
          </template>
          <template v-else>{{ t('reviews.new') }}</template>
          ·
          {{ available ? t('common.inStock', { count: product.stock }) : t('common.unavailable') }}
        </div>

        <div class="mono detail__price">
          {{ formatMoney(effectiveCents(product)) }}
          <s v-if="discount">{{ formatMoney(product.priceCents) }}</s>
          <span v-if="discount" class="badge badge--danger">-{{ discount }}%</span>
        </div>

        <p class="detail__description">{{ product.description }}</p>

        <div class="detail__actions">
          <button
            type="button"
            class="btn btn--outline detail__fav"
            :aria-label="t('nav.favorites')"
            @click="toggleFavorite(product)"
          >
            {{ isFavorite ? '♥' : '♡' }}
          </button>
          <button type="button" class="btn" :disabled="!available" @click="addToCart(product)">
            {{ available ? t('common.addToCart') : t('common.unavailable') }}
          </button>
        </div>
      </section>

      <ReviewsSection :key="product.id" :product-id="product.id" @changed="onReviewsChanged" />
    </template>
  </div>
</template>

<style scoped>
.detail__visual {
  display: grid;
  place-items: center;
  height: 260px;
  font-size: 96px;
  background-size: cover;
  background-position: center;
}

.detail__name {
  margin: 8px 0 4px;
}

.detail__meta {
  font-size: 12px;
  color: var(--muted);
}

.detail__price {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 12px 0;
  font-size: 22px;
  font-weight: 700;
}

.detail__price s {
  font-size: 13px;
  font-weight: 400;
  color: var(--muted);
}

.detail__description {
  color: var(--muted);
}

.detail__actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.detail__fav {
  width: 56px;
}
</style>
