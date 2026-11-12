import { COMMERCE } from './constants.js';

/** Formata centavos como moeda (padrão: R$ 1.234,56). */
export function formatMoney(
  cents,
  { locale = COMMERCE.LOCALE, currency = COMMERCE.CURRENCY } = {},
) {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
}
