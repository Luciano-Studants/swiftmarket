import { z } from 'zod';

import { parse } from '../../core/validate.js';
import * as favoritesService from './favorites.service.js';

const params = z.object({ productId: z.coerce.number().int().positive() });

/** Registrado sob /me/favorites (já autenticado). */
export default async function favoritesRoutes(app) {
  app.get('/', async (request) => favoritesService.listFavorites(app.db, request.currentUser.id));

  app.put('/:productId', async (request, reply) => {
    const { productId } = parse(params, request.params);
    favoritesService.addFavorite(app.db, request.currentUser.id, productId);
    return reply.status(204).send();
  });

  app.delete('/:productId', async (request, reply) => {
    const { productId } = parse(params, request.params);
    favoritesService.removeFavorite(app.db, request.currentUser.id, productId);
    return reply.status(204).send();
  });
}
