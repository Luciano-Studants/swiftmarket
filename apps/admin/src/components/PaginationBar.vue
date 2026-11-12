<script setup>
import { useI18n } from 'vue-i18n';

defineProps({
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  total: { type: Number, default: 0 },
});
const emit = defineEmits(['change']);

const { t } = useI18n();
</script>

<template>
  <div v-if="totalPages > 1 || total > 0" class="pagination">
    <span class="muted">{{ t('common.results', { count: total }) }}</span>

    <div v-if="totalPages > 1" class="pagination__controls">
      <button
        type="button"
        class="btn btn--outline btn--sm"
        :disabled="page <= 1"
        @click="emit('change', page - 1)"
      >
        {{ t('common.previous') }}
      </button>
      <span class="mono">{{ t('common.page', { page, total: totalPages }) }}</span>
      <button
        type="button"
        class="btn btn--outline btn--sm"
        :disabled="page >= totalPages"
        @click="emit('change', page + 1)"
      >
        {{ t('common.next') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.pagination {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
  font-size: 12px;
}

.pagination__controls {
  display: flex;
  align-items: center;
  gap: 12px;
}
</style>
