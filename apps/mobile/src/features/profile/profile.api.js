import { request } from '@/core/http.js';

export const profileApi = {
  get: () => request('/me'),
  update: (payload) => request('/me', { method: 'PATCH', body: payload }),
  savePreferences: (preferences) =>
    request('/me/preferences', { method: 'PUT', body: preferences }),
};
