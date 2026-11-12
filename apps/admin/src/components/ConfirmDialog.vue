<script setup>
import { nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  text: { type: String, default: '' },
  confirmLabel: { type: String, default: '' },
  busy: { type: Boolean, default: false },
});
const emit = defineEmits(['confirm', 'cancel']);

const { t } = useI18n();
const cancelButton = ref(null);

// Ao abrir, o foco vai para "Cancelar" (ação segura) e Esc fecha.
watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      await nextTick();
      cancelButton.value?.focus();
    }
  },
);
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="dialog-backdrop"
      @click.self="emit('cancel')"
      @keydown.esc="emit('cancel')"
    >
      <div class="dialog card" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title">
        <h2 id="dialog-title" class="dialog__title">{{ title }}</h2>
        <p v-if="text" class="dialog__text">{{ text }}</p>

        <div class="dialog__actions">
          <button ref="cancelButton" type="button" class="btn btn--outline" @click="emit('cancel')">
            {{ t('common.cancel') }}
          </button>
          <button type="button" class="btn btn--danger" :disabled="busy" @click="emit('confirm')">
            {{ confirmLabel || t('common.delete') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style>
/* Sem scoped: o conteúdo é teleportado para o <body>. */
.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 16px;
  background: #0009;
}

.dialog {
  width: 100%;
  max-width: 420px;
}

.dialog__title {
  font: 700 18px var(--font-sans);
}

.dialog__text {
  margin: 8px 0 20px;
  color: var(--muted);
}

.dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
