<script setup>
import { formatMoney } from '@swiftmarket/shared';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AppHeader from '@/components/AppHeader.vue';
import { errorMessage } from '@/core/errors.js';
import { ordersApi } from '@/features/checkout/orders.api.js';

const { t, locale } = useI18n();

const orders = ref([]);
const page = ref(1);
const totalPages = ref(1);
const loading = ref(true);
const error = ref('');

const formatDate = (iso) =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'short' }).format(new Date(iso));

async function load() {
  loading.value = true;
  error.value = '';

  try {
    const result = await ordersApi.listMine({ page: page.value });
    orders.value = [...orders.value, ...result.items];
    totalPages.value = result.totalPages;
  } catch (caught) {
    error.value = errorMessage(caught);
  } finally {
    loading.value = false;
  }
}

function loadMore() {
  page.value += 1;
  load();
}

onMounted(load);
</script>

<template>
  <div>
    <AppHeader :title="t('order.historyTitle')" back :show-cart="false" />

    <section class="page-section">
      <p v-if="error" class="error-text" role="alert">{{ error }}</p>
      <p v-else-if="!loading && !orders.length" class="empty-state">
        {{ t('order.historyEmpty') }}
      </p>

      <div v-if="orders.length" class="card orders__list">
        <RouterLink
          v-for="order in orders"
          :key="order.id"
          :to="{ name: 'order-done', params: { id: order.id } }"
          class="row orders__item"
        >
          <div class="row__body">
            <b class="mono orders__id">{{ order.id }}</b>
            <div class="orders__meta">
              {{ formatDate(order.createdAt) }} ·
              {{ t('order.items', { count: order.items.length }) }}
            </div>
            <span class="badge" :class="{ 'badge--danger': order.status === 'cancelled' }">
              {{ t(`order.status.${order.status}`).toUpperCase() }}
            </span>
          </div>
          <b class="mono">{{ formatMoney(order.totalCents) }}</b>
        </RouterLink>
      </div>

      <div v-if="loading" class="spinner" role="progressbar"></div>

      <button
        v-else-if="page < totalPages"
        type="button"
        class="btn btn--outline orders__more"
        @click="loadMore"
      >
        {{ t('common.loadMore') }}
      </button>
    </section>
  </div>
</template>

<style scoped>
.orders__list {
  padding: 0 14px;
}

.orders__id {
  font-size: 12px;
}

.orders__meta {
  margin: 2px 0 4px;
  font-size: 11px;
  color: var(--muted);
}

.orders__more {
  margin-top: 16px;
}
</style>
