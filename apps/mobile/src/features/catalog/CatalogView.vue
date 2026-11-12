<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import AppHeader from '@/components/AppHeader.vue';
import CategoryChips from '@/components/CategoryChips.vue';
import ProductGrid from '@/components/ProductGrid.vue';
import { errorMessage } from '@/core/errors.js';
import { catalogApi } from '@/features/catalog/catalog.api.js';

const PAGE_SIZE = 8;
const SEARCH_DEBOUNCE_MS = 300;
const SORT_OPTIONS = ['featured', 'rating', 'price_asc', 'price_desc', 'name', 'newest'];

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

// Filtros iniciam a partir da URL (ex.: vindo da tela inicial) e ficam nela,
// assim o botão voltar devolve o usuário ao mesmo filtro.
const search = ref(typeof route.query.q === 'string' ? route.query.q : '');
const category = ref(typeof route.query.category === 'string' ? route.query.category : '');
const sort = ref('featured');
const inStockOnly = ref(false);

const products = ref([]);
const page = ref(1);
const total = ref(0);
const totalPages = ref(1);
const loading = ref(false);
const error = ref('');

let debounceTimer;
let requestId = 0; // descarta respostas antigas quando o usuário muda o filtro rápido

async function fetchProducts({ reset }) {
  const currentRequest = ++requestId;
  if (reset) page.value = 1;

  loading.value = true;
  error.value = '';

  try {
    const result = await catalogApi.list({
      q: search.value.trim() || undefined,
      category: category.value || undefined,
      inStock: inStockOnly.value || undefined,
      sort: sort.value,
      page: page.value,
      limit: PAGE_SIZE,
    });
    if (currentRequest !== requestId) return;

    products.value = reset ? result.items : [...products.value, ...result.items];
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (caught) {
    if (currentRequest === requestId) error.value = errorMessage(caught);
  } finally {
    if (currentRequest === requestId) loading.value = false;
  }
}

function loadMore() {
  if (page.value >= totalPages.value || loading.value) return;
  page.value += 1;
  fetchProducts({ reset: false });
}

function syncUrl() {
  router.replace({
    query: {
      q: search.value.trim() || undefined,
      category: category.value || undefined,
    },
  });
}

// Qualquer mudança de filtro refaz a busca (texto com debounce).
watch(search, () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    syncUrl();
    fetchProducts({ reset: true });
  }, SEARCH_DEBOUNCE_MS);
});

watch([category, sort, inStockOnly], () => {
  syncUrl();
  fetchProducts({ reset: true });
});

onMounted(() => fetchProducts({ reset: true }));
onBeforeUnmount(() => clearTimeout(debounceTimer));
</script>

<template>
  <div>
    <AppHeader :title="t('catalog.title')" />

    <div class="catalog__search">
      <input
        v-model="search"
        class="input"
        type="search"
        enterkeyhint="search"
        :placeholder="t('catalog.searchPlaceholder')"
      />
    </div>

    <CategoryChips :selected="category" @select="category = $event" />

    <div class="catalog__toolbar">
      <span>{{ t('catalog.showing', { shown: products.length, total }) }}</span>

      <label class="catalog__stock">
        <input v-model="inStockOnly" type="checkbox" />
        {{ t('catalog.onlyInStock') }}
      </label>

      <select v-model="sort" class="input catalog__sort" :aria-label="t('catalog.title')">
        <option v-for="option in SORT_OPTIONS" :key="option" :value="option">
          {{ t(`catalog.sort.${option}`) }}
        </option>
      </select>
    </div>

    <p v-if="error" class="error-text" role="alert">{{ error }}</p>

    <ProductGrid :products="products" :loading="loading" />

    <div v-if="page < totalPages" class="catalog__more">
      <button type="button" class="btn btn--outline" :disabled="loading" @click="loadMore">
        {{ loading ? t('common.loading') : t('common.loadMore') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.catalog__search {
  padding: 12px 16px 0;
}

.catalog__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 16px;
  font-size: 11px;
  color: var(--muted);
}

.catalog__stock {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.catalog__sort {
  width: auto;
  padding: 4px;
  font-size: 11px;
}

.catalog__more {
  padding: 0 16px 24px;
}
</style>
