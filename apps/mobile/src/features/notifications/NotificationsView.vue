<script setup>
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import AppHeader from '@/components/AppHeader.vue';
import { errorMessage } from '@/core/errors.js';
import { formatDateTime } from '@/core/format.js';
import { notificationsApi } from '@/features/notifications/notifications.api.js';
import { useNotificationsStore } from '@/stores/notifications.js';

const { t } = useI18n();
const router = useRouter();
const store = useNotificationsStore();

const items = ref([]);
const loading = ref(true);
const error = ref('');

async function load() {
  error.value = '';
  try {
    const result = await notificationsApi.list();
    items.value = result.items;
    store.unread = result.unread;
  } catch (caught) {
    error.value = errorMessage(caught);
  } finally {
    loading.value = false;
  }
}

async function open(item) {
  if (!item.read) {
    item.read = true;
    store.unread = Math.max(0, store.unread - 1);
    notificationsApi.markRead(item.id).catch(() => store.refresh());
  }
  if (item.data.orderId) router.push({ name: 'order-done', params: { id: item.data.orderId } });
}

async function readAll() {
  try {
    await notificationsApi.markAllRead();
    items.value.forEach((item) => {
      item.read = true;
    });
    store.unread = 0;
  } catch (caught) {
    error.value = errorMessage(caught);
  }
}

onMounted(load);
</script>

<template>
  <div>
    <AppHeader :title="t('notifications.title')" back :show-cart="false" />

    <section class="page-section">
      <button
        v-if="store.unread"
        type="button"
        class="btn btn--outline notifications__all"
        @click="readAll"
      >
        {{ t('notifications.readAll') }}
      </button>

      <div v-if="loading" class="spinner" role="progressbar"></div>
      <p v-else-if="error" class="error-text" role="alert">{{ error }}</p>
      <p v-else-if="!items.length" class="notifications__empty">{{ t('notifications.empty') }}</p>

      <ul v-else class="notifications__list">
        <li v-for="item in items" :key="item.id">
          <button
            type="button"
            class="card row notifications__item"
            :class="{ 'is-unread': !item.read }"
            @click="open(item)"
          >
            <span aria-hidden="true">{{ t(`notifications.icon.${item.data.status}`) }}</span>
            <span class="row__body">
              <b>{{
                t(`notifications.order_status.${item.data.status}`, { id: item.data.orderId })
              }}</b>
              <span class="mono notifications__date">{{ formatDateTime(item.createdAt) }}</span>
            </span>
            <span
              v-if="!item.read"
              class="notifications__dot"
              :aria-label="t('notifications.unread')"
            ></span>
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.notifications__all {
  margin-bottom: 12px;
}

.notifications__empty,
.notifications__date {
  font-size: 12px;
  color: var(--muted);
}

.notifications__list {
  display: grid;
  gap: 8px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.notifications__item {
  width: 100%;
  text-align: left;
}

.notifications__item .row__body {
  display: grid;
  gap: 2px;
}

.notifications__item.is-unread {
  border-color: var(--accent);
}

.notifications__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
}
</style>
