import { request } from '@/core/http.js';

export const notificationsApi = {
  list: ({ page = 1, limit = 20 } = {}) => request('/me/notifications', { query: { page, limit } }),

  unreadCount: () => request('/me/notifications/unread-count'),

  markRead: (id) => request(`/me/notifications/${id}/read`, { method: 'POST' }),

  markAllRead: () => request('/me/notifications/read-all', { method: 'POST' }),
};
