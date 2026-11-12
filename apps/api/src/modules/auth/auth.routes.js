import { AppError } from '../../core/errors.js';
import { parse } from '../../core/validate.js';
import { forgotBody, loginBody, registerBody, resetBody, socialBody } from './auth.schema.js';
import * as authService from './auth.service.js';

/** Limite mais rígido nas rotas sensíveis a força bruta. */
const strictLimit = { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } };

export default async function authRoutes(app) {
  const issueToken = (user) => ({
    token: app.jwt.sign({ sub: String(user.id), role: user.role, tv: user.token_version ?? 0 }),
    user: authService.toPublicUser(user),
  });

  app.post('/register', strictLimit, async (request, reply) => {
    const body = parse(registerBody, request.body);
    const user = await authService.register(app.db, body);
    return reply.status(201).send(issueToken(user));
  });

  app.post('/login', strictLimit, async (request) => {
    const body = parse(loginBody, request.body);
    const user = await authService.login(app.db, body);
    return issueToken(user);
  });

  app.post('/social', strictLimit, async (request) => {
    if (!app.config.enableSimulatedSocial) throw new AppError(404, 'NOT_FOUND');

    const { provider } = parse(socialBody, request.body);
    const user = await authService.simulatedSocialLogin(app.db, provider);
    return issueToken(user);
  });

  // Sempre 202, exista ou não o e-mail (não revela quais contas existem).
  app.post('/forgot-password', strictLimit, async (request, reply) => {
    const body = parse(forgotBody, request.body);
    authService.requestPasswordReset(
      app.db,
      { mailer: app.mailer, secret: app.config.jwtSecret },
      body,
    );
    return reply.status(202).send({ ok: true });
  });

  app.post('/reset-password', strictLimit, async (request) => {
    const body = parse(resetBody, request.body);
    await authService.resetPassword(app.db, { secret: app.config.jwtSecret }, body);
    return { ok: true };
  });
}
