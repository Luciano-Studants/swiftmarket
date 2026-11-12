import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';
import Database from 'better-sqlite3';

import { buildApp } from '../src/app.js';
import { config as baseConfig } from '../src/config/env.js';
import { openDb } from '../src/db/connection.js';
import { MIGRATIONS, migrate } from '../src/db/migrations.js';
import { bootstrap } from '../src/db/seed.js';

const BASE = '/api/v1';
let app;
let db;
let tmpDir;
const tokens = {};

async function call(method, url, { token, body } = {}) {
  const response = await app.inject({
    method,
    url: `${BASE}${url}`,
    payload: body,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return { status: response.statusCode, body: response.body ? JSON.parse(response.body) : null };
}

const stockOf = (id) => db.prepare('SELECT stock FROM products WHERE id = ?').get(id).stock;

/** Cria um pedido de `quantity` unidades do produto 5 pelo cliente demo. */
async function placeOrder(quantity = 2) {
  const { body, status } = await call('POST', '/orders', {
    token: tokens.user,
    body: { items: [{ productId: 5, quantity }], paymentMethod: 'pix' },
  });
  assert.equal(status, 201);
  return body;
}

before(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swiftmarket-lifecycle-'));
  const config = {
    ...baseConfig,
    uploadDir: path.join(tmpDir, 'uploads'),
    jwtSecret: 'test-secret',
    corsOrigins: [],
    seedDemoData: true,
    enableSimulatedSocial: true,
  };

  db = openDb(':memory:');
  bootstrap(db, config);
  app = await buildApp({ db, config });

  tokens.user = (
    await call('POST', '/auth/login', {
      body: { email: 'john.doe@swiftmarket.io', password: 'user123' },
    })
  ).body.token;
  tokens.admin = (
    await call('POST', '/auth/login', {
      body: { email: 'admin@swiftmarket.com', password: 'admin123' },
    })
  ).body.token;

  await call('PATCH', '/me', { token: tokens.user, body: { address: 'Rua das Flores, 100' } });
});

after(async () => {
  await app.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('ciclo de vida do pedido', () => {
  test('novo pedido nasce confirmado com histórico', async () => {
    const order = await placeOrder(1);
    assert.equal(order.status, 'confirmed');
    assert.deepEqual(
      order.history.map((event) => event.status),
      ['confirmed'],
    );
  });

  test('cliente cancela o próprio pedido e o estoque volta', async () => {
    const before = stockOf(5);
    const order = await placeOrder(3);
    assert.equal(stockOf(5), before - 3);

    const cancelled = await call('POST', `/orders/${order.id}/cancel`, { token: tokens.user });
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.status, 'cancelled');
    assert.deepEqual(
      cancelled.body.history.map((event) => event.status),
      ['confirmed', 'cancelled'],
    );
    assert.equal(stockOf(5), before, 'estoque devolvido');
  });

  test('cancelar duas vezes não devolve o estoque em dobro', async () => {
    const order = await placeOrder(2);
    const before = stockOf(5);

    await call('POST', `/orders/${order.id}/cancel`, { token: tokens.user });
    const again = await call('POST', `/orders/${order.id}/cancel`, { token: tokens.user });

    assert.equal(again.status, 409);
    assert.equal(again.body.error.code, 'INVALID_STATUS_TRANSITION');
    assert.equal(stockOf(5), before + 2, 'devolveu uma única vez');
  });

  test('não cancela depois de enviado; fluxo segue até entregue e é final', async () => {
    const order = await placeOrder(1);
    const patch = (status) =>
      call('PATCH', `/admin/orders/${order.id}/status`, { token: tokens.admin, body: { status } });

    assert.equal((await patch('delivered')).status, 409, 'não pula etapa');
    assert.equal((await patch('shipped')).status, 200);

    const late = await call('POST', `/orders/${order.id}/cancel`, { token: tokens.user });
    assert.equal(late.body.error.code, 'INVALID_STATUS_TRANSITION');

    assert.equal((await patch('delivered')).status, 200);
    assert.equal((await patch('confirmed')).status, 409, 'entregue é final');
  });

  test('admin cancela e o estoque volta; não reabre pedido cancelado', async () => {
    const before = stockOf(5);
    const order = await placeOrder(2);

    const res = await call('PATCH', `/admin/orders/${order.id}/status`, {
      token: tokens.admin,
      body: { status: 'cancelled' },
    });
    assert.equal(res.status, 200);
    assert.equal(stockOf(5), before);

    const reopen = await call('PATCH', `/admin/orders/${order.id}/status`, {
      token: tokens.admin,
      body: { status: 'confirmed' },
    });
    assert.equal(reopen.status, 409);
  });

  test('outro usuário recebe 404 ao cancelar; cliente não avança status', async () => {
    const order = await placeOrder(1);

    const other = (
      await call('POST', '/auth/register', {
        body: { name: 'Outra Pessoa', email: 'outra@teste.com', password: 'senha1234' },
      })
    ).body.token;

    const res = await call('POST', `/orders/${order.id}/cancel`, { token: other });
    assert.equal(res.status, 404);

    const viaAdminRoute = await call('PATCH', `/admin/orders/${order.id}/status`, {
      token: tokens.user,
      body: { status: 'shipped' },
    });
    assert.equal(viaAdminRoute.status, 403);
  });

  test('cancelar pedido cujo produto foi excluído não quebra', async () => {
    const order = await placeOrder(1);
    db.prepare('DELETE FROM products WHERE id = 5').run(); // product_id vira NULL no item

    const res = await call('POST', `/orders/${order.id}/cancel`, { token: tokens.user });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'cancelled');
  });
});

describe('migration 2 (cancelled + histórico)', () => {
  test('preserva pedidos e itens existentes e cria o histórico', () => {
    const old = new Database(':memory:');
    old.pragma('foreign_keys = ON');
    old.exec(MIGRATIONS[0]);
    old.pragma('user_version = 1');

    old
      .prepare("INSERT INTO users (email, name, password_hash) VALUES ('a@b.com', 'A', 'x')")
      .run();
    old
      .prepare(
        `INSERT INTO orders (id, user_id, status, payment_method, address,
           subtotal_cents, shipping_cents, tax_cents, total_cents)
         VALUES ('SM-OLD1', 1, 'shipped', 'pix', 'Rua X, 1', 1000, 0, 85, 1085)`,
      )
      .run();
    old
      .prepare(
        `INSERT INTO order_items (order_id, product_id, name, unit_price_cents, quantity)
         VALUES ('SM-OLD1', NULL, 'Item', 1000, 1)`,
      )
      .run();

    migrate(old);

    assert.equal(old.pragma('user_version', { simple: true }), MIGRATIONS.length);
    assert.equal(old.pragma('foreign_keys', { simple: true }), 1, 'foreign_keys religado');
    assert.equal(old.prepare('SELECT COUNT(*) AS n FROM order_items').get().n, 1, 'itens mantidos');
    assert.deepEqual(
      old
        .prepare("SELECT status FROM order_events WHERE order_id = 'SM-OLD1' ORDER BY id")
        .all()
        .map((row) => row.status),
      ['confirmed', 'shipped'],
    );
    assert.doesNotThrow(() => old.prepare("UPDATE orders SET status = 'cancelled'").run());
    old.close();
  });
});
