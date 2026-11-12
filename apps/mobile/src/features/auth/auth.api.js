import { request } from '@/core/http.js';

export const authApi = {
  login: (email, password) =>
    request('/auth/login', { method: 'POST', auth: false, body: { email, password } }),

  register: (name, email, password) =>
    request('/auth/register', { method: 'POST', auth: false, body: { name, email, password } }),

  /** Simulado: provider = "google" | "apple". */
  social: (provider) =>
    request('/auth/social', { method: 'POST', auth: false, body: { provider } }),

  forgotPassword: (email) =>
    request('/auth/forgot-password', { method: 'POST', auth: false, body: { email } }),

  /** Passo 2 da recuperação: código de 6 dígitos recebido por e-mail + senha nova. */
  resetPassword: (email, code, password) =>
    request('/auth/reset-password', {
      method: 'POST',
      auth: false,
      body: { email, code, password },
    }),

  /** Logado: devolve um token novo (as outras sessões caem). */
  changePassword: (currentPassword, newPassword) =>
    request('/me/password', { method: 'POST', body: { currentPassword, newPassword } }),
};
