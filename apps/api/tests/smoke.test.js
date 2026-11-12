import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';

import { buildApp } from '../src/app.js';
import { config as baseConfig } from '../src/config/env.js';
import { openDb } from '../src/db/connection.js';
import { bootstrap } from '../src/db/seed.js';

const BASE = '/api/v1';
let app;
let tmpDir;

/** Helper: chama a API em memória e devolve { status, body }. */
async function call(method, url, { token, body } = {}) {
  const response = await app.inject({
    method,
    url: `${BASE}${url}`,
    payload: body,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

  return {
    status: response.statusCode,
    body: response.body ? JSON.parse(response.body) : null,
  };
}

// A API limita logins (10/min por IP). Cada usuário loga uma única vez por execução.
const tokenCache = new Map();
const login = async (email, password) => {
  if (!tokenCache.has(email)) {
    const { body } = await call('POST', '/auth/login', { body: { email, password } });
    tokenCache.set(email, body.token);
  }
  return tokenCache.get(email);
};

before(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swiftmarket-test-'));

  const config = {
    ...baseConfig,
    dbFile: ':memory:',
    uploadDir: path.join(tmpDir, 'uploads'),
    jwtSecret: 'test-secret',
    corsOrigins: [],
    seedDemoData: true,
    enableSimulatedSocial: true,
  };

  const db = openDb(':memory:');
  bootstrap(db, config);
  app = await buildApp({ db, config });
});

after(async () => {
  await app.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('auth', () => {
  test('login válido retorna token e usuário', async () => {
    const { status, body } = await call('POST', '/auth/login', {
      body: { email: 'admin@swiftmarket.com', password: 'admin123' },
    });
    assert.equal(status, 200);
    assert.equal(body.user.role, 'admin');
    assert.ok(body.token);
    assert.equal(body.user.password_hash, undefined);
  });

  test('credenciais inválidas retornam 401 INVALID_CREDENTIALS', async () => {
    const { status, body } = await call('POST', '/auth/login', {
      body: { email: 'admin@swiftmarket.com', password: 'errada' },
    });
    assert.equal(status, 401);
    assert.equal(body.error.code, 'INVALID_CREDENTIALS');
  });

  test('cadastro cria sempre papel "user" e bloqueia e-mail duplicado', async () => {
    const created = await call('POST', '/auth/register', {
      body: { name: 'Maria Teste', email: 'Maria@Teste.com', password: 'segredo1', role: 'admin' },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.user.role, 'user');
    assert.equal(created.body.user.email, 'maria@teste.com');

    const duplicate = await call('POST', '/auth/register', {
      body: { name: 'Maria 2', email: 'maria@teste.com', password: 'segredo1' },
    });
    assert.equal(duplicate.status, 409);
  });
});

describe('catálogo', () => {
  test('filtra por categoria e busca por texto', async () => {
    const byCategory = await call('GET', '/products?category=fashion');
    assert.ok(byCategory.body.items.length > 0);
    assert.ok(byCategory.body.items.every((p) => p.category === 'fashion'));

    const bySearch = await call('GET', '/products?q=teclado');
    assert.equal(bySearch.body.items.length, 1);
  });

  test('ordenação por preço usa o preço efetivo (promoção)', async () => {
    const { body } = await call('GET', '/products?sort=price_asc&limit=3');
    const prices = body.items.map((p) => (p.promoCents > 0 ? p.promoCents : p.priceCents));
    assert.deepEqual(
      prices,
      [...prices].sort((a, b) => a - b),
    );
  });

  test('filtra por lista de ids e rejeita ids inválidos', async () => {
    const { body } = await call('GET', '/products?ids=1,5&limit=50');
    assert.deepEqual(body.items.map((p) => p.id).sort(), [1, 5]);

    assert.equal((await call('GET', '/products?ids=1;DROP')).status, 400);
  });

  test('produto inexistente retorna 404', async () => {
    const { status, body } = await call('GET', '/products/9999');
    assert.equal(status, 404);
    assert.equal(body.error.code, 'PRODUCT_NOT_FOUND');
  });
});

describe('autorização', () => {
  test('sem token -> 401; usuário comum -> 403; admin -> 200', async () => {
    assert.equal((await call('GET', '/admin/dashboard')).status, 401);

    const userToken = await login('john.doe@swiftmarket.io', 'user123');
    assert.equal((await call('GET', '/admin/dashboard', { token: userToken })).status, 403);
    assert.equal((await call('GET', '/admin/users', { token: userToken })).status, 403);

    const adminToken = await login('admin@swiftmarket.com', 'admin123');
    assert.equal((await call('GET', '/admin/dashboard', { token: adminToken })).status, 200);
  });
});

describe('pedidos', () => {
  test('recalcula totais no servidor, baixa estoque e respeita regras', async () => {
    const token = await login('john.doe@swiftmarket.io', 'user123');

    // Sem endereço salvo e sem endereço no pedido -> 400.
    const noAddress = await call('POST', '/orders', {
      token,
      body: { items: [{ productId: 5, quantity: 2 }], paymentMethod: 'pix' },
    });
    assert.equal(noAddress.body.error.code, 'ADDRESS_REQUIRED');

    await call('PATCH', '/me', { token, body: { address: 'Rua das Flores, 100 - Macapá/AP' } });

    // Luminária (R$ 45,00) x2 = 9.000; frete 1.200; imposto 8,5% = 765 -> 10.965.
    const order = await call('POST', '/orders', {
      token,
      body: {
        items: [
          { productId: 5, quantity: 1 },
          { productId: 5, quantity: 1 },
        ],
        paymentMethod: 'pix',
      },
    });
    assert.equal(order.status, 201);
    assert.equal(order.body.items.length, 1, 'itens repetidos são agrupados');
    assert.equal(order.body.subtotalCents, 9000);
    assert.equal(order.body.shippingCents, 1200);
    assert.equal(order.body.taxCents, 765);
    assert.equal(order.body.totalCents, 10965);

    const product = await call('GET', '/products/5');
    assert.equal(product.body.stock, 40);

    // Estoque insuficiente (produto 10 tem 3) e produto indisponível (11).
    const tooMany = await call('POST', '/orders', {
      token,
      body: { items: [{ productId: 10, quantity: 4 }], paymentMethod: 'pix' },
    });
    assert.equal(tooMany.status, 409);
    assert.equal(tooMany.body.error.code, 'INSUFFICIENT_STOCK');

    const unavailable = await call('POST', '/orders', {
      token,
      body: { items: [{ productId: 11, quantity: 1 }], paymentMethod: 'pix' },
    });
    assert.equal(unavailable.status, 409);

    // Falha não deixa estoque pela metade.
    assert.equal((await call('GET', '/products/10')).body.stock, 3);

    const history = await call('GET', '/me/orders', { token });
    assert.equal(history.body.total, 1);
  });

  test('pedido de outro usuário aparece como 404', async () => {
    const owner = await login('john.doe@swiftmarket.io', 'user123');
    const { body: list } = await call('GET', '/me/orders', { token: owner });
    const orderId = list.items[0].id;

    const stranger = (
      await call('POST', '/auth/register', {
        body: { name: 'Outra Pessoa', email: 'outra@teste.com', password: 'segredo1' },
      })
    ).body.token;

    assert.equal((await call('GET', `/orders/${orderId}`, { token: stranger })).status, 404);
    assert.equal((await call('GET', `/orders/${orderId}`, { token: owner })).status, 200);
  });
});

describe('favoritos', () => {
  test('adicionar é idempotente, listar e remover', async () => {
    const token = await login('john.doe@swiftmarket.io', 'user123');

    assert.equal((await call('PUT', '/me/favorites/2', { token })).status, 204);
    assert.equal((await call('PUT', '/me/favorites/2', { token })).status, 204);

    const list = await call('GET', '/me/favorites', { token });
    assert.equal(list.body.length, 1);

    assert.equal((await call('DELETE', '/me/favorites/2', { token })).status, 204);
    assert.equal((await call('GET', '/me/favorites', { token })).body.length, 0);
  });
});

describe('admin', () => {
  test('rascunho não aparece na vitrine; promoção inválida é rejeitada', async () => {
    const token = await login('admin@swiftmarket.com', 'admin123');

    const invalidPromo = await call('POST', '/admin/products', {
      token,
      body: {
        name: 'Produto Teste',
        category: 'toys',
        priceCents: 1000,
        promoCents: 1500,
        stock: 5,
      },
    });
    assert.equal(invalidPromo.status, 400);

    const draft = await call('POST', '/admin/products', {
      token,
      body: {
        name: 'Rascunho Secreto',
        category: 'toys',
        priceCents: 1000,
        stock: 5,
        status: 'draft',
      },
    });
    assert.equal(draft.status, 201);

    assert.equal((await call('GET', `/products/${draft.body.id}`)).status, 404);
    assert.equal((await call('GET', `/admin/products/${draft.body.id}`, { token })).status, 200);
  });

  test('filtro por status: admin enxerga rascunhos; a vitrine nunca', async () => {
    const token = await login('admin@swiftmarket.com', 'admin123');

    const adminDrafts = await call('GET', '/admin/products?status=draft', { token });
    assert.equal(adminDrafts.status, 200);
    assert.ok(adminDrafts.body.items.length >= 1);
    assert.ok(adminDrafts.body.items.every((p) => p.status === 'draft'));

    // Pedir status=draft na vitrine pública não deve vazar rascunhos.
    const publicDrafts = await call('GET', '/products?status=draft');
    assert.equal(publicDrafts.body.items.length, 0);

    const outOfStock = await call('GET', '/admin/products?status=out_of_stock', { token });
    assert.deepEqual(
      outOfStock.body.items.map((p) => p.id),
      [11],
    );
  });

  test('pedidos do admin trazem o cliente e filtram por status', async () => {
    const token = await login('admin@swiftmarket.com', 'admin123');

    const all = await call('GET', '/admin/orders', { token });
    assert.equal(all.body.total, 1);
    assert.equal(all.body.items[0].customer.email, 'john.doe@swiftmarket.io');
    assert.equal(all.body.items[0].customer.name, 'John Doe');

    const orderId = all.body.items[0].id;
    assert.equal((await call('GET', '/admin/orders?status=shipped', { token })).body.total, 0);

    const updated = await call('PATCH', `/admin/orders/${orderId}/status`, {
      token,
      body: { status: 'shipped' },
    });
    assert.equal(updated.body.status, 'shipped');
    assert.equal((await call('GET', '/admin/orders?status=shipped', { token })).body.total, 1);

    assert.equal((await call('GET', '/admin/orders?status=inventado', { token })).status, 400);
    assert.equal(
      (
        await call('PATCH', `/admin/orders/${orderId}/status`, {
          token,
          body: { status: 'inventado' },
        })
      ).status,
      400,
    );
  });

  test('dashboard reflete os pedidos reais', async () => {
    const token = await login('admin@swiftmarket.com', 'admin123');
    const { body } = await call('GET', '/admin/dashboard', { token });

    assert.equal(body.totals.orders, 1);
    assert.equal(body.totals.salesCents, 10965);
    assert.equal(body.salesLast7Days.length, 7);
    assert.equal(body.salesLast7Days.at(-1).totalCents, 10965);
    assert.ok(body.lowStock.some((p) => p.id === 10));
  });
});
