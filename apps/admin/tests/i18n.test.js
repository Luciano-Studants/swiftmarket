import { describe, expect, test } from 'vitest';

import { errorMessage } from '@/core/errors.js';
import { i18n } from '@/i18n/index.js';
import ptBR from '@/i18n/pt-BR.js';

/** Percorre o objeto de mensagens e devolve todas as chaves-folha ("auth.email", ...). */
function leafKeys(node, prefix = '') {
  return Object.entries(node).flatMap(([key, value]) =>
    typeof value === 'object' ? leafKeys(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
}

const PARAMS = { page: 2, total: 5, count: 3, name: 'Teclado' };

describe('mensagens pt-BR do admin', () => {
  const keys = leafKeys(ptBR);

  test('existem mensagens para testar', () => {
    expect(keys.length).toBeGreaterThan(100);
  });

  // "@", "|" ou "{" mal escapado quebra a tela inteira em tempo de execução.
  test.each(keys)('compila sem erro: %s', (key) => {
    const text = i18n.global.t(key, PARAMS);
    expect(typeof text).toBe('string');
    expect(text).not.toBe(key);
    expect(text).not.toMatch(/\{\w+\}/);
  });

  test('o "@" do placeholder de e-mail aparece literalmente', () => {
    expect(i18n.global.t('auth.emailPlaceholder')).toBe('admin@suaempresa.com');
  });

  test('erros da API viram mensagens; códigos desconhecidos caem no genérico', () => {
    expect(errorMessage({ code: 'NOT_ADMIN' })).toContain('administrador');
    expect(errorMessage({ code: 'FILE_TOO_LARGE' })).toContain('1,5 MB');
    expect(errorMessage({ code: 'NOVO_CODIGO' })).toBe('Algo deu errado. Tente novamente.');
  });
});
