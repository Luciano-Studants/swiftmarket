import { request } from '@/core/http.js';

export const productsApi = {
  /** query: { q, category, status, page, limit, sort } (inclui rascunhos) */
  list: (query = {}) => request('/admin/products', { query }),

  get: (id) => request(`/admin/products/${id}`),

  create: (body) => request('/admin/products', { method: 'POST', body }),

  update: (id, body) => request(`/admin/products/${id}`, { method: 'PUT', body }),

  remove: (id) => request(`/admin/products/${id}`, { method: 'DELETE' }),

  /** Envia a imagem e devolve { url: '/uploads/<arquivo>' }. */
  uploadImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/admin/uploads', { method: 'POST', formData });
  },
};
