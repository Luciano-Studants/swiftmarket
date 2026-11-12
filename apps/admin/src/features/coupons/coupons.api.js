import { request } from '@/core/http.js';

export const couponsApi = {
  list: (query = {}) => request('/admin/coupons', { query }),

  create: (body) => request('/admin/coupons', { method: 'POST', body }),

  /** Atualização completa dos campos editáveis (o código não muda). */
  update: (id, body) => request(`/admin/coupons/${id}`, { method: 'PATCH', body }),

  remove: (id) => request(`/admin/coupons/${id}`, { method: 'DELETE' }),
};
