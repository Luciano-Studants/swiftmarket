/**
 * Armazenamento no navegador, sempre protegido por try/catch (modo privado ou
 * dados bloqueados podem lançar exceção).
 *
 * A SESSÃO fica em sessionStorage: some ao fechar a aba. Num painel administrativo
 * isso é preferível a manter o token por semanas em localStorage.
 * O TEMA é preferência do aparelho e fica em localStorage.
 */
export const STORAGE_KEYS = Object.freeze({
  session: 'sm.admin.session',
  theme: 'sm.admin.theme',
});

const read = (store, key, fallback) => {
  try {
    const raw = store.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const write = (store, key, value) => {
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    // Sem armazenamento: o app segue funcionando, só não lembra.
  }
};

const erase = (store, key) => {
  try {
    store.removeItem(key);
  } catch {
    // ignorado
  }
};

export const sessionStore = {
  get: (key, fallback = null) => read(window.sessionStorage, key, fallback),
  set: (key, value) => write(window.sessionStorage, key, value),
  remove: (key) => erase(window.sessionStorage, key),
};

export const deviceStore = {
  get: (key, fallback = null) => read(window.localStorage, key, fallback),
  set: (key, value) => write(window.localStorage, key, value),
  remove: (key) => erase(window.localStorage, key),
};
