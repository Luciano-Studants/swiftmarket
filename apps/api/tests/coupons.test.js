import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

import { createTestApp } from './helpers.js';

let ctx;
let productId;
const tokens = {};

const admin = (method, url, body) => ctx.call(method, url, { token: tokens.admin, body });
const createCoupon = (body) =>
  admin('POST', '/admin/coupons', { type: 'percent', value: 10, ...body });
const items = (quantity = 1) => [{ productId, quantity }];
const preview = (couponCode, token = tokens.user, quantity = 1) =>
  ctx.call('POST', '/orders/preview', { token, body: { items: items(quantity), couponCode } });
const buy = (couponCode, token = tokens.user, extra = {}) =>
  ctx.call('POST', '/orders', {
    token,
    body: { items: items(), paymentMethod: 'pix', couponCode, ...extra },
  });

before(async () => {
  ctx = await createTestApp();
  tokens.user = await ctx.login('john.doe@swiftmarket.io', 'user123');
  tokens.admin = await ctx.login('admin@swiftmarket.com', 'admin123');
  await ctx.call('PATCH', '/me', { token: tokens.user, body: { address: 'Rua das Flores, 100' } });

  // Produto de preço conhecido (R$ 100,00) para as contas ficarem verificáveis.
  productId = (
    await admin('POST', '/admin/products', {
      name: 'Produto de Teste',
      category: 'electronics',
      priceCents: 10_000,
      stock: 100,
    })
  ).body.id;
});

after(() => ctx.close());

describe('cupons (administração)', () => {
  test('código é normalizado em caixa alta e não repete', async () => {
    const created = await createCoupon({ code: 'promo10' });
    assert.equal(created.status, 201);
    assert.equal(created.body.code, 'PROMO10');
    assert.equal((await createCoupon({ code: 'Promo10' })).body.error.code, 'COUPON_CODE_TAKEN');
  });

  test('regras de validação: percentual até 90, valor positivo, código válido', async () => {
    assert.equal((await createCoupon({ code: 'TUDO100', value: 100 })).status, 400);
    assert.equal((await createCoupon({ code: 'ZERO', value: 0 })).status, 400);
    assert.equal((await createCoupon({ code: 'a b' })).status, 400);
    assert.equal((await createCoupon({ code: 'FIXO', type: 'fixed', value: 5_000 })).status, 201);
  });

  test('cliente não administra cupons', async () => {
    const res = await ctx.call('POST', '/admin/coupons', {
      token: tokens.user,
      body: { code: 'HACK', type: 'percent', value: 50 },
    });
    assert.equal(res.status, 403);
  });
});

