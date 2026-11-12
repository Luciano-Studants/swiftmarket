import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

import { createTestApp } from './helpers.js';

let ctx;
const tokens = {};

before(async () => {
  ctx = await createTestApp();
  tokens.user = await ctx.login('john.doe@swiftmarket.io', 'user123');
  tokens.admin = await ctx.login('admin@swiftmarket.com', 'admin123');
  await ctx.call('PATCH', '/me', { token: tokens.user, body: { address: 'Rua das Flores, 100' } });
});

after(() => ctx.close());

const review = (productId, body, token = tokens.user) =>
  ctx.call('PUT', `/me/reviews/${productId}`, { token, body });
const product = async (id) => (await ctx.call('GET', `/products/${id}`)).body;

describe('avaliações verificadas', () => {
  test('produto novo nasce sem nota (não há mais estrela fictícia)', async () => {
    const p = await product(5);
    assert.equal(p.rating, 0);
    assert.equal(p.ratingCount, 0);
  });

  test('produto criado pelo painel também nasce sem nota', async () => {
    const created = await ctx.call('POST', '/admin/products', {
      token: tokens.admin,
      body: { name: 'Produto Novo', category: 'electronics', priceCents: 1000, stock: 5 },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.rating, 0);
    assert.equal(created.body.ratingCount, 0);
  });

  test('quem não recebeu o produto não pode avaliar', async () => {
    const mine = await ctx.call('GET', '/me/reviews/5', { token: tokens.user });
    assert.equal(mine.body.canReview, false);

    const res = await review(5, { rating: 5, comment: 'Ótimo' });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'REVIEW_NOT_ALLOWED');
  });

  test('pedido apenas enviado ainda não libera a avaliação', async () => {
    const order = (
      await ctx.call('POST', '/orders', {
        token: tokens.user,
        body: { items: [{ productId: 5, quantity: 1 }], paymentMethod: 'pix' },
      })
    ).body;
    await ctx.call('PATCH', `/admin/orders/${order.id}/status`, {
      token: tokens.admin,
      body: { status: 'shipped' },
    });
    assert.equal((await review(5, { rating: 5 })).status, 403);
  });

  test('após a entrega, avalia; média e contagem são atualizadas', async () => {
    await ctx.deliverOrder({ userToken: tokens.user, adminToken: tokens.admin, productId: 5 });

    const mine = await ctx.call('GET', '/me/reviews/5', { token: tokens.user });
    assert.equal(mine.body.canReview, true);

    const res = await review(5, { rating: 4, comment: 'Chegou bem embalado.' });
    assert.equal(res.status, 200);
    assert.equal(res.body.author, 'John D.');

    const p = await product(5);
    assert.equal(p.rating, 4);
    assert.equal(p.ratingCount, 1);
  });

  test('editar não duplica: continua uma avaliação por produto', async () => {
    await review(5, { rating: 5, comment: 'Melhorou depois de usar.' });
    const list = await ctx.call('GET', '/products/5/reviews');

    assert.equal(list.body.total, 1);
    assert.equal(list.body.items[0].rating, 5);
    assert.deepEqual(list.body.summary, {
      average: 5,
      count: 1,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 },
    });
  });

  test('nota inválida e comentário gigante são recusados', async () => {
    assert.equal((await review(5, { rating: 0 })).status, 400);
    assert.equal((await review(5, { rating: 6 })).status, 400);
    assert.equal((await review(5, { rating: 3.5 })).status, 400);
    assert.equal((await review(5, { rating: 3, comment: 'x'.repeat(501) })).status, 400);
  });

  test('a lista pública não expõe e-mail nem nome completo', async () => {
    const { items } = (await ctx.call('GET', '/products/5/reviews')).body;
    assert.equal(JSON.stringify(items).includes('@'), false);
    assert.equal(items[0].author, 'John D.');
    assert.equal('userId' in items[0], false);
  });

  test('moderação: ocultar tira da vitrine e da média; mostrar devolve', async () => {
    const id = (await ctx.call('GET', '/products/5/reviews')).body.items[0].id;

    const hide = await ctx.call('PATCH', `/admin/reviews/${id}`, {
      token: tokens.admin,
      body: { status: 'hidden' },
    });
    assert.equal(hide.status, 200);
    assert.equal((await ctx.call('GET', '/products/5/reviews')).body.total, 0);
    assert.deepEqual([(await product(5)).rating, (await product(5)).ratingCount], [0, 0]);

    // Editar não "desoculta" uma avaliação moderada.
    await review(5, { rating: 1, comment: 'tentando voltar' });
    assert.equal((await ctx.call('GET', '/products/5/reviews')).body.total, 0);

    await ctx.call('PATCH', `/admin/reviews/${id}`, {
      token: tokens.admin,
      body: { status: 'visible' },
    });
    assert.equal((await product(5)).rating, 1);
  });

  test('cliente não acessa a moderação', async () => {
    assert.equal((await ctx.call('GET', '/admin/reviews', { token: tokens.user })).status, 403);
    assert.equal((await ctx.call('GET', '/admin/reviews')).status, 401);
  });

  test('admin lista com nome completo, e-mail e produto', async () => {
    const { items } = (await ctx.call('GET', '/admin/reviews', { token: tokens.admin })).body;
    assert.equal(items[0].author, 'John Doe');
    assert.equal(items[0].authorEmail, 'john.doe@swiftmarket.io');
    assert.ok(items[0].productName);
  });

  test('excluir a própria avaliação recalcula a nota', async () => {
    const res = await ctx.call('DELETE', '/me/reviews/5', { token: tokens.user });
    assert.equal(res.status, 204);
    assert.equal((await product(5)).ratingCount, 0);
    assert.equal((await ctx.call('DELETE', '/me/reviews/5', { token: tokens.user })).status, 404);
  });

  test('ordenar por melhor avaliados coloca o avaliado no topo', async () => {
    await review(5, { rating: 5 });
    const { items } = (await ctx.call('GET', '/products?sort=rating&limit=3')).body;
    assert.equal(items[0].id, 5);
  });
});
