import fs from 'node:fs';
import path from 'node:path';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import Fastify from 'fastify';

import { AppError } from './core/errors.js';
import { createMailer } from './core/mailer.js';
import authPlugin from './plugins/auth.js';
import { registerRoutes } from './routes.js';

/**
 * Monta a aplicação sem abrir porta (facilita testes com `app.inject`).
 * @param {{ db: import('better-sqlite3').Database, config: object, logger?: any,
 *   mailer?: { send: Function } }} options
 */
export async function buildApp({ db, config, logger = false, mailer = createMailer(config) }) {
  const app = Fastify({ logger, trustProxy: config.trustProxy ?? false });

  app.decorate('db', db);
  app.decorate('config', config);
  app.decorate('mailer', mailer);

  await app.register(cors, {
    // O default do plugin só libera GET/HEAD/POST; o app usa PUT/PATCH/DELETE.
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    origin: config.corsOrigins.length ? config.corsOrigins : true,
  });

  await app.register(rateLimit, { global: true, max: 200, timeWindow: '1 minute' });

  await app.register(multipart, { limits: { fileSize: config.maxUploadBytes, files: 1 } });

  fs.mkdirSync(config.uploadDir, { recursive: true });
  await app.register(fastifyStatic, {
    root: path.resolve(config.uploadDir),
    prefix: '/uploads/',
    maxAge: '7d',
  });

  await app.register(authPlugin, { secret: config.jwtSecret, expiresIn: config.jwtExpiresIn });

  app.addHook('onSend', async (_request, reply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply
        .status(error.status)
        .send({ error: { code: error.code, details: error.details } });
    }

    if (error.statusCode === 429) {
      return reply.status(429).send({ error: { code: 'TOO_MANY_REQUESTS' } });
    }

    // Erros 4xx do próprio Fastify (JSON malformado, payload grande etc.).
    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({ error: { code: 'BAD_REQUEST' } });
    }

    request.log.error(error);
    return reply.status(500).send({ error: { code: 'INTERNAL_ERROR' } });
  });

  app.setNotFoundHandler((_request, reply) =>
    reply.status(404).send({ error: { code: 'NOT_FOUND' } }),
  );

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(registerRoutes, { prefix: '/api/v1' });

  return app;
}
