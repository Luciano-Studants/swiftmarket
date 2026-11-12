<script setup>
import { PASSWORD } from '@swiftmarket/shared';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import AppHeader from '@/components/AppHeader.vue';
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
    error.value = t('errors.VALIDATION_ERROR');
    return;
  }
  if (password.value !== confirmation.value) {
    error.value = t('auth.passwordMismatch');
    return;
  }

  const done = await run(() => auth.changePassword(current.value, password.value).then(() => true));
  if (!done) return;

  ui.showToast(t('auth.passwordChanged'));
  router.back();
}
</script>

<template>
  <div>
    <AppHeader :title="t('auth.changePasswordTitle')" back :show-cart="false" />

    <form class="page-section" novalidate @submit.prevent="save">
      <label class="field-label" for="current-password">{{ t('auth.currentPassword') }}</label>
      <input
        id="current-password"
        v-model="current"
        class="input"
        type="password"
        autocomplete="current-password"
        maxlength="72"
      />

      <label class="field-label" for="new-password">{{ t('auth.newPassword') }}</label>
      <input
        id="new-password"
        v-model="password"
        class="input"
        type="password"
        autocomplete="new-password"
        maxlength="72"
      />

      <p class="field-hint">{{ t('auth.passwordHint') }}</p>

      <label class="field-label" for="confirm-password">{{ t('auth.confirmPassword') }}</label>
      <input
        id="confirm-password"
        v-model="confirmation"
        class="input"
        type="password"
        autocomplete="new-password"
        maxlength="72"
      />

      <p class="error-text" role="alert">{{ error }}</p>
      <button type="submit" class="btn" :disabled="loading">{{ t('common.save') }}</button>
    </form>
  </div>
</template>