describe('cupom no pedido', () => {
  test('pré-visualização: desconto sobre o subtotal, imposto sobre o valor descontado', async () => {
    const res = await preview('promo10'); // minúsculas também vale
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, {
      subtotalCents: 10_000,
      discountCents: 1_000,
      shippingCents: 1_200,
      taxCents: 765, // 9.000 * 8,5%
      totalCents: 10_965,
      couponCode: 'PROMO10',
    });
  });

  test('o pedido criado bate com a pré-visualização e consome o cupom', async () => {
    const order = await buy('PROMO10');
    assert.equal(order.status, 201);
    assert.equal(order.body.discountCents, 1_000);
    assert.equal(order.body.couponCode, 'PROMO10');
    assert.equal(order.body.totalCents, 10_965);

    const list = (await admin('GET', '/admin/coupons')).body.items;
    assert.equal(list.find((c) => c.code === 'PROMO10').uses, 1);
  });

  test('o mesmo cliente não usa o cupom duas vezes', async () => {
    const again = await buy('PROMO10');
    assert.equal(again.status, 400);
    assert.equal(again.body.error.code, 'COUPON_ALREADY_USED');
  });

  test('cancelar o pedido devolve o cupom (pode usar de novo)', async () => {
    const first = (await ctx.call('GET', '/me/orders', { token: tokens.user })).body.items[0];
    const cancelled = await ctx.call('POST', `/orders/${first.id}/cancel`, { token: tokens.user });
    assert.equal(cancelled.status, 200);

    const coupon = (await admin('GET', '/admin/coupons')).body.items.find(
      (c) => c.code === 'PROMO10',
    );
    assert.equal(coupon.uses, 0);
    assert.equal((await buy('PROMO10')).status, 201);
  });

  test('cliente não consegue forçar desconto pelo corpo da requisição', async () => {
    const order = await buy(undefined, tokens.user, { discountCents: 9_999, totalCents: 1 });
    assert.equal(order.status, 201);
    assert.equal(order.body.discountCents, 0);
    assert.equal(order.body.totalCents, 10_000 + 1_200 + 850);
  });

  test('desconto fixo nunca passa do subtotal', async () => {
    await createCoupon({ code: 'GRANDE', type: 'fixed', value: 99_999_999 });
    const res = await preview('GRANDE');
    assert.equal(res.body.discountCents, 10_000);
    assert.equal(res.body.taxCents, 0);
    assert.equal(res.body.totalCents, 1_200); // sobra só o frete
  });

  test('frete grátis considera o valor já descontado', async () => {
    await createCoupon({ code: 'DEZ', value: 10 });
    // 5 x R$100 = R$500 => sem cupom frete grátis; com 10% fica R$450 e o frete volta.
    const without = await preview(undefined, tokens.admin, 5);
    const withCoupon = await preview('DEZ', tokens.admin, 5);
    assert.equal(without.body.shippingCents, 0);
    assert.equal(withCoupon.body.shippingCents, 1_200);
  });

  test('cupom inexistente, inativo, expirado, esgotado e abaixo do mínimo', async () => {
    assert.equal((await preview('NAOEXISTE')).body.error.code, 'COUPON_NOT_FOUND');

    const off = (await createCoupon({ code: 'OFF', active: false })).body;
    assert.equal((await preview('OFF')).body.error.code, 'COUPON_NOT_FOUND');
    assert.equal(off.active, false);

    await createCoupon({
      code: 'ONTEM',
      expiresAt: new Date(Date.now() - 86_400_000).toISOString(),
    });
    assert.equal((await preview('ONTEM')).body.error.code, 'COUPON_EXPIRED');

    await createCoupon({ code: 'MIN200', minSubtotalCents: 20_000 });
    const min = await preview('MIN200');
    assert.equal(min.body.error.code, 'COUPON_MIN_SUBTOTAL');
    assert.equal(min.body.error.details.minCents, 20_000);
    assert.equal((await preview('MIN200', tokens.user, 2)).status, 200);
  });

  test('limite de usos vale entre clientes diferentes', async () => {
    await createCoupon({ code: 'SOUM', maxUses: 1 });
    const other = (
      await ctx.call('POST', '/auth/register', {
        body: { name: 'Outra Pessoa', email: 'outra@teste.com', password: 'senha12345' },
      })
    ).body.token;
    await ctx.call('PATCH', '/me', { token: other, body: { address: 'Av. Central, 50' } });

    assert.equal((await buy('SOUM', other)).status, 201);
    assert.equal((await buy('SOUM', tokens.user)).body.error.code, 'COUPON_EXHAUSTED');
  });

  test('pedido com cupom inválido não baixa estoque nem cria pedido', async () => {
    const stock = () =>
      ctx.db.prepare('SELECT stock FROM products WHERE id = ?').get(productId).stock;
    const before = stock();
    const orders = ctx.db.prepare('SELECT COUNT(*) AS n FROM orders').get().n;

    assert.equal((await buy('NAOEXISTE')).status, 404);

    assert.equal(stock(), before);
    assert.equal(ctx.db.prepare('SELECT COUNT(*) AS n FROM orders').get().n, orders);
  });
});

describe('manutenção de cupons usados', () => {
  test('não exclui nem muda o valor de cupom já usado; pode desativar', async () => {
    const used = (await admin('GET', '/admin/coupons')).body.items.find((c) => c.code === 'SOUM');
    assert.equal(used.uses, 1);

    assert.equal(
      (await admin('DELETE', `/admin/coupons/${used.id}`)).body.error.code,
      'COUPON_IN_USE',
    );

    const base = {
      type: used.type,
      minSubtotalCents: 0,
      maxUses: 1,
      expiresAt: null,
      active: false,
    };
    assert.equal(
      (await admin('PATCH', `/admin/coupons/${used.id}`, { ...base, value: 50 })).status,
      409,
    );
    assert.equal(
      (await admin('PATCH', `/admin/coupons/${used.id}`, { ...base, value: used.value })).status,
      200,
    );
  });

  test('cupom nunca usado pode ser excluído', async () => {
    const fresh = (await createCoupon({ code: 'APAGAR' })).body;
    assert.equal((await admin('DELETE', `/admin/coupons/${fresh.id}`)).status, 204);
  });
});
