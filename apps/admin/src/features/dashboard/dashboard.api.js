import { request } from '@/core/http.js';

export const dashboardApi = {
  /** { totals: { salesCents, orders, users, products }, salesLast7Days, lowStock } */
  get: () => request('/admin/dashboard'),
};
