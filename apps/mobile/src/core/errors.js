import { formatMoney } from '@swiftmarket/shared';

import { i18n, t } from '@/i18n/index.js';

/** Converte qualquer erro em mensagem pt-BR para exibir ao usuário. */
export function errorMessage(error) {
  const code = error?.code;
  const key = `errors.${code}`;
  if (!(code && i18n.global.te(key))) return t('errors.UNKNOWN');

  // Alguns erros trazem dados para a mensagem (ex.: valor mínimo do cupom).
  const min = error.details?.minCents;
  return t(key, { min: min === undefined ? '' : formatMoney(min) });
}
