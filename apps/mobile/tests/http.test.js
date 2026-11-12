import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { errorMessage } from '@/core/errors.js';
import { ApiError, configureHttp, request } from '@/core/http.js';

const json = (status, body) =>
  Promise.resolve(new Response(body === null ? null : JSON.stringify(body), { status }));

let unauthorized;

beforeEach(() => {
  unauthorized = vi.fn();
  configureHttp({ getToken: () => 'tok-123', onUnauthorized: unauthorized });
});

afterEach(() => vi.unstubAllGlobals());

describe('cliente HTTP', () => {
  test('envia o token, o corpo JSON e filtra parâmetros vazios na query', async () => {
    const fetchMock = vi.fn(() => json(200, { ok: true }));
    vi.stubGlobal('fetch', fetchMock);

    await request('/products', { query: { q: 'fone', category: '', page: 2 } });
    await request('/orders', { method: 'POST', body: { a: 1 } });

    const [firstUrl, firstInit] = fetchMock.mock.calls[0];
    expect(String(firstUrl)).toContain('/api/v1/products?q=fone&page=2');
    expect(firstInit.headers.Authorization).toBe('Bearer tok-123');

    const [, secondInit] = fetchMock.mock.calls[1];
    expect(secondInit.headers['Content-Type']).toBe('application/json');
    expect(secondInit.body).toBe('{"a":1}');
  });

  test('rotas públicas (auth: false) não enviam token', async () => {
    const fetchMock = vi.fn(() => json(200, {}));
    vi.stubGlobal('fetch', fetchMock);

    await request('/auth/login', { method: 'POST', auth: false, body: {} });
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });

  test('204 devolve null', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => json(204, null)),
    );
    expect(await request('/me/favorites/1', { method: 'PUT' })).toBeNull();
  });

  test('erro da API vira ApiError com código estável e mensagem em pt-BR', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => json(409, { error: { code: 'INSUFFICIENT_STOCK', details: { productId: 3 } } })),
    );

    const error = await request('/orders', { method: 'POST', body: {} }).catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('INSUFFICIENT_STOCK');
    expect(error.details).toEqual({ productId: 3 });
    expect(errorMessage(error)).toBe('Um item do carrinho não tem estoque suficiente.');
  });

  test('401 em rota autenticada encerra a sessão', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => json(401, { error: { code: 'UNAUTHENTICATED' } })),
    );

    await request('/me').catch(() => {});
    expect(unauthorized).toHaveBeenCalledTimes(1);
  });

  test('401 de login inválido (sem token) NÃO dispara logout', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => json(401, { error: { code: 'INVALID_CREDENTIALS' } })),
    );

    await request('/auth/login', { method: 'POST', auth: false, body: {} }).catch(() => {});
    expect(unauthorized).not.toHaveBeenCalled();
  });

  test('falha de rede vira NETWORK_ERROR; código desconhecido cai na mensagem genérica', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );

    const error = await request('/products').catch((e) => e);
    expect(error.code).toBe('NETWORK_ERROR');
    expect(errorMessage(error)).toContain('Sem conexão');

    expect(errorMessage({ code: 'ALGO_NOVO' })).toBe('Algo deu errado. Tente novamente.');
    expect(errorMessage(undefined)).toBe('Algo deu errado. Tente novamente.');
  });
});
