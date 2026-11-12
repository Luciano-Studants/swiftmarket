import { parse } from '../../core/validate.js';
import { changePasswordBody } from '../auth/auth.schema.js';
import * as authService from '../auth/auth.service.js';
import { pageQuery } from '../orders/orders.schema.js';
import { preferencesBody, updateProfileBody } from './users.schema.js';
import * as usersService from './users.service.js';

/** Perfil do próprio usuário (registrado sob /me, já autenticado). */
export async function meRoutes(app) {
  app.get('/', async (request) => ({
    ...usersService.getProfile(app.db, request.currentUser.id),
    stats: usersService.getProfileStats(app.db, request.currentUser.id),
  }));

  app.patch('/', async (request) =>
    usersService.updateProfile(
      app.db,
      request.currentUser.id,
      parse(updateProfileBody, request.body),
    ),
  );

  // Troca a senha e devolve um token novo (as outras sessões caem).
  app.post(
    '/password',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    async (request) => {
      const body = parse(changePasswordBody, request.body);
      const user = await authService.changePassword(app.db, request.currentUser.id, body);
      return {
        token: app.jwt.sign({ sub: String(user.id), role: user.role, tv: user.token_version }),
      };
    },
  );

  app.put('/preferences', async (request) =>
    usersService.updatePreferences(
      app.db,
      request.currentUser.id,
      parse(preferencesBody, request.body),
    ),
  );
}

/** Painel admin (registrado sob /admin/users). */
export async function adminUserRoutes(app) {
  app.get('/', async (request) => usersService.listUsers(app.db, parse(pageQuery, request.query)));
}
