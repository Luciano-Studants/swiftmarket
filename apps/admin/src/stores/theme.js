import { defineStore } from 'pinia';
import { ref } from 'vue';

import { STORAGE_KEYS, deviceStore } from '@/core/storage.js';

export const THEMES = ['dark', 'light'];
/** Decisão do projeto: o primeiro uso começa no tema escuro. */
export const DEFAULT_THEME = 'dark';

/** Tema é preferência do navegador/aparelho (não vai para a API). */
export const useThemeStore = defineStore('theme', () => {
  const mode = ref(DEFAULT_THEME);

  const apply = () => document.documentElement.setAttribute('data-theme', mode.value);

  function hydrate() {
    const saved = deviceStore.get(STORAGE_KEYS.theme);
    mode.value = THEMES.includes(saved) ? saved : DEFAULT_THEME;
    apply();
  }

  function toggle() {
    mode.value = mode.value === 'dark' ? 'light' : 'dark';
    apply();
    deviceStore.set(STORAGE_KEYS.theme, mode.value);
  }

  return { mode, hydrate, toggle };
});
