<script setup>
import { PASSWORD } from '@swiftmarket/shared';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import AppHeader from '@/components/AppHeader.vue';
import { useRequestState } from '@/composables/useRequestState.js';
import { authApi } from '@/features/auth/auth.api.js';
import { useUiStore } from '@/stores/ui.js';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const ui = useUiStore();
const { loading, error, run } = useRequestState();

/** 1 = informar e-mail; 2 = código + senha nova. */
const step = ref(1);
const email = ref(typeof route.query.email === 'string' ? route.query.email : '');
const code = ref('');
const password = ref('');
const confirmation = ref('');

async function sendCode() {
  if (!email.value.includes('@')) {
    error.value = t('auth.forgotNeedEmail');
    return;
  }

  const sent = await run(() => authApi.forgotPassword(email.value.trim()).then(() => true));
  if (sent) step.value = 2;
}

async function resetPassword() {
  if (!/^\d{6}$/.test(code.value.trim())) {
    error.value = t('auth.codeInvalidFormat');
    return;
  }
  if (password.value.length < PASSWORD.MIN_LENGTH) {
    error.value = t('errors.VALIDATION_ERROR');
    return;
  }
  if (password.value !== confirmation.value) {
    error.value = t('auth.passwordMismatch');
    return;
  }

  const done = await run(() =>
    authApi.resetPassword(email.value.trim(), code.value.trim(), password.value).then(() => true),
  );
  if (!done) return;

  ui.showToast(t('auth.resetDone'));
  router.replace({ name: 'login' });
}
</script>

<template>
  <div>
    <AppHeader :title="t('auth.forgotTitle')" back :show-cart="false" />

    <form v-if="step === 1" class="page-section" novalidate @submit.prevent="sendCode">
      <p class="hint">{{ t('auth.forgotIntro') }}</p>

      <label class="field-label" for="forgot-email">{{ t('auth.email') }}</label>
      <input
        id="forgot-email"
        v-model="email"
        class="input"
        type="email"
        inputmode="email"
        autocomplete="email"
        autocapitalize="off"
        :placeholder="t('auth.emailPlaceholder')"
      />

      <p class="error-text" role="alert">{{ error }}</p>
      <button type="submit" class="btn" :disabled="loading">{{ t('auth.sendCode') }}</button>
    </form>

    <form v-else class="page-section" novalidate @submit.prevent="resetPassword">
      <p class="hint">{{ t('auth.codeSent', { email }) }}</p>

      <label class="field-label" for="reset-code">{{ t('auth.code') }}</label>
      <input
        id="reset-code"
        v-model="code"
        class="input mono"
        inputmode="numeric"
        autocomplete="one-time-code"
        maxlength="6"
        placeholder="000000"
      />

      <label class="field-label" for="reset-password">{{ t('auth.newPassword') }}</label>
      <input
        id="reset-password"
        v-model="password"
        class="input"
        type="password"
        autocomplete="new-password"
        maxlength="72"
      />

      <p class="field-hint">{{ t('auth.passwordHint') }}</p>

      <label class="field-label" for="reset-confirmation">{{ t('auth.confirmPassword') }}</label>
      <input
        id="reset-confirmation"
        v-model="confirmation"
        class="input"
        type="password"
        autocomplete="new-password"
        maxlength="72"
      />

      <p class="error-text" role="alert">{{ error }}</p>
      <button type="submit" class="btn" :disabled="loading">{{ t('auth.resetPassword') }}</button>

      <button type="button" class="link forgot__resend" :disabled="loading" @click="sendCode">
        {{ t('auth.resendCode') }}
      </button>
    </form>
  </div>
</template>

<style scoped>
.hint {
  margin-bottom: 14px;
  font-size: 13px;
  color: var(--muted);
}

.forgot__resend {
  display: block;
  margin: 16px auto 0;
}

.link {
  border: 0;
  background: none;
  color: var(--text);
  font-size: 12px;
  font-weight: 700;
}
</style>
