import { request } from '@/core/http.js';

export const ordersApi = {
  /** items: [{ productId, quantity }]; o servidor recalcula preços e totais. */
  create: ({ items, paymentMethod, address, couponCode }) =>
    request('/orders', { method: 'POST', body: { items, paymentMethod, address, couponCode } }),

  /** Totais com cupom calculados pelo servidor (não cria pedido). */
  preview: ({ items, couponCode }) =>
    request('/orders/preview', { method: 'POST', body: { items, couponCode } }),

  get: (id) => request(`/orders/${encodeURIComponent(id)}`),

  cancel: (id) => request(`/orders/${encodeURIComponent(id)}/cancel`, { method: 'POST' }),

  listMine: ({ page = 1, limit = 10 } = {}) => request('/me/orders', { query: { page, limit } }),
};
