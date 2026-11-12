import { request } from '@/core/http.js';

export const authApi = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', auth: false, body: { email, password } }),

  /** Devolve um token novo (as outras sessões caem). */
  changePassword: (currentPassword, newPassword) =>
    request('/me/password', { method: 'POST', body: { currentPassword, newPassword } }),
};
