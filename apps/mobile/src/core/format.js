import { i18n } from '@/i18n/index.js';

/** Data curta no idioma do app (ex.: 12/11/2026). */
export const formatDate = (iso) =>
  new Intl.DateTimeFormat(i18n.global.locale.value, { dateStyle: 'short' }).format(new Date(iso));

/** Data e hora curtas no idioma do app. */
export const formatDateTime = (iso) =>
  new Intl.DateTimeFormat(i18n.global.locale.value, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
