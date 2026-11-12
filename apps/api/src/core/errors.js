/**
 * Erro de domínio. O `code` é estável (os apps traduzem para pt-BR via i18n);
 * nunca devolvemos mensagens de texto livres ao cliente.
 */
export class AppError extends Error {
  constructor(status, code, details) {
    super(code);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const notFound = (code = 'NOT_FOUND') => new AppError(404, code);
