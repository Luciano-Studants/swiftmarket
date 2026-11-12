import { i18n, t } from '@/i18n/index.js';

/** Converte qualquer erro em mensagem pt-BR para exibir ao usuário. */
export function errorMessage(error) {
  const code = error?.code;
  const key = `errors.${code}`;
  return code && i18n.global.te(key) ? t(key) : t('errors.UNKNOWN');
}
