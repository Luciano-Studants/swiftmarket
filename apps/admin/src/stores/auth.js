import { ROLES } from '@swiftmarket/shared';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { ApiError } from '@/core/http.js';
import { STORAGE_KEYS, sessionStore } from '@/core/storage.js';
import { authApi } from '@/features/auth/auth.api.js';

/** Sessão do administrador (guardada só enquanto a aba estiver aberta). */
export const useAuthStore = defineStore('auth', () => {
  const token = ref(null);
  const user = ref(null);

  const isAuthenticated = computed(() => Boolean(token.value && user.value));

  /** Restaura a sessão da aba (chamado uma vez no boot). */
  function restore() {
    const saved = sessionStore.get(STORAGE_KEYS.session);
    if (saved?.token && saved?.user?.role === ROLES.ADMIN) {
      token.value = saved.token;
      user.value = saved.user;
    }
  }

  function clear() {
    token.value = null;
    user.value = null;
    sessionStore.remove(STORAGE_KEYS.session);
  }

  async function login(email, password) {
    const data = await authApi.login(email, password);

    // Quem não é admin nem entra no painel. (A API também bloqueia cada rota /admin.)
    if (data.user.role !== ROLES.ADMIN) throw new ApiError(403, 'NOT_ADMIN');

    token.value = data.token;
    user.value = data.user;
    sessionStore.set(STORAGE_KEYS.session, { token: data.token, user: data.user });
  }

  /** Troca a senha; o token antigo cai no servidor, então guardamos o novo. */
  async function changePassword(currentPassword, newPassword) {
    const data = await authApi.changePassword(currentPassword, newPassword);
    token.value = data.token;
    sessionStore.set(STORAGE_KEYS.session, { token: data.token, user: user.value });
  }

  return { token, user, isAuthenticated, restore, clear, login, changePassword };
});
