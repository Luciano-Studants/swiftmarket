<script setup>
import { DEFAULT_PREFERENCES } from '@swiftmarket/shared';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AddressSheet from '@/components/AddressSheet.vue';
import AppHeader from '@/components/AppHeader.vue';
import LogoutSheet from '@/components/LogoutSheet.vue';
import { errorMessage } from '@/core/errors.js';
import { useAuthStore } from '@/stores/auth.js';
import { THEME_MODES, useThemeStore } from '@/stores/theme.js';
import { useUiStore } from '@/stores/ui.js';

const { t } = useI18n();
const auth = useAuthStore();
const theme = useThemeStore();
const ui = useUiStore();

const addressOpen = ref(false);
const logoutOpen = ref(false);

const preferences = computed(() => ({
  ...DEFAULT_PREFERENCES,
  ...auth.profile?.preferences,
}));

const NOTIFICATION_SWITCHES = ['notifyOrders', 'notifyPromos'];
const PRIVACY_SWITCHES = ['personalizedRecs', 'shareAnalytics'];

/** Salva o conjunto completo de preferências na API (o servidor valida os 4 campos). */
async function togglePreference(key, checked) {
  try {
    await auth.savePreferences({ ...preferences.value, [key]: checked });
  } catch (error) {
    ui.showToast(errorMessage(error));
  }
}
</script>

<template>
  <div>
    <AppHeader :title="t('settings.title')" back :show-cart="false" />

    <section class="page-section">
      <span class="eyebrow">{{ t('settings.account') }}</span>
      <div class="card settings__block">
        <button type="button" class="row row--button" @click="addressOpen = true">
          <span class="row__body">{{ t('settings.deliveryAddress') }}</span>
          <span>›</span>
        </button>
        <RouterLink :to="{ name: 'change-password' }" class="row row--button">
          <span class="row__body">{{ t('settings.changePassword') }}</span>
          <span>›</span>
        </RouterLink>
      </div>

      <span class="eyebrow">{{ t('settings.notifications') }}</span>
      <div class="card settings__block">
        <label v-for="key in NOTIFICATION_SWITCHES" :key="key" class="switch-row">
          {{ t(`settings.${key}`) }}
          <input
            type="checkbox"
            :checked="preferences[key]"
            @change="togglePreference(key, $event.target.checked)"
          />
        </label>
      </div>

      <span class="eyebrow">{{ t('settings.theme') }}</span>
      <div class="settings__themes">
        <button
          v-for="mode in THEME_MODES"
          :key="mode"
          type="button"
          class="btn"
          :class="{ 'btn--outline': theme.mode !== mode }"
          @click="theme.setMode(mode)"
        >
          {{ t(`settings.themes.${mode}`) }}
        </button>
      </div>

      <span class="eyebrow">{{ t('settings.privacy') }}</span>
      <div class="card settings__block">
        <label v-for="key in PRIVACY_SWITCHES" :key="key" class="switch-row">
          {{ t(`settings.${key}`) }}
          <input
            type="checkbox"
            :checked="preferences[key]"
            @change="togglePreference(key, $event.target.checked)"
          />
        </label>
      </div>

      <button type="button" class="btn btn--outline" @click="logoutOpen = true">
        {{ t('profile.logout') }}
      </button>
    </section>

    <AddressSheet v-model:open="addressOpen" />
    <LogoutSheet v-model:open="logoutOpen" />
  </div>
</template>

<style scoped>
.settings__block {
  margin: 8px 0 20px;
  padding: 4px 14px;
}

.settings__themes {
  display: flex;
  gap: 8px;
  margin: 8px 0 20px;
}
</style>
