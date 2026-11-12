import crypto from 'node:crypto';
import {
  ORDER_STATUS,
  PRODUCT_STATUS,
  NOTIFICATION_TYPES,
  ROLES,
  calcDiscount,
  calcTotals,
  canTransition,
  effectiveCents,
} from '@swiftmarket/shared';

import { toIso } from '../../core/dates.js';
import { AppError, notFound } from '../../core/errors.js';
import { findUsableCoupon, redeemCoupon, releaseCoupon } from '../coupons/coupons.service.js';
import { notify } from '../notifications/notifications.service.js';
import { toProductDto } from '../products/products.mapper.js';

const newOrderId = () => `SM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

function toOrderDto(row, items, history = []) {
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    paymentMethod: row.payment_method,
    address: row.address,
    subtotalCents: row.subtotal_cents,
    discountCents: row.discount_cents,
    couponCode: row.coupon_code,
    shippingCents: row.shipping_cents,
    taxCents: row.tax_cents,
    totalCents: row.total_cents,
    createdAt: toIso(row.created_at),
    history: history.map((event) => ({ status: event.status, at: toIso(event.created_at) })),
    items: items.map((item) => ({
      productId: item.product_id,
      name: item.name,
      unitCents: item.unit_price_cents,
      quantity: item.quantity,
    })),
  };
}

const itemsOf = (db, orderId) =>
  db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(orderId);

const historyOf = (db, orderId) =>
  db.prepare('SELECT * FROM order_events WHERE order_id = ? ORDER BY id').all(orderId);

const recordEvent = (db, orderId, status, actorId) =>
  db
    .prepare('INSERT INTO order_events (order_id, status, actor_id) VALUES (?, ?, ?)')
    .run(orderId, status, actorId ?? null);

/** Agrupa itens repetidos do mesmo produto somando as quantidades. */
function mergeItems(items) {
  const merged = new Map();
  for (const { productId, quantity } of items) {
    merged.set(productId, (merged.get(productId) ?? 0) + quantity);
  }
  return [...merged].map(([productId, quantity]) => ({ productId, quantity }));
}

/** Valida produtos/estoque e monta as linhas com o preço efetivo (calculado no servidor). */
function buildLines(db, items) {
  const getProduct = db.prepare('SELECT * FROM products WHERE id = ?');

  return mergeItems(items).map(({ productId, quantity }) => {
    const product = getProduct.get(productId);

    if (!product || product.status === PRODUCT_STATUS.DRAFT) {
      throw new AppError(404, 'PRODUCT_NOT_FOUND', { productId });
    }
    if (product.status !== PRODUCT_STATUS.ACTIVE || product.stock < quantity) {
      throw new AppError(409, 'INSUFFICIENT_STOCK', { productId, available: product.stock });
    }

    const dto = toProductDto(product);
    return { productId, name: dto.name, quantity, unitCents: effectiveCents(dto) };
  });
}

/** Aplica o cupom (se houver) e devolve as linhas, o desconto e os totais finais. */
function priceOrder(db, userId, { items, couponCode }) {
  const lines = buildLines(db, items);
  const subtotal = lines.reduce((sum, line) => sum + line.unitCents * line.quantity, 0);

  const coupon = couponCode ? findUsableCoupon(db, userId, couponCode, subtotal) : null;
  const totals = calcTotals(lines, calcDiscount(coupon, subtotal));

  return { lines, coupon, totals };
}

/**
 * Pré-visualiza o pedido (totais e desconto) sem criar nada. Usa exatamente a mesma regra do
 * createOrder, então o que o cliente vê é o que será cobrado.
 */
export function previewOrder(db, user, input) {
  const { coupon, totals } = priceOrder(db, user.id, input);
  return { ...totals, couponCode: coupon?.code ?? null };
}

/**
 * Cria o pedido numa única transação: valida estoque, RECALCULA preços e totais
 * no servidor (nunca confia no cliente) e baixa o estoque de forma atômica.
 * Pagamento é simulado: o pedido nasce "confirmed".
 */
export function createOrder(db, user, { items, paymentMethod, address, couponCode }) {
  return db.transaction(() => {
    const userRow = db.prepare('SELECT address FROM users WHERE id = ?').get(user.id);
    const shipTo = address ?? userRow?.address;
    if (!shipTo) throw new AppError(400, 'ADDRESS_REQUIRED');

    const { lines, coupon, totals } = priceOrder(db, user.id, { items, couponCode });
    const orderId = newOrderId();

    db.prepare(
      `INSERT INTO orders
         (id, user_id, payment_method, address,
          subtotal_cents, shipping_cents, tax_cents, total_cents, discount_cents, coupon_code)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      orderId,
      user.id,
      paymentMethod,
      shipTo,
      totals.subtotalCents,
      totals.shippingCents,
      totals.taxCents,
      totals.totalCents,
      totals.discountCents,
      coupon?.code ?? null,
    );

    recordEvent(db, orderId, ORDER_STATUS.CONFIRMED, user.id);
    if (coupon) redeemCoupon(db, { couponId: coupon.id, userId: user.id, orderId });

    const insertItem = db.prepare(
      `INSERT INTO order_items (order_id, product_id, name, unit_price_cents, quantity)
       VALUES (?, ?, ?, ?, ?)`,
    );
    // O "AND stock >= ?" protege contra corrida entre pedidos simultâneos.
    const decrement = db.prepare(
      'UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?',
    );

    for (const line of lines) {
      insertItem.run(orderId, line.productId, line.name, line.unitCents, line.quantity);

      const { changes } = decrement.run(line.quantity, line.productId, line.quantity);
      if (!changes) throw new AppError(409, 'INSUFFICIENT_STOCK', { productId: line.productId });
    }

    return getOrder(db, orderId);
  })();
}

