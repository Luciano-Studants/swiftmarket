<script setup>
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

const name = ref(auth.user?.name ?? '');

async function save() {
  const value = name.value.trim();
  if (value.length < 2) {
    error.value = t('errors.VALIDATION_ERROR');
    return;
  }

  const done = await run(() => auth.updateProfile({ name: value }).then(() => true));
  if (!done) return;

  ui.showToast(t('profile.saved'));
  router.back();
}
</script>

<template>
  <div>
    <AppHeader :title="t('profile.editTitle')" back :show-cart="false" />

    <form class="page-section" novalidate @submit.prevent="save">
      <label class="field-label" for="profile-name">{{ t('profile.name') }}</label>
      <input id="profile-name" v-model="name" class="input" autocomplete="name" maxlength="80" />

      <p class="error-text" role="alert">{{ error }}</p>

      <button type="submit" class="btn" :disabled="loading">{{ t('common.save') }}</button>
    </form>
  </div>
</template>
