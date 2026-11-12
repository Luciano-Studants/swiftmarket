<script setup>
import { formatMoney } from '@swiftmarket/shared';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import PageHeader from '@/components/PageHeader.vue';
import ProductThumb from '@/components/ProductThumb.vue';
import SalesBarChart from '@/components/SalesBarChart.vue';
import StatCard from '@/components/StatCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { useRequestState } from '@/composables/useRequestState.js';
import { dashboardApi } from '@/features/dashboard/dashboard.api.js';

const { t } = useI18n();
const { loading, error, run } = useRequestState();

const data = ref(null);

const load = async () => {
  data.value = (await run(() => dashboardApi.get())) ?? data.value;
};

onMounted(load);
</script>

<template>
  <div>
    <PageHeader :title="t('dashboard.title')" :subtitle="t('dashboard.subtitle')" />

    <div v-if="loading && !data" class="spinner" role="progressbar"></div>

    <div v-if="error" class="alert" role="alert">
      {{ error }}
      <button type="button" class="btn btn--outline btn--sm" @click="load">
        {{ t('common.retry') }}
      </button>
    </div>

    <template v-if="data">
      <section class="stats">
        <StatCard
          :label="t('dashboard.sales')"
          :value="formatMoney(data.totals.salesCents)"
          icon="💰"
        />
        <StatCard :label="t('dashboard.orders')" :value="String(data.totals.orders)" icon="🧾" />
        <StatCard :label="t('dashboard.customers')" :value="String(data.totals.users)" icon="👥" />
        <StatCard
          :label="t('dashboard.products')"
          :value="String(data.totals.products)"
          icon="📦"
        />
      </section>

      <section class="panels">
        <div class="card">
          <SalesBarChart :days="data.salesLast7Days" />
        </div>

        <div class="card">
          <h3 class="card__title">{{ t('dashboard.lowStock') }}</h3>
          <p class="card__hint">{{ t('dashboard.lowStockHint') }}</p>

          <p v-if="!data.lowStock.length" class="muted">{{ t('dashboard.lowStockEmpty') }}</p>

          <ul v-else class="low-stock">
            <li v-for="product in data.lowStock" :key="product.id">
              <RouterLink
                :to="{ name: 'product-edit', params: { id: product.id } }"
                class="low-stock__item"
              >
                <ProductThumb :product="product" :size="36" />
                <span class="low-stock__name">{{ product.name }}</span>
                <StatusBadge
                  :tone="product.stock === 0 ? 'danger' : 'warning'"
                  :label="
                    product.stock === 0
                      ? t('dashboard.outOfStock')
                      : t('dashboard.units', { count: product.stock })
                  "
                />
              </RouterLink>
            </li>
          </ul>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.panels {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
  gap: 16px;
}

.low-stock {
  display: grid;
  /* minmax(0, 1fr): o nome longo encolhe com reticências e o selo de estoque nunca é cortado */
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
  max-height: 340px;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.low-stock__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: var(--radius-md);
}

.low-stock__item:hover {
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

.low-stock__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1100px) {
  .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .panels {
    /* minmax(0, …): sem isso a coluna não encolhe abaixo do conteúdo (nomes longos) e estoura a tela */
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
