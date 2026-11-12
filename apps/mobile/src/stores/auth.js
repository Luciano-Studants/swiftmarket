import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import { STORAGE_KEYS, storage } from '@/core/storage.js';
import { authApi } from '@/features/auth/auth.api.js';
import { profileApi } from '@/features/profile/profile.api.js';

/** Sessão e perfil do usuário logado. */
export const useAuthStore = defineStore('auth', () => {
  const token = ref(null);
  const user = ref(null);
  /** Perfil completo (/me): endereço, preferências e contagens. */
  const profile = ref(null);
  const ready = ref(false);

  const isAuthenticated = computed(() => Boolean(token.value && user.value));
  const firstName = computed(() => user.value?.name?.split(' ')[0] ?? '');

  const persistSession = () =>
    storage.set(STORAGE_KEYS.session, { token: token.value, user: user.value });

  /** Limpa só o estado local (usado também quando a API devolve 401). */
  async function clearSession() {
    token.value = null;
    user.value = null;
    profile.value = null;
    await storage.remove(STORAGE_KEYS.session);
  }

  async function loadProfile() {
    profile.value = await profileApi.get();
    user.value = { ...user.value, name: profile.value.name };
    await persistSession();
  }

  /** Restaura a sessão salva no aparelho (chamado uma vez no boot). */
  async function restore() {
    const saved = await storage.get(STORAGE_KEYS.session);

    if (saved?.token && saved?.user) {
      token.value = saved.token;
      user.value = saved.user;

      try {
        await loadProfile();
      } catch (error) {
        // 401 já limpa a sessão via http.js; erro de rede mantém o login offline.
        if (error.status === 401) await clearSession();
      }
    }

    ready.value = true;
  }

  async function authenticate(request) {
    const data = await request();
    token.value = data.token;
    user.value = data.user;
    await persistSession();
    await loadProfile();
  }

  const login = (email, password) => authenticate(() => authApi.login(email, password));
  const register = (name, email, password) =>
    authenticate(() => authApi.register(name, email, password));
  const loginWithProvider = (provider) => authenticate(() => authApi.social(provider));

  /** Troca a senha; o token antigo é revogado no servidor, então guardamos o novo. */
  async function changePassword(currentPassword, newPassword) {
    const data = await authApi.changePassword(currentPassword, newPassword);
    token.value = data.token;
    await persistSession();
  }

  async function updateProfile(payload) {
    profile.value = { ...profile.value, ...(await profileApi.update(payload)) };
    user.value = { ...user.value, name: profile.value.name };
    await persistSession();
  }

  async function savePreferences(preferences) {
    const updated = await profileApi.savePreferences(preferences);
    profile.value = { ...profile.value, preferences: updated.preferences };
  }

  return {
    token,
    user,
    profile,
    ready,
    isAuthenticated,
    firstName,
    restore,
    login,
    register,
    loginWithProvider,
    loadProfile,
    updateProfile,
    changePassword,
    savePreferences,
    clearSession,
  };
});
