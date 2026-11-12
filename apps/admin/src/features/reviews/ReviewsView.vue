<script setup>
import { REVIEW } from '@swiftmarket/shared';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import PageHeader from '@/components/PageHeader.vue';
import PaginationBar from '@/components/PaginationBar.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { PAGE_SIZE } from '@/core/config.js';
import { errorMessage } from '@/core/errors.js';
import { formatDateTime } from '@/core/format.js';
import { reviewsApi } from '@/features/reviews/reviews.api.js';
import { useUiStore } from '@/stores/ui.js';

const STATUSES = Object.values(REVIEW.STATUS);

const { t } = useI18n();
const ui = useUiStore();

const status = ref('');
const page = ref(1);
const reviews = ref([]);
const total = ref(0);
const totalPages = ref(1);
const loading = ref(true);
const error = ref('');
const savingIds = ref(new Set());

let requestId = 0;

async function load() {
  const current = ++requestId;
  loading.value = true;
  error.value = '';

  try {
    const result = await reviewsApi.list({
      status: status.value || undefined,
      page: page.value,
      limit: PAGE_SIZE,
    });
    if (current !== requestId) return;

    reviews.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (caught) {
    if (current === requestId) error.value = errorMessage(caught);
  } finally {
    if (current === requestId) loading.value = false;
  }
}

function filterBy(next) {
  status.value = next;
  page.value = 1;
  load();
}

function goToPage(next) {
  page.value = next;
  load();
}

async function toggle(review) {
  const next =
    review.status === REVIEW.STATUS.VISIBLE ? REVIEW.STATUS.HIDDEN : REVIEW.STATUS.VISIBLE;

  savingIds.value = new Set(savingIds.value).add(review.id);
  try {
    await reviewsApi.moderate(review.id, next);
    ui.showToast(t(next === REVIEW.STATUS.HIDDEN ? 'reviews.hiddenToast' : 'reviews.shownToast'));
    await load(); // com filtro ativo a avaliação pode sair da lista
  } catch (caught) {
    ui.showToast(errorMessage(caught));
  } finally {
    const rest = new Set(savingIds.value);
    rest.delete(review.id);
    savingIds.value = rest;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <PageHeader :title="t('reviews.title')" :subtitle="t('reviews.subtitle')" />

    <div class="toolbar">
      <div class="chips" role="group" :aria-label="t('reviews.colStatus')">
        <button
          type="button"
          class="chip"
          :class="{ 'chip--active': status === '' }"
          :aria-pressed="status === ''"
          @click="filterBy('')"
        >
          {{ t('common.all') }}
        </button>
        <button
          v-for="item in STATUSES"
          :key="item"
          type="button"
          class="chip"
          :class="{ 'chip--active': status === item }"
          :aria-pressed="status === item"
          @click="filterBy(item)"
        >
          {{ t(`reviews.status.${item}`) }}
        </button>
      </div>
    </div>

    <p v-if="error" class="alert" role="alert">
      {{ error }}
      <button type="button" class="btn btn--outline btn--sm" @click="load">
        {{ t('common.retry') }}
      </button>
    </p>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('reviews.colProduct') }}</th>
            <th>{{ t('reviews.colAuthor') }}</th>
            <th class="num">{{ t('reviews.colRating') }}</th>
            <th>{{ t('reviews.colComment') }}</th>
            <th>{{ t('reviews.colDate') }}</th>
            <th>{{ t('reviews.colStatus') }}</th>
            <th class="num">{{ t('reviews.colActions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="review in reviews" :key="review.id">
            <td>{{ review.productName }}</td>
            <td>
              <div>{{ review.author }}</div>
              <div class="muted mono review-email">{{ review.authorEmail }}</div>
            </td>
            <td class="num">{{ '★'.repeat(review.rating) }}</td>
            <td class="review-comment">{{ review.comment || '—' }}</td>
            <td>{{ formatDateTime(review.createdAt) }}</td>
            <td>
              <StatusBadge
                :tone="review.status === 'visible' ? 'success' : 'warning'"
                :label="t(`reviews.status.${review.status}`)"
              />
            </td>
            <td>
              <div class="row-actions">
                <button
                  type="button"
                  class="btn btn--outline btn--sm"
                  :disabled="savingIds.has(review.id)"
                  @click="toggle(review)"
                >
                  {{ review.status === 'visible' ? t('reviews.hide') : t('reviews.show') }}
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!loading && !reviews.length">
            <td colspan="7" class="table-empty">{{ t('common.empty') }}</td>
          </tr>
        </tbody>
      </table>

      <div v-if="loading" class="spinner" role="progressbar"></div>
    </div>

    <PaginationBar :page="page" :total-pages="totalPages" :total="total" @change="goToPage" />
  </div>
</template>

<style scoped>
.review-email {
  font-size: 11px;
}

.review-comment {
  max-width: 320px;
  overflow-wrap: anywhere;
}
</style>
