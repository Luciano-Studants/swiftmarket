import { describe, expect, test } from 'vitest';

import { centsToInput, parseMoneyToCents } from '@/core/money.js';

describe('parseMoneyToCents', () => {
  test.each([
    ['159,50', 15950],
    ['1.299,90', 129990],
    ['R$ 45,00', 4500],
    ['45', 4500],
    ['1.299', 129900], // ponto como separador de milhar
    ['12.5', 1250], // ponto decimal (até 2 casas)
    ['0,99', 99],
    ['  7,5 ', 750],
  ])('"%s" -> %i centavos', (text, cents) => {
    expect(parseMoneyToCents(text)).toBe(cents);
  });

  test.each([['abc'], ['1,2,3'], ['-5'], ['10,999'], [''], ['   '], [null], [undefined]])(
    'valor inválido %j -> null',
    (text) => {
      expect(parseMoneyToCents(text)).toBeNull();
    },
  );

  test('não perde centavos por arredondamento de ponto flutuante', () => {
    expect(parseMoneyToCents('19,99')).toBe(1999);
    expect(parseMoneyToCents('0,29')).toBe(29);
    expect(parseMoneyToCents('1.005,05')).toBe(100505);
  });
});

describe('centsToInput', () => {
  test('formata com vírgula e duas casas; zero vira vazio', () => {
    expect(centsToInput(15950)).toBe('159,50');
    expect(centsToInput(99)).toBe('0,99');
    expect(centsToInput(0)).toBe('');
    expect(centsToInput(undefined)).toBe('');
  });

  test('ida e volta preserva o valor', () => {
    for (const cents of [1, 99, 100, 12345, 99999999]) {
      expect(parseMoneyToCents(centsToInput(cents))).toBe(cents);
    }
  });
});
