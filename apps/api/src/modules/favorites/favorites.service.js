import { PRODUCT_STATUS } from '@swiftmarket/shared';

import { notFound } from '../../core/errors.js';
import { toProductDto } from '../products/products.mapper.js';

export function listFavorites(db, userId) {
  const rows = db
    .prepare(
      `SELECT p.* FROM favorites f
         JOIN products p ON p.id = f.product_id
        WHERE f.user_id = ? AND p.status != ?
        ORDER BY f.created_at DESC`,
    )
    .all(userId, PRODUCT_STATUS.DRAFT);

  return rows.map(toProductDto);
}

/** Idempotente: favoritar duas vezes não gera erro nem duplicata. */
export function addFavorite(db, userId, productId) {
  const product = db.prepare('SELECT status FROM products WHERE id = ?').get(productId);
  if (!product || product.status === PRODUCT_STATUS.DRAFT) throw notFound('PRODUCT_NOT_FOUND');

  db.prepare('INSERT OR IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)').run(
    userId,
    productId,
  );
}

export function removeFavorite(db, userId, productId) {
  db.prepare('DELETE FROM favorites WHERE user_id = ? AND product_id = ?').run(userId, productId);
}