export function getOrder(db, orderId) {
  const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!row) throw notFound('ORDER_NOT_FOUND');
  return toOrderDto(row, itemsOf(db, orderId), historyOf(db, orderId));
}

function page(db, { where = '', params = [], page: pageNumber, limit }) {
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM orders ${where}`).get(...params);
  const rows = db
    .prepare(`SELECT * FROM orders ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, (pageNumber - 1) * limit);

  return {
    items: rows.map((row) => toOrderDto(row, itemsOf(db, row.id))),
    page: pageNumber,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export const listUserOrders = (db, userId, { page: p, limit }) =>
  page(db, { where: 'WHERE user_id = ?', params: [userId], page: p, limit });

/** Lista do painel admin: todos os pedidos, filtráveis por status, com nome/e-mail do cliente. */
export function listAllOrders(db, { page: p, limit, status }) {
  const result = page(db, {
    where: status ? 'WHERE status = ?' : '',
    params: status ? [status] : [],
    page: p,
    limit,
  });

  const findCustomer = db.prepare('SELECT name, email FROM users WHERE id = ?');
  result.items = result.items.map((order) => ({
    ...order,
    customer: findCustomer.get(order.userId) ?? null,
  }));

  return result;
}

/**
 * Única porta de mudança de status (admin e cliente). Aplica a máquina de estados e,
 * ao cancelar, devolve o estoque na MESMA transação. O UPDATE condicionado ao status
 * anterior impede devolver o estoque duas vezes se duas requisições cancelarem juntas.
 * @param {{ id: number, role: string }} actor
 */
export function transitionOrder(db, orderId, nextStatus, actor) {
  return db.transaction(() => {
    const row = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    const isAdmin = actor.role === ROLES.ADMIN;

    // 404 (e não 403) para não revelar pedidos de outros usuários.
    if (!row || (!isAdmin && row.user_id !== actor.id)) throw notFound('ORDER_NOT_FOUND');

    // Cliente só pode cancelar o próprio pedido; avançar o pedido é do admin.
    if (!isAdmin && nextStatus !== ORDER_STATUS.CANCELLED) {
      throw new AppError(403, 'FORBIDDEN');
    }
    if (!canTransition(row.status, nextStatus)) {
      throw new AppError(409, 'INVALID_STATUS_TRANSITION', { from: row.status, to: nextStatus });
    }

    const { changes } = db
      .prepare('UPDATE orders SET status = ? WHERE id = ? AND status = ?')
      .run(nextStatus, orderId, row.status);
    if (!changes) throw new AppError(409, 'INVALID_STATUS_TRANSITION', { from: row.status });

    if (nextStatus === ORDER_STATUS.CANCELLED) {
      const restock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
      // product_id é NULL se o produto foi excluído depois da compra: nada a devolver.
      for (const item of itemsOf(db, orderId)) {
        if (item.product_id) restock.run(item.quantity, item.product_id);
      }
    }

    if (nextStatus === ORDER_STATUS.CANCELLED) releaseCoupon(db, orderId);

    recordEvent(db, orderId, nextStatus, actor.id);

    // Avisa o cliente quando QUEM mudou foi o admin (não notifica a própria ação do cliente).
    if (row.user_id !== actor.id) {
      notify(db, row.user_id, NOTIFICATION_TYPES.ORDER_STATUS, { orderId, status: nextStatus });
    }

    return getOrder(db, orderId);
  })();
}
