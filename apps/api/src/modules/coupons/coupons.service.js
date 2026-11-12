import { toIso } from '../../core/dates.js';
import { AppError, notFound } from '../../core/errors.js';

const toSqlDate = (iso) => (iso ? iso.replace('T', ' ').slice(0, 19) : null);

const isExpired = (row) =>
  Boolean(row.expires_at) &&
  row.expires_at <= new Date().toISOString().replace('T', ' ').slice(0, 19);

const toDto = (row) => ({
  id: row.id,
  code: row.code,
  type: row.type,
  value: row.value,
  minSubtotalCents: row.min_subtotal_cents,
  maxUses: row.max_uses,
  uses: row.uses,
  expiresAt: toIso(row.expires_at),
  expired: isExpired(row),
  active: Boolean(row.active),
  createdAt: toIso(row.created_at),
});

// ---------------------------------------------------------------------------
// Regras de uso (chamadas na criação do pedido e na pré-visualização)
// ---------------------------------------------------------------------------

/**
 * Confere se o cliente pode usar o cupom neste subtotal. Lança um código estável por motivo.
 * Cupom inativo responde como "não encontrado" (não revela cupons desativados).
 */
export function findUsableCoupon(db, userId, rawCode, subtotalCents) {
  const coupon = db.prepare('SELECT * FROM coupons WHERE code = ?').get(rawCode);
  if (!coupon || !coupon.active) throw new AppError(404, 'COUPON_NOT_FOUND');

  if (isExpired(coupon)) throw new AppError(400, 'COUPON_EXPIRED');
  if (coupon.max_uses !== null && coupon.uses >= coupon.max_uses) {
    throw new AppError(400, 'COUPON_EXHAUSTED');
  }

  const used = db
    .prepare('SELECT 1 FROM coupon_redemptions WHERE coupon_id = ? AND user_id = ?')
    .get(coupon.id, userId);
  if (used) throw new AppError(400, 'COUPON_ALREADY_USED');

  if (subtotalCents < coupon.min_subtotal_cents) {
    throw new AppError(400, 'COUPON_MIN_SUBTOTAL', { minCents: coupon.min_subtotal_cents });
  }

  return { id: coupon.id, code: coupon.code, type: coupon.type, value: coupon.value };
}

/**
 * Consome o cupom dentro da transação do pedido. O UPDATE condicionado impede passar do
 * limite de usos com pedidos simultâneos; a UNIQUE (cupom, cliente) impede uso em dobro.
 */
export function redeemCoupon(db, { couponId, userId, orderId }) {
  const { changes } = db
    .prepare(
      `UPDATE coupons SET uses = uses + 1
       WHERE id = ? AND (max_uses IS NULL OR uses < max_uses)`,
    )
    .run(couponId);
  if (!changes) throw new AppError(400, 'COUPON_EXHAUSTED');

  try {
    db.prepare(
      'INSERT INTO coupon_redemptions (coupon_id, user_id, order_id) VALUES (?, ?, ?)',
    ).run(couponId, userId, orderId);
  } catch (error) {
    if (String(error.code).startsWith('SQLITE_CONSTRAINT')) {
      throw new AppError(400, 'COUPON_ALREADY_USED');
    }
    throw error;
  }
}

/** Pedido cancelado devolve o cupom: libera o uso do cliente e o contador. */
export function releaseCoupon(db, orderId) {
  const redemption = db
    .prepare('SELECT coupon_id FROM coupon_redemptions WHERE order_id = ?')
    .get(orderId);
  if (!redemption) return;

  db.prepare('DELETE FROM coupon_redemptions WHERE order_id = ?').run(orderId);
  db.prepare('UPDATE coupons SET uses = MAX(uses - 1, 0) WHERE id = ?').run(redemption.coupon_id);
}

// ---------------------------------------------------------------------------
// Administração
// ---------------------------------------------------------------------------

export function listCoupons(db, { page, limit }) {
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM coupons').get();
  const rows = db
    .prepare('SELECT * FROM coupons ORDER BY id DESC LIMIT ? OFFSET ?')
    .all(limit, (page - 1) * limit);

  return {
    items: rows.map(toDto),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

const get = (db, id) => {
  const row = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id);
  if (!row) throw notFound('COUPON_NOT_FOUND');
  return toDto(row);
};

export function createCoupon(db, input) {
  try {
    const { lastInsertRowid } = db
      .prepare(
        `INSERT INTO coupons (code, type, value, min_subtotal_cents, max_uses, expires_at, active)
         VALUES (@code, @type, @value, @minSubtotalCents, @maxUses, @expiresAt, @active)`,
      )
      .run({ ...input, expiresAt: toSqlDate(input.expiresAt), active: input.active ? 1 : 0 });
    return get(db, Number(lastInsertRowid));
  } catch (error) {
    if (String(error.code).startsWith('SQLITE_CONSTRAINT')) {
      throw new AppError(409, 'COUPON_CODE_TAKEN');
    }
    throw error;
  }
}

export function updateCoupon(db, id, input) {
  const current = get(db, id);

  // Mudar tipo/valor com cupom já usado alteraria o sentido de pedidos antigos.
  if (current.uses > 0 && (input.type !== current.type || input.value !== current.value)) {
    throw new AppError(409, 'COUPON_IN_USE');
  }

  db.prepare(
    `UPDATE coupons SET type = @type, value = @value, min_subtotal_cents = @minSubtotalCents,
       max_uses = @maxUses, expires_at = @expiresAt, active = @active
     WHERE id = @id`,
  ).run({ ...input, expiresAt: toSqlDate(input.expiresAt), active: input.active ? 1 : 0, id });

  return get(db, id);
}

/** Só exclui cupom nunca usado; os usados são desativados (preserva o histórico). */
export function deleteCoupon(db, id) {
  if (get(db, id).uses > 0) throw new AppError(409, 'COUPON_IN_USE');
  db.prepare('DELETE FROM coupons WHERE id = ?').run(id);
}
