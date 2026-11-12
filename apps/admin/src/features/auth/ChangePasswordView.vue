<script setup>
import { PASSWORD } from '@swiftmarket/shared';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import PageHeader from '@/components/PageHeader.vue';
import { useRequestState } from '@/composables/useRequestState.js';
import { useAuthStore } from '@/stores/auth.js';
import { useUiStore } from '@/stores/ui.js';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const ui = useUiStore();
const { loading, error, run } = useRequestState();

const current = ref('');
const password = ref('');
const confirmation = ref('');

async function save() {
  if (password.value.length < PASSWORD.MIN_LENGTH) {
    error.value = t('account.tooShort', { min: PASSWORD.MIN_LENGTH });
    return;
  }
  if (password.value !== confirmation.value) {
    error.value = t('account.mismatch');
    return;
  }

  const done = await run(() => auth.changePassword(current.value, password.value).then(() => true));
  if (!done) return;

  ui.showToast(t('account.changed'));
  router.replace({ name: 'dashboard' });
}
</script>

<template>
  <div>
    <PageHeader :title="t('account.title')" :subtitle="t('account.subtitle')" />

    <form class="card account" novalidate @submit.prevent="save">
      <div class="field">
        <label for="current-password">{{ t('account.current') }}</label>
        <input
          id="current-password"
          v-model="current"
          class="input"
          type="password"
          autocomplete="current-password"
          maxlength="72"
        />
      </div>

      <div class="field">
        <label for="new-password">{{ t('account.new') }}</label>
        <input
          id="new-password"
          v-model="password"
          class="input"
          type="password"
          autocomplete="new-password"
          maxlength="72"
        />
        <p class="field-hint">{{ t('account.hint', { min: PASSWORD.MIN_LENGTH }) }}</p>
      </div>

      <div class="field">
        <label for="confirm-password">{{ t('account.confirm') }}</label>
        <input
          id="confirm-password"
          v-model="confirmation"
          class="input"
          type="password"
          autocomplete="new-password"
          maxlength="72"
        />
      </div>

      <p v-if="error" class="alert" role="alert">{{ error }}</p>

      <button type="submit" class="btn" :disabled="loading">{{ t('account.save') }}</button>
    </form>
  </div>
</template>

<style scoped>
.account {
  display: grid;
  gap: 14px;
  max-width: 420px;
}
</style>
