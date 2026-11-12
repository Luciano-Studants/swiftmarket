import { defineStore } from 'pinia';
import { ref } from 'vue';

const TOAST_DURATION_MS = 2200;

/** Estado de interface global: toast e pilha de bottom sheets abertos. */
export const useUiStore = defineStore('ui', () => {
  const toast = ref({ message: '', visible: false });
  let toastTimer;

  function showToast(message) {
    toast.value = { message, visible: true };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.value = { ...toast.value, visible: false };
    }, TOAST_DURATION_MS);
  }

  // Cada sheet aberto registra uma função de fechamento; o botão voltar fecha o do topo.
  const sheetClosers = [];

  function registerSheet(close) {
    sheetClosers.push(close);
    return () => {
      const index = sheetClosers.indexOf(close);
      if (index >= 0) sheetClosers.splice(index, 1);
    };
  }

  /** @returns {boolean} true se havia um sheet aberto e ele foi fechado */
  function closeTopSheet() {
    const close = sheetClosers.pop();
    if (!close) return false;
    close();
    return true;
  }

  return { toast, showToast, registerSheet, closeTopSheet };
});
