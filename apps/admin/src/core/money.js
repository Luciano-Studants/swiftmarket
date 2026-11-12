/**
 * Conversão entre o texto digitado ("1.234,56") e centavos inteiros.
 * A API só trabalha com centavos; o formulário mostra reais.
 */

/**
 * @param {string} text  ex.: "159,50", "1.299", "R$ 45,00", "12.5"
 * @returns {number | null}  centavos, ou null se o texto não for um valor válido
 */
export function parseMoneyToCents(text) {
  const cleaned = String(text ?? '')
    .replace(/R\$/gi, '')
    .replace(/\s/g, '');
  if (!cleaned) return null;

  // Formato brasileiro: "." separa milhares e "," separa os centavos.
  // Aceita também ponto decimal ("12.5") quando não há vírgula e há no máximo 2 casas.
  let normalized;
  if (cleaned.includes(',')) {
    normalized = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (/^\d+\.\d{1,2}$/.test(cleaned)) {
    normalized = cleaned;
  } else {
    normalized = cleaned.replace(/\./g, '');
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  return Math.round(Number(normalized) * 100);
}

/** Centavos -> texto para o campo do formulário ("159,50"; 0 vira ""). */
export function centsToInput(cents) {
  if (!cents) return '';
  return (cents / 100).toFixed(2).replace('.', ',');
}
