import { describe, expect, test } from 'vitest';

import { i18n } from '@/i18n/index.js';
import ptBR from '@/i18n/pt-BR.js';

/** Percorre o objeto de mensagens e devolve todas as chaves-folha ("auth.email", ...). */
function leafKeys(node, prefix = '') {
  return Object.entries(node).flatMap(([key, value]) =>
    typeof value === 'object' ? leafKeys(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  );
}

// Valores de exemplo para qualquer {placeholder} usado nas mensagens.
const PARAMS = {
  name: 'Maria',
  count: 3,
  shown: 4,
  total: 'R$ 10,00',
  rating: 4.5,
  id: 'SM-1',
  amount: 'R$ 500,00',
};

describe('mensagens pt-BR', () => {
  const keys = leafKeys(ptBR);

  test('existem mensagens para testar', () => {
    expect(keys.length).toBeGreaterThan(100);
  });

  // Mensagem com "@", "|" ou "{" mal escapado quebra a tela inteira em tempo de execução.
  test.each(keys)('compila sem erro: %s', (key) => {
    const text = i18n.global.t(key, PARAMS);
    expect(typeof text).toBe('string');
    expect(text).not.toBe(key);
    expect(text).not.toMatch(/\{\w+\}/); // nenhum placeholder ficou sem preencher
  });

  test('o "@" do placeholder de e-mail aparece literalmente', () => {
    expect(i18n.global.t('auth.emailPlaceholder')).toBe('voce@exemplo.com');
  });
});
