import { z } from 'zod';

import { parse } from '../../core/validate.js';
import * as notificationsService from './notifications.service.js';

const idParams = z.object({ id: z.coerce.number().int().positive() });
const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** Cliente, sob /me/notifications. */
export default async function notificationRoutes(app) {
  app.get('/', async (request) =>
    notificationsService.listNotifications(
      app.db,
      request.currentUser.id,
      parse(pageQuery, request.query),
    ),
  );

  // Barato o bastante para o app consultar periodicamente (selo de não lidas).
  app.get('/unread-count', async (request) => ({
    unread: notificationsService.unreadCount(app.db, request.currentUser.id),
  }));

  app.post('/read-all', async (request, reply) => {
    notificationsService.markAllRead(app.db, request.currentUser.id);
    return reply.status(204).send();
  });

  app.post('/:id/read', async (request, reply) => {
    const { id } = parse(idParams, request.params);
    notificationsService.markRead(app.db, request.currentUser.id, id);
    return reply.status(204).send();
  });
}
