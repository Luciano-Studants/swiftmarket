<script setup>
import { onBeforeUnmount, watch } from 'vue';

import { useUiStore } from '@/stores/ui.js';

const open = defineModel('open', { type: Boolean, default: false });

const ui = useUiStore();
let unregister = null;

const close = () => {
  open.value = false;
};

// Enquanto aberto, o botão voltar do Android fecha o sheet (em vez de sair da tela).
watch(
  open,
  (isOpen) => {
    unregister?.();
    unregister = isOpen ? ui.registerSheet(close) : null;
  },
  { immediate: true },
);

onBeforeUnmount(() => unregister?.());
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="sheet-backdrop" @click="close"></div>
    <section v-if="open" class="sheet" role="dialog" aria-modal="true">
      <slot />
    </section>
  </Teleport>
</template>

<style>
/* Sem scoped: o conteúdo é teleportado para o <body>. */
.sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20;
  background: #0008;
}

.sheet {
  position: fixed;
  left: 50%;
  bottom: 0;
  z-index: 21;
  width: 100%;
  max-width: 430px;
  max-height: 85vh;
  overflow: auto;
  padding: 20px 20px calc(20px + env(safe-area-inset-bottom, 0px));
  border-radius: 12px 12px 0 0;
  background: var(--surface);
  color: var(--text);
  transform: translateX(-50%);
  animation: sheet-up 0.2s ease;
}

.sheet h3 {
  margin-bottom: 4px;
}

@keyframes sheet-up {
  from {
    transform: translate(-50%, 24px);
    opacity: 0;
  }
}
</style>
