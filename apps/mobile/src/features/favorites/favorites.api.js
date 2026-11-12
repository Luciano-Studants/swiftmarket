import { request } from '@/core/http.js';

export const favoritesApi = {
  list: () => request('/me/favorites'),
  add: (productId) => request(`/me/favorites/${productId}`, { method: 'PUT' }),
  remove: (productId) => request(`/me/favorites/${productId}`, { method: 'DELETE' }),
};
