import { request } from '@/core/http.js';

export const ordersApi = {
  /** query: { status, page, limit } -> pedidos com `customer: { name, email }` */
  list: (query = {}) => request('/admin/orders', { query }),

  updateStatus: (id, status) =>
    request(`/admin/orders/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: { status },
    }),
};
