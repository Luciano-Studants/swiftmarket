import { defineStore } from 'pinia';
import { ref } from 'vue';

const TOAST_DURATION_MS = 3000;

/** Aviso temporário (toast) global. */
export const useUiStore = defineStore('ui', () => {
  const toast = ref({ message: '', visible: false });
  let timer;

  function showToast(message) {
    toast.value = { message, visible: true };
    clearTimeout(timer);
    timer = setTimeout(() => {
      toast.value = { ...toast.value, visible: false };
    }, TOAST_DURATION_MS);
  }

  return { toast, showToast };
});
