<script setup>
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import BottomSheet from '@/components/BottomSheet.vue';
import { useRequestState } from '@/composables/useRequestState.js';
import { useAuthStore } from '@/stores/auth.js';
import { useUiStore } from '@/stores/ui.js';

const open = defineModel('open', { type: Boolean, default: false });
const emit = defineEmits(['saved']);

const { t } = useI18n();
const auth = useAuthStore();
const ui = useUiStore();
const { loading, error, run } = useRequestState();

const address = ref('');

// Cada abertura começa com o endereço atual do perfil.
watch(open, (isOpen) => {
  if (isOpen) {
    address.value = auth.profile?.address ?? '';
    error.value = '';
  }
});

async function save() {
  const value = address.value.trim();
  if (value.length < 5) {
    error.value = t('errors.VALIDATION_ERROR');
    return;
  }

  const done = await run(() => auth.updateProfile({ address: value }).then(() => true));
  if (!done) return;

  open.value = false;
  ui.showToast(t('checkout.addressSaved'));
  emit('saved');
}
</script>

<template>
  <BottomSheet v-model:open="open">
    <h3>{{ t('checkout.editAddress') }}</h3>

    <textarea
      v-model="address"
      class="input address-sheet__input"
      rows="3"
      maxlength="300"
      :placeholder="t('checkout.addressPlaceholder')"
    ></textarea>

    <p class="error-text">{{ error }}</p>

    <button type="button" class="btn" :disabled="loading" @click="save">
      {{ t('common.save') }}
    </button>
  </BottomSheet>
</template>

<style scoped>
.address-sheet__input {
  margin: 12px 0 4px;
  resize: vertical;
}
</style>
