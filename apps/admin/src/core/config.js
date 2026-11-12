const rawApiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3333';

/** Origem da API (sem barra final e sem /api/v1). */
export const API_ORIGIN = rawApiUrl.replace(/\/+$/, '');
export const API_BASE = `${API_ORIGIN}/api/v1`;

/** Imagens de produto vêm como "/uploads/arquivo.png": completa com a origem da API. */
export const assetUrl = (path) => {
  if (!path) return null;
  return /^https?:\/\//.test(path) ? path : `${API_ORIGIN}${path}`;
};

/** Itens por página nas listas do painel. */
export const PAGE_SIZE = 10;
