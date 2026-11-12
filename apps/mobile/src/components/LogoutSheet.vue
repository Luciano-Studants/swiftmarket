<script setup>
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import BottomSheet from '@/components/BottomSheet.vue';
import { endSession } from '@/core/session.js';

const open = defineModel('open', { type: Boolean, default: false });

const { t } = useI18n();
const router = useRouter();

async function confirmLogout() {
  open.value = false;
  await endSession(router);
}
</script>

<template>
  <BottomSheet v-model:open="open">
    <div class="logout-sheet">
      <h3>{{ t('profile.logoutTitle') }}</h3>
      <p>{{ t('profile.logoutText') }}</p>

      <button type="button" class="btn" @click="confirmLogout">
        {{ t('profile.logoutConfirm') }}
      </button>
      <button type="button" class="btn btn--outline" @click="open = false">
        {{ t('common.cancel') }}
      </button>
    </div>
  </BottomSheet>
</template>

<style scoped>
.logout-sheet {
  display: grid;
  gap: 10px;
  text-align: center;
}

.logout-sheet p {
  margin-bottom: 10px;
  color: var(--muted);
}
</style>
