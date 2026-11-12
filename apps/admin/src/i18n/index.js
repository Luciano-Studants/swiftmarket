import { createI18n } from 'vue-i18n';

import ptBR from './pt-BR.js';

export const i18n = createI18n({
  legacy: false,
  locale: 'pt-BR',
  fallbackLocale: 'pt-BR',
  messages: { 'pt-BR': ptBR },
});

/** Atalho para usar traduções fora de componentes (stores, utilitários). */
export const t = (key, params) => i18n.global.t(key, params ?? {});
