<script setup>
import { REVIEW } from '@swiftmarket/shared';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import StarInput from '@/components/StarInput.vue';
import StarRating from '@/components/StarRating.vue';
import { errorMessage } from '@/core/errors.js';
import { formatDate } from '@/core/format.js';
import { catalogApi } from '@/features/catalog/catalog.api.js';
import { useUiStore } from '@/stores/ui.js';

const props = defineProps({ productId: { type: Number, required: true } });
/** Avisa a tela do produto para atualizar a nota/contagem exibidas no topo. */
const emit = defineEmits(['changed']);

const { t } = useI18n();
const ui = useUiStore();

const summary = ref({ average: 0, count: 0, distribution: {} });
const items = ref([]);
const page = ref(1);
const totalPages = ref(1);
const mine = ref({ canReview: false, review: null });
const loading = ref(true);
const loadingMore = ref(false);
const saving = ref(false);
const error = ref('');

const rating = ref(0);
const comment = ref('');

function fillForm() {
  rating.value = mine.value.review?.rating ?? 0;
  comment.value = mine.value.review?.comment ?? '';
}

async function load() {
  error.value = '';
  try {
    const [list, own] = await Promise.all([
      catalogApi.reviews(props.productId, { page: 1 }),
      catalogApi.myReview(props.productId),
    ]);
    items.value = list.items;
    summary.value = list.summary;
    page.value = 1;
    totalPages.value = list.totalPages;
    mine.value = own;
    fillForm();
    emit('changed', list.summary);
  } catch (caught) {
    error.value = errorMessage(caught);
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  loadingMore.value = true;
  try {
    const next = await catalogApi.reviews(props.productId, { page: page.value + 1 });
    items.value = [...items.value, ...next.items];
    page.value += 1;
    totalPages.value = next.totalPages;
  } catch (caught) {
    ui.showToast(errorMessage(caught));
  } finally {
    loadingMore.value = false;
  }
}

async function save() {
  if (!rating.value) {
    error.value = t('reviews.pickRating');
    return;
  }

  saving.value = true;
  error.value = '';
  try {
    await catalogApi.saveReview(props.productId, { rating: rating.value, comment: comment.value });
    ui.showToast(t('reviews.saved'));
    await load();
  } catch (caught) {
    error.value = errorMessage(caught);
  } finally {
    saving.value = false;
  }
}

async function remove() {
  saving.value = true;
  try {
    await catalogApi.deleteReview(props.productId);
    ui.showToast(t('reviews.deleted'));
    await load();
  } catch (caught) {
    error.value = errorMessage(caught);
  } finally {
    saving.value = false;
  }
}

const barWidth = (star) =>
  summary.value.count
    ? `${((summary.value.distribution[star] ?? 0) / summary.value.count) * 100}%`
    : '0%';

onMounted(load);
</script>

<template>
  <section class="reviews page-section" aria-labelledby="reviews-title">
    <h3 id="reviews-title">{{ t('reviews.title') }}</h3>

    <div v-if="loading" class="spinner" role="progressbar"></div>

    <template v-else>
      <div v-if="summary.count" class="card reviews__summary">
        <div class="reviews__average">
          <b class="mono">{{ summary.average.toFixed(1) }}</b>
          <StarRating :value="summary.average" :size="16" />
          <span class="reviews__count">{{
            t('reviews.count', { count: summary.count }, summary.count)
          }}</span>
        </div>

        <ul class="reviews__bars">
          <li v-for="star in [5, 4, 3, 2, 1]" :key="star">
            <span class="mono">{{ star }}★</span>
            <span class="reviews__track"><span :style="{ width: barWidth(star) }"></span></span>
            <span class="mono reviews__n">{{ summary.distribution[star] ?? 0 }}</span>
          </li>
        </ul>
      </div>
      <p v-else class="reviews__empty">{{ t('reviews.none') }}</p>

      <!-- Sua avaliação: só quem recebeu o produto pode avaliar. -->
      <form v-if="mine.canReview" class="card reviews__form" novalidate @submit.prevent="save">
        <span class="eyebrow">
          {{ mine.review ? t('reviews.editYours') : t('reviews.writeYours') }}
        </span>
        <StarInput v-model="rating" />
        <textarea
          v-model="comment"
          class="input"
          rows="3"
          :maxlength="REVIEW.MAX_COMMENT_LENGTH"
          :placeholder="t('reviews.commentPlaceholder')"
          :aria-label="t('reviews.commentPlaceholder')"
        ></textarea>

        <p class="error-text" role="alert">{{ error }}</p>

        <button type="submit" class="btn" :disabled="saving">
          {{ mine.review ? t('reviews.update') : t('reviews.send') }}
        </button>
        <button
          v-if="mine.review"
          type="button"
          class="btn btn--outline"
          :disabled="saving"
          @click="remove"
        >
          {{ t('reviews.delete') }}
        </button>
      </form>
      <p v-else class="reviews__hint">{{ t('reviews.onlyAfterDelivery') }}</p>

      <ul class="reviews__list">
        <li v-for="review in items" :key="review.id" class="card">
          <div class="reviews__head">
            <b>{{ review.author }}</b>
            <StarRating :value="review.rating" />
            <span class="mono reviews__date">{{ formatDate(review.createdAt) }}</span>
          </div>
          <span class="badge reviews__verified">{{ t('reviews.verified') }}</span>
          <p v-if="review.comment" class="reviews__comment">{{ review.comment }}</p>
        </li>
      </ul>

      <button
        v-if="page < totalPages"
        type="button"
        class="btn btn--outline"
        :disabled="loadingMore"
        @click="loadMore"
      >
        {{ t('reviews.more') }}
      </button>
    </template>
  </section>
</template>

<style scoped>
.reviews {
  display: grid;
  gap: 12px;
}

.reviews__summary {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 20px;
  align-items: center;
}

.reviews__average {
  display: grid;
  gap: 4px;
  justify-items: center;
}

.reviews__average b {
  font-size: 32px;
}

.reviews__count,
.reviews__date,
.reviews__hint,
.reviews__empty {
  font-size: 12px;
  color: var(--muted);
}

.reviews__bars {
  display: grid;
  gap: 4px;
  padding: 0;
  margin: 0;
  list-style: none;
  font-size: 11px;
}

.reviews__bars li {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) 24px;
  gap: 6px;
  align-items: center;
}

.reviews__track {
  height: 6px;
  overflow: hidden;
  border-radius: 3px;
  background: var(--line);
}

.reviews__track > span {
  display: block;
  height: 100%;
  background: #f59e0b;
}

.reviews__n {
  text-align: right;
}

.reviews__form {
  display: grid;
  gap: 10px;
}

.reviews__list {
  display: grid;
  gap: 10px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.reviews__head {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.reviews__date {
  margin-left: auto;
}

.reviews__verified {
  margin-top: 6px;
  font-size: 10px;
}

.reviews__comment {
  margin: 8px 0 0;
  overflow-wrap: anywhere;
  font-size: 14px;
}
</style>
