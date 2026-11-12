import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { ROLES } from '@swiftmarket/shared';

import { AppError } from '../core/errors.js';

/**
 * Autenticação JWT.
 * - `app.authenticate`: exige token válido e recarrega o usuário do banco
 *   (assim exclusão de conta ou troca de papel valem imediatamente).
 * - `app.requireAdmin`: authenticate + papel admin (autorização sempre no servidor).
 */
export default fp(async function authPlugin(app, { secret, expiresIn }) {
  await app.register(jwt, { secret, sign: { expiresIn } });

  const findUser = app.db.prepare(
    'SELECT id, email, name, role, token_version FROM users WHERE id = ?',
  );

  app.decorate('authenticate', async (request) => {
    try {
      await request.jwtVerify();
    } catch {
      throw new AppError(401, 'UNAUTHENTICATED');
    }

    const user = findUser.get(Number(request.user.sub));
    if (!user) throw new AppError(401, 'UNAUTHENTICATED');
    // Senha trocada/redefinida: tokens emitidos antes (tv menor) deixam de valer.
    if ((request.user.tv ?? 0) !== user.token_version) throw new AppError(401, 'UNAUTHENTICATED');

    request.currentUser = user;
  });

  app.decorate('requireAdmin', async (request) => {
    await app.authenticate(request);
    if (request.currentUser.role !== ROLES.ADMIN) throw new AppError(403, 'FORBIDDEN');
  });
});
