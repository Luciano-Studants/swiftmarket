import { COMMERCE, ORDER_STATUS, PRODUCT_STATUS, ROLES } from '@swiftmarket/shared';

import { toProductDto } from '../products/products.mapper.js';

const DAYS = 7;

/** Pedido cancelado não é venda: fica fora de receita, contagem e gráfico. */
const COUNTED = `status != '${ORDER_STATUS.CANCELLED}'`;

/** Últimos 7 dias (UTC), preenchendo com zero os dias sem vendas. */
function salesLastDays(db) {
  const rows = db
    .prepare(
      `SELECT date(created_at) AS day, SUM(total_cents) AS total, COUNT(*) AS orders
         FROM orders
        WHERE ${COUNTED} AND date(created_at) >= date('now', ?)
        GROUP BY day`,
    )
    .all(`-${DAYS - 1} days`);
  const byDay = new Map(rows.map((row) => [row.day, row]));

  return Array.from({ length: DAYS }, (_, index) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (DAYS - 1 - index));
    const day = date.toISOString().slice(0, 10);

    return { day, totalCents: byDay.get(day)?.total ?? 0, orders: byDay.get(day)?.orders ?? 0 };
  });
}

/** Métricas REAIS (o protótipo original usava números fixos). */
export function getDashboard(db) {
  const one = (sql, ...params) => db.prepare(sql).get(...params);

  const sales = one(`SELECT COALESCE(SUM(total_cents), 0) AS v FROM orders WHERE ${COUNTED}`).v;
  const orders = one(`SELECT COUNT(*) AS v FROM orders WHERE ${COUNTED}`).v;
  const users = one('SELECT COUNT(*) AS v FROM users WHERE role = ?', ROLES.USER).v;
  const products = one('SELECT COUNT(*) AS v FROM products').v;

  const lowStock = db
    .prepare(
      `SELECT * FROM products
        WHERE stock <= ? AND status != ?
        ORDER BY stock ASC, id ASC`,
    )
    .all(COMMERCE.LOW_STOCK_THRESHOLD, PRODUCT_STATUS.DRAFT)
    .map(toProductDto);

  return {
    totals: { salesCents: sales, orders, users, products },
    salesLast7Days: salesLastDays(db),
    lowStock,
  };
}
