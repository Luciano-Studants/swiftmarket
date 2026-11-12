import { defineStore } from 'pinia';
import { ref } from 'vue';

import { syncStatusBar } from '@/core/platform.js';
import { STORAGE_KEYS, storage } from '@/core/storage.js';

export const THEME_MODES = ['auto', 'light', 'dark'];
/** Decisão do projeto: o primeiro uso começa no tema escuro. */
export const DEFAULT_THEME = 'dark';

const systemPrefersDark = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;

/** Tema é preferência do APARELHO (não vai para a API). */
export const useThemeStore = defineStore('theme', () => {
  const mode = ref(DEFAULT_THEME);

  function apply() {
    const root = document.documentElement;
    // "auto": remove o atributo e deixa o CSS seguir `prefers-color-scheme`.
    if (mode.value === 'auto') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', mode.value);

    const resolved = mode.value === 'auto' ? (systemPrefersDark() ? 'dark' : 'light') : mode.value;
    syncStatusBar(resolved);
  }

  async function hydrate() {
    const saved = await storage.get(STORAGE_KEYS.theme);
    mode.value = THEME_MODES.includes(saved) ? saved : DEFAULT_THEME;
    apply();
  }

  async function setMode(next) {
    if (!THEME_MODES.includes(next)) return;
    mode.value = next;
    apply();
    await storage.set(STORAGE_KEYS.theme, next);
  }

  return { mode, hydrate, setMode };
});
