import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

import { createTestApp } from './helpers.js';

let ctx;
const tokens = {};

const mine = (token = tokens.user) => ctx.call('GET', '/me/notifications', { token });
const place = async () =>
  (
    await ctx.call('POST', '/orders', {
      token: tokens.user,
      body: { items: [{ productId: 5, quantity: 1 }], paymentMethod: 'pix' },
    })
  ).body;
const setStatus = (id, status) =>
  ctx.call('PATCH', `/admin/orders/${id}/status`, { token: tokens.admin, body: { status } });

before(async () => {
  ctx = await createTestApp();
  tokens.user = await ctx.login('john.doe@swiftmarket.io', 'user123');
  tokens.admin = await ctx.login('admin@swiftmarket.com', 'admin123');
  await ctx.call('PATCH', '/me', { token: tokens.user, body: { address: 'Rua das Flores, 100' } });
});

after(() => ctx.close());

describe('notificações', () => {
  test('começa vazio', async () => {
    const res = await mine();
    assert.equal(res.body.unread, 0);
    assert.equal(res.body.items.length, 0);
  });

  test('o cliente cancelando o próprio pedido não gera notificação', async () => {
    const order = await place();
    await ctx.call('POST', `/orders/${order.id}/cancel`, { token: tokens.user });
    assert.equal((await mine()).body.unread, 0);
  });

  test('mudança feita pelo admin notifica o dono do pedido, com dados estruturados', async () => {
    const order = await place();
    await setStatus(order.id, 'shipped');

    const { body } = await mine();
    assert.equal(body.unread, 1);
    assert.equal(body.items[0].type, 'order_status');
    assert.deepEqual(body.items[0].data, { orderId: order.id, status: 'shipped' });
    assert.equal(body.items[0].read, false);

    // O admin não recebe notificação do pedido de outra pessoa.
    assert.equal((await mine(tokens.admin)).body.items.length, 0);
  });

  test('contador leve e marcar como lida', async () => {
    const count = await ctx.call('GET', '/me/notifications/unread-count', { token: tokens.user });
    assert.deepEqual(count.body, { unread: 1 });

    const id = (await mine()).body.items[0].id;
    assert.equal(
      (await ctx.call('POST', `/me/notifications/${id}/read`, { token: tokens.user })).status,
      204,
    );
    assert.equal((await mine()).body.unread, 0);
    // Idempotente.
    assert.equal(
      (await ctx.call('POST', `/me/notifications/${id}/read`, { token: tokens.user })).status,
      204,
    );
  });

  test('ordem mais recente primeiro e "marcar todas"', async () => {
    const order = await place();
    await setStatus(order.id, 'shipped');
    await setStatus(order.id, 'delivered');

    const { body } = await mine();
    assert.equal(body.unread, 2);
    assert.equal(body.items[0].data.status, 'delivered');

    await ctx.call('POST', '/me/notifications/read-all', { token: tokens.user });
    assert.equal((await mine()).body.unread, 0);
  });

  test('não mexe em notificação de outra pessoa; sem login não acessa', async () => {
    const id = (await mine()).body.items[0].id;
    assert.equal(
      (await ctx.call('POST', `/me/notifications/${id}/read`, { token: tokens.admin })).status,
      404,
    );
    assert.equal((await ctx.call('GET', '/me/notifications')).status, 401);
  });
});

describe('painel de vendas', () => {
  test('pedido cancelado não conta como venda', async () => {
    const dash = async () =>
      (await ctx.call('GET', '/admin/dashboard', { token: tokens.admin })).body;
    const before = await dash();

    const order = await place();
    const afterOrder = await dash();
    assert.equal(afterOrder.totals.orders, before.totals.orders + 1);
    assert.equal(afterOrder.totals.salesCents, before.totals.salesCents + order.totalCents);

    await ctx.call('POST', `/orders/${order.id}/cancel`, { token: tokens.user });
    const afterCancel = await dash();
    assert.equal(afterCancel.totals.orders, before.totals.orders);
    assert.equal(afterCancel.totals.salesCents, before.totals.salesCents);
    const today = afterCancel.salesLast7Days.at(-1);
    assert.equal(today.totalCents, before.salesLast7Days.at(-1).totalCents);
  });
});
