<script setup>
import { discountPercent, effectiveCents, formatMoney } from '@swiftmarket/shared';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useProductActions } from '@/composables/useProductActions.js';
import { isAvailable, productBackground } from '@/core/product.js';
import { useFavoritesStore } from '@/stores/favorites.js';

const props = defineProps({
  product: { type: Object, required: true },
});

const { t } = useI18n();
const favorites = useFavoritesStore();
const { addToCart, toggleFavorite } = useProductActions();

const isFavorite = computed(() => favorites.isFavorite(props.product.id));
const discount = computed(() => discountPercent(props.product));
const available = computed(() => isAvailable(props.product));
const target = computed(() => ({ name: 'product', params: { id: props.product.id } }));
</script>

<template>
  <article class="product-card">
    <RouterLink :to="target" class="product-card__visual" :style="productBackground(product)">
      <button
        type="button"
        class="product-card__fav"
        :class="{ 'is-active': isFavorite }"
        :aria-label="t('nav.favorites')"
        @click.prevent.stop="toggleFavorite(product)"
      >
        {{ isFavorite ? '♥' : '♡' }}
      </button>

      <span v-if="discount" class="badge badge--danger product-card__discount">
        -{{ discount }}%
      </span>

      <span v-if="!product.imageUrl">{{ product.emoji }}</span>
    </RouterLink>

    <RouterLink :to="target" class="product-card__name">{{ product.name }}</RouterLink>
    <div class="mono product-card__rating">
      <template v-if="product.ratingCount">
        ★ {{ product.rating.toFixed(1) }} <span>({{ product.ratingCount }})</span>
      </template>
      <template v-else>{{ t('reviews.new') }}</template>
    </div>

    <div class="product-card__price mono">
      {{ formatMoney(effectiveCents(product)) }}
      <s v-if="discount">{{ formatMoney(product.priceCents) }}</s>
    </div>

    <button
      type="button"
      class="product-card__add"
      :disabled="!available"
      @click="addToCart(product)"
    >
      {{ available ? t('common.addToCart') : t('common.unavailable') }}
    </button>
  </article>
</template>

<style scoped>
.product-card {
  display: flex;
  flex-direction: column;
  padding: 10px;
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  background: var(--surface);
  box-shadow: var(--shadow-card);
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.product-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-hover);
}

.product-card__visual {
  position: relative;
  display: grid;
  place-items: center;
  height: 110px;
  border-radius: var(--radius-md);
  font-size: 44px;
  background-size: cover;
  background-position: center;
}

.product-card__fav {
  position: absolute;
  top: 6px;
  right: 6px;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  padding: 0;
  /* line-height 1 + grid: o glifo fica centralizado mesmo com fontes de fallback diferentes */
  line-height: 1;
  font-size: 16px;
  border: 0;
  border-radius: 50%;
  background: var(--surface);
  color: var(--muted);
}

.product-card__fav.is-active {
  color: #ec4899;
}

.product-card__discount {
  position: absolute;
  top: 6px;
  left: 6px;
}

.product-card__name {
  margin: 8px 0 2px;
  font-size: 12px;
  font-weight: 600;
}

.product-card__rating {
  font-size: 10px;
  color: var(--muted);
}

.product-card__price {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 700;
}

.product-card__price s {
  font-size: 11px;
  font-weight: 400;
  color: var(--muted);
}

.product-card__add {
  margin-top: auto;
  padding: 10px 8px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  background: var(--bg);
  font: 600 11px var(--font-sans);
}

.product-card__add:active {
  transform: scale(0.97);
}

.product-card__add:disabled {
  opacity: 0.4;
}

@media (min-width: 760px) {
  .product-card__visual {
    height: 160px;
  }
}
</style>
