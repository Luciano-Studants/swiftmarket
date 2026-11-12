<script setup>
import {
  CATEGORIES,
  PRODUCT_STATUS,
  discountPercent,
  effectiveCents,
  formatMoney,
} from '@swiftmarket/shared';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import ConfirmDialog from '@/components/ConfirmDialog.vue';
import PageHeader from '@/components/PageHeader.vue';
import PaginationBar from '@/components/PaginationBar.vue';
import ProductThumb from '@/components/ProductThumb.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { PAGE_SIZE } from '@/core/config.js';
import { errorMessage } from '@/core/errors.js';
import { isLowStock, statusTone } from '@/core/product.js';
import { productsApi } from '@/features/products/products.api.js';
import { useUiStore } from '@/stores/ui.js';

const SEARCH_DEBOUNCE_MS = 300;

const { t } = useI18n();
const ui = useUiStore();

const search = ref('');
const category = ref('');
const status = ref('');
const page = ref(1);

const products = ref([]);
const total = ref(0);
const totalPages = ref(1);
const loading = ref(true);
const error = ref('');

const toDelete = ref(null);
const deleting = ref(false);

let debounceTimer;
let requestId = 0; // descarta respostas antigas quando o filtro muda rápido

async function load() {
  const current = ++requestId;
  loading.value = true;
  error.value = '';

  try {
    const result = await productsApi.list({
      q: search.value.trim() || undefined,
      category: category.value || undefined,
      status: status.value || undefined,
      sort: 'newest',
      page: page.value,
      limit: PAGE_SIZE,
    });
    if (current !== requestId) return;

    products.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (caught) {
    if (current === requestId) error.value = errorMessage(caught);
  } finally {
    if (current === requestId) loading.value = false;
  }
}

// Qualquer mudança de filtro volta para a página 1; a busca por texto tem debounce.
watch(search, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    page.value = 1;
    load();
  }, SEARCH_DEBOUNCE_MS);
});

watch([category, status], () => {
  page.value = 1;
  load();
});

function goToPage(next) {
  page.value = next;
  load();
}

async function confirmDelete() {
  const product = toDelete.value;
  deleting.value = true;

  try {
    await productsApi.remove(product.id);
    toDelete.value = null;
    ui.showToast(t('products.deleted'));

    // Se era o último item da página, volta uma página.
    if (products.value.length === 1 && page.value > 1) page.value -= 1;
    await load();
  } catch (caught) {
    toDelete.value = null;
    ui.showToast(errorMessage(caught));
  } finally {
    deleting.value = false;
  }
}

onMounted(load);
onBeforeUnmount(() => clearTimeout(debounceTimer));
</script>

<template>
  <div>
    <PageHeader :title="t('products.title')" :subtitle="t('products.subtitle')">
      <RouterLink :to="{ name: 'product-new' }" class="btn">+ {{ t('products.new') }}</RouterLink>
    </PageHeader>

    <div class="toolbar">
      <input
        v-model="search"
        class="input"
        type="search"
        :placeholder="t('products.searchPlaceholder')"
        :aria-label="t('common.search')"
      />

      <select v-model="category" class="select" :aria-label="t('products.colCategory')">
        <option value="">{{ t('products.colCategory') }}: {{ t('common.all') }}</option>
        <option v-for="item in CATEGORIES" :key="item" :value="item">
          {{ t(`categories.${item}`) }}
        </option>
      </select>

      <select v-model="status" class="select" :aria-label="t('products.colStatus')">
        <option value="">{{ t('products.colStatus') }}: {{ t('common.all') }}</option>
        <option v-for="item in Object.values(PRODUCT_STATUS)" :key="item" :value="item">
          {{ t(`products.status.${item}`) }}
        </option>
      </select>
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
            <th>{{ t('products.colProduct') }}</th>
            <th>{{ t('products.colCategory') }}</th>
            <th class="num">{{ t('products.colPrice') }}</th>
            <th class="num">{{ t('products.colStock') }}</th>
            <th>{{ t('products.colStatus') }}</th>
            <th class="num">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="product in products" :key="product.id">
            <td>
              <div class="product-cell">
                <ProductThumb :product="product" />
                <div>
                  <b>{{ product.name }}</b>
                  <div v-if="product.featured" class="muted product-cell__tag">★ Destaque</div>
                </div>
              </div>
            </td>
            <td>{{ t(`categories.${product.category}`) }}</td>
            <td class="num">
              {{ formatMoney(effectiveCents(product)) }}
              <div v-if="discountPercent(product)" class="muted product-cell__old">
                <s>{{ formatMoney(product.priceCents) }}</s> −{{ discountPercent(product) }}%
              </div>
            </td>
            <td class="num">
              <StatusBadge
                v-if="isLowStock(product.stock)"
                :tone="product.stock === 0 ? 'danger' : 'warning'"
                :label="String(product.stock)"
              />
              <template v-else>{{ product.stock }}</template>
            </td>
            <td>
              <StatusBadge
                :tone="statusTone(product.status)"
                :label="t(`products.status.${product.status}`)"
              />
            </td>
            <td>
              <div class="row-actions">
                <RouterLink
                  :to="{ name: 'product-edit', params: { id: product.id } }"
                  class="btn btn--outline btn--sm"
                  :aria-label="`${t('common.edit')} ${product.name}`"
                >
                  {{ t('common.edit') }}
                </RouterLink>
                <button
                  type="button"
                  class="btn btn--danger btn--sm"
                  :aria-label="`${t('common.delete')} ${product.name}`"
                  @click="toDelete = product"
                >
                  {{ t('common.delete') }}
                </button>
              </div>
            </td>
          </tr>

          <tr v-if="!loading && !products.length">
            <td colspan="6" class="table-empty">{{ t('common.empty') }}</td>
          </tr>
        </tbody>
      </table>

      <div v-if="loading" class="spinner" role="progressbar"></div>
    </div>

    <PaginationBar :page="page" :total-pages="totalPages" :total="total" @change="goToPage" />

    <ConfirmDialog
      :open="Boolean(toDelete)"
      :title="t('products.confirmTitle')"
      :text="toDelete ? t('products.confirmText', { name: toDelete.name }) : ''"
      :busy="deleting"
      @confirm="confirmDelete"
      @cancel="toDelete = null"
    />
  </div>
</template>

<style scoped>
.product-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.product-cell__tag,
.product-cell__old {
  font-size: 11px;
}
</style>
