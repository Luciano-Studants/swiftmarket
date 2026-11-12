import { ORDER_STATUS, PRODUCT_STATUS } from '@swiftmarket/shared';

import { AppError, notFound } from '../../core/errors.js';
import { toIso } from '../../core/dates.js';

/** "Maria da Silva" -> "Maria S." (não expõe o nome completo de quem avaliou). */
function publicName(fullName) {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts.at(-1)[0].toUpperCase()}.` : parts[0];
}

const toDto = (row) => ({
  id: row.id,
  productId: row.product_id,
  rating: row.rating,
  comment: row.comment,
  status: row.status,
  author: publicName(row.author_name),
  createdAt: toIso(row.created_at),
  updatedAt: toIso(row.updated_at),
});

const SELECT = `
  SELECT r.*, u.name AS author_name
  FROM reviews r JOIN users u ON u.id = r.user_id`;

/** Recalcula a média/contagem do produto só com avaliações visíveis (mesma transação). */
function recalculate(db, productId) {
  const { average, count } = db
    .prepare(
      `SELECT COALESCE(AVG(rating), 0) AS average, COUNT(*) AS count
       FROM reviews WHERE product_id = ? AND status = 'visible'`,
    )
    .get(productId);

  db.prepare('UPDATE products SET rating = ?, rating_count = ? WHERE id = ?').run(
    Math.round(average * 10) / 10,
    count,
    productId,
  );
}

function assertPublicProduct(db, productId) {
  const product = db.prepare('SELECT status FROM products WHERE id = ?').get(productId);
  if (!product || product.status === PRODUCT_STATUS.DRAFT) throw notFound('PRODUCT_NOT_FOUND');
}

/** Compra verificada: só avalia quem recebeu (pedido entregue) o produto. */
function hasReceived(db, userId, productId) {
  return Boolean(
    db
      .prepare(
        `SELECT 1 FROM orders o JOIN order_items i ON i.order_id = o.id
         WHERE o.user_id = ? AND o.status = ? AND i.product_id = ? LIMIT 1`,
      )
      .get(userId, ORDER_STATUS.DELIVERED, productId),
  );
}

export function listProductReviews(db, productId, { page, limit }) {
  assertPublicProduct(db, productId);

  const where = "WHERE r.product_id = ? AND r.status = 'visible'";
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM reviews r ${where}`).get(productId);
  const rows = db
    .prepare(`${SELECT} ${where} ORDER BY r.created_at DESC, r.id DESC LIMIT ? OFFSET ?`)
    .all(productId, limit, (page - 1) * limit);

  const distribution = Object.fromEntries([1, 2, 3, 4, 5].map((star) => [star, 0]));
  for (const row of db
    .prepare(
      `SELECT rating, COUNT(*) AS n FROM reviews
       WHERE product_id = ? AND status = 'visible' GROUP BY rating`,
    )
    .all(productId)) {
    distribution[row.rating] = row.n;
  }

  const { rating, rating_count: count } = db
    .prepare('SELECT rating, rating_count FROM products WHERE id = ?')
    .get(productId);

  return {
    items: rows.map(toDto),
    summary: { average: rating, count, distribution },
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

/** Para a tela do produto: o cliente pode avaliar? já avaliou? */
export function getMyReview(db, userId, productId) {
  assertPublicProduct(db, productId);
  const row = db
    .prepare(`${SELECT} WHERE r.product_id = ? AND r.user_id = ?`)
    .get(productId, userId);

  return {
    canReview: hasReceived(db, userId, productId),
    review: row ? toDto(row) : null,
  };
}

/** Cria ou edita a avaliação do cliente (uma por produto). */
export function saveMyReview(db, userId, productId, { rating, comment }) {
  return db.transaction(() => {
    assertPublicProduct(db, productId);
    if (!hasReceived(db, userId, productId)) throw new AppError(403, 'REVIEW_NOT_ALLOWED');

    // Editar não "desoculta" uma avaliação moderada: o status fica como está.
    db.prepare(
      `INSERT INTO reviews (product_id, user_id, rating, comment)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (product_id, user_id) DO UPDATE
         SET rating = excluded.rating, comment = excluded.comment, updated_at = datetime('now')`,
    ).run(productId, userId, rating, comment);

    recalculate(db, productId);
    return toDto(
      db.prepare(`${SELECT} WHERE r.product_id = ? AND r.user_id = ?`).get(productId, userId),
    );
  })();
}

export function deleteMyReview(db, userId, productId) {
  db.transaction(() => {
    const { changes } = db
      .prepare('DELETE FROM reviews WHERE product_id = ? AND user_id = ?')
      .run(productId, userId);
    if (!changes) throw notFound('REVIEW_NOT_FOUND');
    recalculate(db, productId);
  })();
}

// ---------------------------------------------------------------------------
// Moderação (painel admin)
// ---------------------------------------------------------------------------

export function listAllReviews(db, { page, limit, status }) {
  const where = status ? 'WHERE r.status = ?' : '';
  const params = status ? [status] : [];

  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM reviews r ${where}`).get(...params);
  const rows = db
    .prepare(
      `SELECT r.*, u.name AS author_name, u.email AS author_email, p.name AS product_name
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       JOIN products p ON p.id = r.product_id
       ${where} ORDER BY r.created_at DESC, r.id DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, (page - 1) * limit);

  return {
    // No painel o admin vê o nome completo e o e-mail; a vitrine só vê o nome abreviado.
    items: rows.map((row) => ({
      ...toDto(row),
      author: row.author_name,
      authorEmail: row.author_email,
      productName: row.product_name,
    })),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export function moderateReview(db, reviewId, status) {
  return db.transaction(() => {
    const row = db.prepare('SELECT product_id FROM reviews WHERE id = ?').get(reviewId);
    if (!row) throw notFound('REVIEW_NOT_FOUND');

    db.prepare("UPDATE reviews SET status = ?, updated_at = datetime('now') WHERE id = ?").run(
      status,
      reviewId,
    );
    recalculate(db, row.product_id);

    return toDto(db.prepare(`${SELECT} WHERE r.id = ?`).get(reviewId));
  })();
}
