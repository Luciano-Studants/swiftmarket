import { request } from '@/core/http.js';

export const catalogApi = {
  /** query: { q, category, inStock, featured, recommended, ids, sort, page, limit } */
  list: (query = {}) =>
    request('/products', {
      auth: false,
      query: { ...query, ids: query.ids?.join(',') },
    }),

  get: (id) => request(`/products/${id}`, { auth: false }),

  reviews: (id, { page = 1, limit = 10 } = {}) =>
    request(`/products/${id}/reviews`, { auth: false, query: { page, limit } }),

  /** { canReview, review }: só quem recebeu o produto pode avaliar. */
  myReview: (id) => request(`/me/reviews/${id}`),

  saveReview: (id, { rating, comment }) =>
    request(`/me/reviews/${id}`, { method: 'PUT', body: { rating, comment } }),

  deleteReview: (id) => request(`/me/reviews/${id}`, { method: 'DELETE' }),
};
