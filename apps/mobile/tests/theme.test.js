import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, test } from 'vitest';

import { STORAGE_KEYS, storage } from '@/core/storage.js';
import { DEFAULT_THEME, useThemeStore } from '@/stores/theme.js';

const root = document.documentElement;

beforeEach(() => {
  localStorage.clear();
  root.removeAttribute('data-theme');
  setActivePinia(createPinia());
});

describe('tema do aparelho', () => {
  test('primeiro uso: padrão é o tema escuro', async () => {
    expect(DEFAULT_THEME).toBe('dark');

    const theme = useThemeStore();
    await theme.hydrate();

    expect(theme.mode).toBe('dark');
    expect(root.getAttribute('data-theme')).toBe('dark');
  });

  test('escolha do usuário é aplicada e persistida', async () => {
    const theme = useThemeStore();
    await theme.setMode('light');

    expect(root.getAttribute('data-theme')).toBe('light');
    expect(await storage.get(STORAGE_KEYS.theme)).toBe('light');

    setActivePinia(createPinia());
    const restored = useThemeStore();
    await restored.hydrate();
    expect(restored.mode).toBe('light');
  });

  test('"auto" remove o atributo e deixa o CSS seguir o sistema', async () => {
    const theme = useThemeStore();
    await theme.setMode('auto');
    expect(root.hasAttribute('data-theme')).toBe(false);
  });

  test('valor salvo inválido volta ao padrão escuro; modo inválido é ignorado', async () => {
    await storage.set(STORAGE_KEYS.theme, 'neon');
    const theme = useThemeStore();
    await theme.hydrate();
    expect(theme.mode).toBe('dark');

    await theme.setMode('roxo');
    expect(theme.mode).toBe('dark');
  });
});
