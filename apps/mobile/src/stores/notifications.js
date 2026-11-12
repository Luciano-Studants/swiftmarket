import { defineStore } from 'pinia';
import { ref } from 'vue';

import { notificationsApi } from '@/features/notifications/notifications.api.js';

const POLL_MS = 60_000;

/**
 * Contador de notificações não lidas. Sem push (FCM) por enquanto: o app consulta um
 * endpoint leve a cada minuto enquanto está aberto e ao voltar para o primeiro plano.
 */
export const useNotificationsStore = defineStore('notifications', () => {
  const unread = ref(0);
  let timer = null;

  async function refresh() {
    try {
      unread.value = (await notificationsApi.unreadCount()).unread;
    } catch {
      // Sem rede/sessão expirada: mantém o último valor, sem incomodar o usuário.
    }
  }

  const onVisible = () => {
    if (document.visibilityState === 'visible') refresh();
  };

  function start() {
    stop();
    refresh();
    timer = setInterval(() => document.visibilityState === 'visible' && refresh(), POLL_MS);
    document.addEventListener('visibilitychange', onVisible);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
    document.removeEventListener('visibilitychange', onVisible);
    unread.value = 0;
  }

  return { unread, refresh, start, stop };
});
