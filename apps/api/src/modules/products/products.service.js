import { CATEGORY_EMOJI, PRODUCT_STATUS } from '@swiftmarket/shared';

import { notFound } from '../../core/errors.js';
import { toProductDto } from './products.mapper.js';

const ORDER_BY = {
  featured: 'featured DESC, rating DESC, rating_count DESC, id ASC',
  rating: 'rating DESC, rating_count DESC, id ASC',
  price_asc: 'COALESCE(NULLIF(promo_cents, 0), price_cents) ASC, id ASC',
  price_desc: 'COALESCE(NULLIF(promo_cents, 0), price_cents) DESC, id ASC',
  name: 'name COLLATE NOCASE ASC',
  newest: 'id DESC',
};

const escapeLike = (text) => text.replace(/[\\%_]/g, (char) => `\\${char}`);

/**
 * Lista paginada com filtros.
 * `includeDrafts` só é true no painel admin; a vitrine nunca vê rascunhos.
 */
export function listProducts(db, query, { includeDrafts = false } = {}) {
  const where = [];
  const params = {};

  if (!includeDrafts) where.push(`status != '${PRODUCT_STATUS.DRAFT}'`);

  if (query.category) {
    where.push('category = @category');
    params.category = query.category;
  }
  if (query.status) {
    where.push('status = @status');
    params.status = query.status;
  }
  if (query.q) {
    where.push(`(name LIKE @q ESCAPE '\\' OR description LIKE @q ESCAPE '\\')`);
    params.q = `%${escapeLike(query.q)}%`;
  }
  if (query.ids) {
    const names = query.ids.map((_, index) => `@id${index}`);
    where.push(`id IN (${names.join(', ')})`);
    query.ids.forEach((id, index) => {
      params[`id${index}`] = id;
    });
  }
  if (query.inStock) where.push('stock > 0');
  if (query.featured) where.push('featured = 1');
  if (query.recommended) where.push('recommended = 1');

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (query.page - 1) * query.limit;

  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM products ${clause}`).get(params);
  const rows = db
    .prepare(
      `SELECT * FROM products ${clause}
       ORDER BY ${ORDER_BY[query.sort]}
       LIMIT @limit OFFSET @offset`,
    )
    .all({ ...params, limit: query.limit, offset });

  return {
    items: rows.map(toProductDto),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

export function getProduct(db, id, { includeDrafts = false } = {}) {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!row || (!includeDrafts && row.status === PRODUCT_STATUS.DRAFT)) {
    throw notFound('PRODUCT_NOT_FOUND');
  }
  return toProductDto(row);
}

const toParams = (input) => ({
  ...input,
  featured: input.featured ? 1 : 0,
  recommended: input.recommended ? 1 : 0,
  emoji: input.emoji ?? CATEGORY_EMOJI[input.category],
  hue: input.hue ?? Math.floor(Math.random() * 360),
});

export function createProduct(db, input) {
  const { lastInsertRowid } = db
    .prepare(
      `INSERT INTO products
         (name, description, category, price_cents, promo_cents, stock, emoji, hue,
          image_url, status, featured, recommended, rating, rating_count)
       VALUES
         (@name, @description, @category, @priceCents, @promoCents, @stock, @emoji, @hue,
          @imageUrl, @status, @featured, @recommended, 0, 0)`,
    )
    .run(toParams(input));

  return getProduct(db, Number(lastInsertRowid), { includeDrafts: true });
}

export function updateProduct(db, id, input) {
  const current = db.prepare('SELECT emoji, hue FROM products WHERE id = ?').get(id);
  if (!current) throw notFound('PRODUCT_NOT_FOUND');

  db.prepare(
    `UPDATE products SET
       name = @name, description = @description, category = @category,
       price_cents = @priceCents, promo_cents = @promoCents, stock = @stock,
       emoji = @emoji, hue = @hue, image_url = @imageUrl, status = @status,
       featured = @featured, recommended = @recommended
     WHERE id = @id`,
  ).run({
    ...toParams({ ...input, emoji: input.emoji ?? current.emoji, hue: input.hue ?? current.hue }),
    id,
  });

  return getProduct(db, id, { includeDrafts: true });
}

export function deleteProduct(db, id) {
  const { changes } = db.prepare('DELETE FROM products WHERE id = ?').run(id);
  if (!changes) throw notFound('PRODUCT_NOT_FOUND');
}
