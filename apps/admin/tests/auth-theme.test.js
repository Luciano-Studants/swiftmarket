import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('@/features/auth/auth.api.js', () => ({ authApi: { login: vi.fn() } }));

import { STORAGE_KEYS, sessionStore } from '@/core/storage.js';
import { authApi } from '@/features/auth/auth.api.js';
import { useAuthStore } from '@/stores/auth.js';
import { DEFAULT_THEME, useThemeStore } from '@/stores/theme.js';

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

describe('sessão do admin', () => {
  test('login de administrador guarda a sessão só na aba (sessionStorage)', async () => {
    authApi.login.mockResolvedValue({
      token: 'tok',
      user: { id: 1, name: 'Admin', email: 'a@b.com', role: 'admin' },
    });

    const auth = useAuthStore();
    await auth.login('a@b.com', 'x');

    expect(auth.isAuthenticated).toBe(true);
    expect(sessionStore.get(STORAGE_KEYS.session).token).toBe('tok');
    expect(localStorage.length).toBe(0); // nada de token em localStorage
  });

  test('conta de cliente é recusada e nada é guardado', async () => {
    authApi.login.mockResolvedValue({
      token: 'tok',
      user: { id: 2, name: 'John', email: 'j@b.com', role: 'user' },
    });

    const auth = useAuthStore();
    const error = await auth.login('j@b.com', 'x').catch((e) => e);

    expect(error.code).toBe('NOT_ADMIN');
    expect(auth.isAuthenticated).toBe(false);
    expect(sessionStore.get(STORAGE_KEYS.session)).toBeNull();
  });

  test('restore ignora sessão salva que não seja de administrador', () => {
    sessionStore.set(STORAGE_KEYS.session, {
      token: 'tok',
      user: { id: 2, role: 'user', name: 'John' },
    });

    const auth = useAuthStore();
    auth.restore();
    expect(auth.isAuthenticated).toBe(false);
  });

  test('clear apaga a sessão', async () => {
    authApi.login.mockResolvedValue({
      token: 'tok',
      user: { id: 1, name: 'Admin', email: 'a@b.com', role: 'admin' },
    });

    const auth = useAuthStore();
    await auth.login('a@b.com', 'x');
    auth.clear();

    expect(auth.token).toBeNull();
    expect(sessionStore.get(STORAGE_KEYS.session)).toBeNull();
  });
});

describe('tema do painel', () => {
  test('padrão escuro; alternar aplica e persiste; valor inválido volta ao padrão', () => {
    expect(DEFAULT_THEME).toBe('dark');

    const theme = useThemeStore();
    theme.hydrate();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    theme.toggle();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(JSON.parse(localStorage.getItem('sm.admin.theme'))).toBe('light');

    localStorage.setItem('sm.admin.theme', JSON.stringify('neon'));
    setActivePinia(createPinia());
    const fresh = useThemeStore();
    fresh.hydrate();
    expect(fresh.mode).toBe('dark');
  });
});
