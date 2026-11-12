const rawApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';

/** Origem da API (sem barra final e sem /api/v1). */
export const API_ORIGIN = rawApiUrl.replace(/\/+$/, '');
export const API_BASE = `${API_ORIGIN}/api/v1`;

export const REQUEST_TIMEOUT_MS = 15_000;

/** Botões Google/Apple simulados: sempre em dev; em produção só com VITE_ENABLE_SOCIAL=true. */
export const SOCIAL_LOGIN_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_SOCIAL === 'true';

/** Dica com contas demo na tela de login: nunca vai para o APK de produção. */
export const SHOW_DEMO_HINT = import.meta.env.DEV;

/** Imagens de produto vêm como "/uploads/arquivo.png": completa com a origem da API. */
export const assetUrl = (path) => {
  if (!path) return null;
  return /^https?:\/\//.test(path) ? path : `${API_ORIGIN}${path}`;
};
