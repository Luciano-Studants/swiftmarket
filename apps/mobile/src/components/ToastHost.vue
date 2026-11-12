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
  left: 50%;
  bottom: calc(92px + env(safe-area-inset-bottom, 0px));
  z-index: 30;
  max-width: 90%;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  background: var(--ink);
  color: var(--on-ink);
  font-size: 12px;
  text-align: center;
  opacity: 0;
  pointer-events: none;
  transform: translateX(-50%);
  transition: opacity 0.2s;
}

.toast.is-visible {
  opacity: 1;
}
</style>
