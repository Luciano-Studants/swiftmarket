<script setup>
import { ROLES } from '@swiftmarket/shared';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import PageHeader from '@/components/PageHeader.vue';
import PaginationBar from '@/components/PaginationBar.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { PAGE_SIZE } from '@/core/config.js';
import { errorMessage } from '@/core/errors.js';
import { formatDate } from '@/core/format.js';
import { usersApi } from '@/features/users/users.api.js';

const { t } = useI18n();

const page = ref(1);
const users = ref([]);
const total = ref(0);
const totalPages = ref(1);
const loading = ref(true);
const error = ref('');

async function load() {
  loading.value = true;
  error.value = '';

  try {
    const result = await usersApi.list({ page: page.value, limit: PAGE_SIZE });
    users.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (caught) {
    error.value = errorMessage(caught);
  } finally {
    loading.value = false;
  }
}

function goToPage(next) {
  page.value = next;
  load();
}

onMounted(load);
</script>

<template>
  <div>
    <PageHeader :title="t('users.title')" :subtitle="t('users.subtitle')" />

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
            <th>{{ t('users.colName') }}</th>
            <th>{{ t('users.colEmail') }}</th>
            <th>{{ t('users.colRole') }}</th>
            <th>{{ t('users.colSince') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>
              <b>{{ user.name }}</b>
            </td>
            <td class="mono">{{ user.email }}</td>
            <td>
              <StatusBadge
                :tone="user.role === ROLES.ADMIN ? 'info' : 'neutral'"
                :label="t(`users.role.${user.role}`)"
              />
            </td>
            <td>{{ formatDate(user.createdAt) }}</td>
          </tr>

          <tr v-if="!loading && !users.length">
            <td colspan="4" class="table-empty">{{ t('common.empty') }}</td>
          </tr>
        </tbody>
      </table>

      <div v-if="loading" class="spinner" role="progressbar"></div>
    </div>

    <PaginationBar :page="page" :total-pages="totalPages" :total="total" @change="goToPage" />
  </div>
</template>
