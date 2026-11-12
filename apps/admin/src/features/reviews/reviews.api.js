import { request } from '@/core/http.js';

export const reviewsApi = {
  /** query: { status, page, limit } */
  list: (query = {}) => request('/admin/reviews', { query }),

  /** status: 'visible' | 'hidden' */
  moderate: (id, status) => request(`/admin/reviews/${id}`, { method: 'PATCH', body: { status } }),
};
