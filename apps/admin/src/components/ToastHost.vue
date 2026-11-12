<script setup>
import { useUiStore } from '@/stores/ui.js';

const ui = useUiStore();
</script>

<template>
  <div class="toast" :class="{ 'is-visible': ui.toast.visible }" role="status" aria-live="polite">
    {{ ui.toast.message }}
  </div>
</template>

<style scoped>
.toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 50;
  max-width: 360px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  background: var(--ink);
  color: var(--on-ink);
  font-size: 13px;
  box-shadow: var(--shadow-hover);
  opacity: 0;
  pointer-events: none;
  transform: translateY(8px);
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.toast.is-visible {
  opacity: 1;
  transform: none;
}
</style>
