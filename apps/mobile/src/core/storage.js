import { Preferences } from '@capacitor/preferences';

/**
 * Armazenamento local do aparelho.
 * No Android usa SharedPreferences (via Capacitor); no navegador cai em localStorage.
 */
export const STORAGE_KEYS = Object.freeze({
  session: 'sm.session',
  cart: 'sm.cart',
  theme: 'sm.theme',
});

export const storage = {
  async get(key, fallback = null) {
    const { value } = await Preferences.get({ key });
    if (value == null) return fallback;

    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  },

  set: (key, value) => Preferences.set({ key, value: JSON.stringify(value) }),

  remove: (key) => Preferences.remove({ key }),
};
