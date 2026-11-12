/**
 * Cliente HTTP compartilhado (app do cliente e painel admin).
 * Não depende de Vue nem de Capacitor: recebe tudo por parâmetro.
 */

/** Erro padronizado da API: `code` é estável e cada app o traduz para pt-BR (errors.*). */
export class ApiError extends Error {
  constructor(status, code, details) {
    super(code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * @param {object} options
 * @param {string} options.baseUrl         ex.: "http://localhost:3333/api/v1"
 * @param {() => string | null} [options.getToken]
 * @param {() => void} [options.onUnauthorized]  chamado em 401 numa rota autenticada
 * @param {number} [options.timeoutMs]
 */
export function createHttpClient({
  baseUrl,
  getToken = () => null,
  onUnauthorized = () => {},
  timeoutMs = 15_000,
}) {
  const buildUrl = (path, query) => {
    const url = new URL(`${baseUrl}${path}`);
    Object.entries(query ?? {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, value);
    });
    return url;
  };

  /**
   * @param {string} path  ex.: "/products"
   * @param {{ method?: string, body?: any, query?: object, auth?: boolean, formData?: FormData }} [options]
   */
  async function request(path, { method = 'GET', body, query, auth = true, formData } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const token = auth ? getToken() : null;
    if (token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetch(buildUrl(path, query), {
        method,
        headers,
        // FormData (upload): o navegador define o Content-Type com o boundary.
        body: formData ?? (body === undefined ? undefined : JSON.stringify(body)),
        signal: controller.signal,
      });
    } catch {
      throw new ApiError(0, 'NETWORK_ERROR');
    } finally {
      clearTimeout(timer);
    }

    if (response.status === 204) return null;

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const error = new ApiError(
        response.status,
        data?.error?.code ?? 'UNKNOWN',
        data?.error?.details,
      );

      // Token expirado/inválido numa rota autenticada: o app encerra a sessão local.
      if (response.status === 401 && token) onUnauthorized();
      throw error;
    }

    return data;
  }

  return { request };
}
