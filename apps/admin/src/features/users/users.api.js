import { request } from '@/core/http.js';

export const usersApi = {
  /** query: { page, limit } */
  list: (query = {}) => request('/admin/users', { query }),
};
