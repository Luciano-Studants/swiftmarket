<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import AppHeader from '@/components/AppHeader.vue';
import CategoryChips from '@/components/CategoryChips.vue';
import ProductGrid from '@/components/ProductGrid.vue';
import { useRequestState } from '@/composables/useRequestState.js';
import { catalogApi } from '@/features/catalog/catalog.api.js';
import { useAuthStore } from '@/stores/auth.js';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const { loading, error, run } = useRequestState();

const searchText = ref('');
const featured = ref([]);
const recommended = ref([]);
const recent = ref([]);

/* ----- Carrossel de banners ----- */
const BANNER_INTERVAL_MS = 4000;
const BANNERS = [
  { key: 'tech', category: 'electronics', gradient: '#0b0f14, #1f2937 60%, #475569' },
  { key: 'fashion', category: 'fashion', gradient: '#4c1d95, #be185d' },
  { key: 'home', category: 'home', gradient: '#064e3b, #0e7490' },
];

const bannerIndex = ref(0);
let bannerTimer;

onMounted(() => {
  bannerTimer = setInterval(() => {
    bannerIndex.value = (bannerIndex.value + 1) % BANNERS.length;
  }, BANNER_INTERVAL_MS);
});
onBeforeUnmount(() => clearInterval(bannerTimer));

/* ----- Dados ----- */
const load = () =>
  run(async () => {
    const [featuredPage, recommendedPage, recentPage] = await Promise.all([
      catalogApi.list({ featured: true, limit: 4 }),
      catalogApi.list({ recommended: true, limit: 4 }),
      catalogApi.list({ sort: 'newest', limit: 4 }),
    ]);

    featured.value = featuredPage.items;
    recommended.value = recommendedPage.items;
    recent.value = recentPage.items;
  });

onMounted(load);

/* ----- Navegação ----- */
const openCatalog = (query = {}) => router.push({ name: 'catalog', query });
const search = () => openCatalog({ q: searchText.value.trim() || undefined });
const selectCategory = (category) => openCatalog({ category: category || undefined });
</script>

<template>
  <div>
    <AppHeader dark />

    <section class="home__top">
      <p class="home__greeting">
        {{ t('home.greeting', { name: auth.firstName }) }}
      </p>
      <form @submit.prevent="search">
        <input
          v-model="searchText"
          class="input home__search"
          type="search"
          enterkeyhint="search"
          :placeholder="t('home.searchPlaceholder')"
        />
      </form>
    </section>

    <section class="home__banner-wrap">
      <div
        class="home__banner"
        :style="{ background: `linear-gradient(120deg, ${BANNERS[bannerIndex].gradient})` }"
      >
        <div class="eyebrow home__banner-eyebrow">
          {{ t(`home.banners.${BANNERS[bannerIndex].key}.eyebrow`) }}
        </div>
        <div class="home__banner-title">
          {{ t(`home.banners.${BANNERS[bannerIndex].key}.title`) }}
        </div>
        <button
          type="button"
          class="btn btn--sm home__banner-cta"
          @click="openCatalog({ category: BANNERS[bannerIndex].category })"
        >
          {{ t('home.shopNow') }}
        </button>
      </div>

      <div class="home__dots">
        <button
          v-for="(banner, index) in BANNERS"
          :key="banner.key"
          type="button"
          class="home__dot"
          :class="{ 'is-active': index === bannerIndex }"
          :aria-label="t(`home.banners.${banner.key}.title`)"
          @click="bannerIndex = index"
        ></button>
      </div>
    </section>

    <div class="home__section-head">
      <b>{{ t('home.categories') }}</b>
      <button type="button" class="home__view-all" @click="openCatalog()">
        {{ t('common.viewAll') }}
      </button>
    </div>
    <CategoryChips :selected="null" @select="selectCategory" />

    <p v-if="error" class="error-text" role="alert">
      {{ error }}
      <button type="button" class="home__view-all" @click="load">{{ t('common.retry') }}</button>
    </p>

    <b class="home__title">{{ t('home.featured') }}</b>
    <ProductGrid :products="featured" :loading="loading" />

    <b class="home__title">{{ t('home.recommended') }}</b>
    <ProductGrid :products="recommended" :loading="loading" />

    <b class="home__title">{{ t('home.recent') }}</b>
    <ProductGrid :products="recent" :loading="loading" />
  </div>
</template>

<style scoped>
.home__top {
  padding: 0 16px 18px;
  border-radius: 0 0 22px 22px;
  background: var(--header-dark);
}

.home__greeting {
  margin-bottom: 10px;
  font-size: 12px;
  color: #cbd5e1;
}

.home__search {
  border-radius: var(--radius-pill);
  background: #fff;
  color: #111;
}

.home__banner-wrap {
  margin: 16px 16px 4px;
}

.home__banner {
  min-height: 130px;
  padding: 28px 20px;
  border-radius: var(--radius-sm);
  color: #fff;
  transition: background 0.4s;
}

.home__banner-eyebrow {
  color: var(--accent);
}

.home__banner-title {
  margin: 4px 0 12px;
  font: 800 24px var(--font-sans);
}

.home__banner-cta {
  background: #fff;
  color: #111;
}

.home__dots {
  display: flex;
  justify-content: center;
  gap: 4px;
  margin-top: 6px;
}

.home__dot {
  width: 10px;
  height: 10px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--muted);
}

.home__dot.is-active {
  background: var(--accent);
}

.home__section-head {
  display: flex;
  justify-content: space-between;
  padding: 0 16px;
}

.home__view-all {
  border: 0;
  background: none;
  color: var(--accent);
  font-size: 12px;
  font-weight: 700;
}

.home__title {
  display: block;
  padding: 8px 16px 0;
}
</style>
