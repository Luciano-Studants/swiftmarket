import { buildApp } from '../src/app.js';
import { config as baseConfig } from '../src/config/env.js';
import { openDb } from '../src/db/connection.js';
import { bootstrap } from '../src/db/seed.js';

/** App isolado (banco em memória + dados demo) para testes de integração. */
export async function createTestApp(overrides = {}) {
  const config = {
    ...baseConfig,
    jwtSecret: 'test-secret',
    corsOrigins: [],
    seedDemoData: true,
    enableSimulatedSocial: true,
    uploadDir: '/tmp/swiftmarket-test-uploads',
    ...overrides,
  };
  const db = openDb(':memory:');
  bootstrap(db, config);
  const app = await buildApp({ db, config });

  const call = async (method, url, { token, body } = {}) => {
    const response = await app.inject({
      method,
      url: `/api/v1${url}`,
      payload: body,
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    return { status: response.statusCode, body: response.body ? JSON.parse(response.body) : null };
  };

  const login = async (email, password) =>
    (await call('POST', '/auth/login', { body: { email, password } })).body.token;

  /** Compra, o admin envia e entrega: deixa o produto "recebido" pelo cliente. */
  const deliverOrder = async ({ userToken, adminToken, productId, quantity = 1 }) => {
    const order = (
      await call('POST', '/orders', {
        token: userToken,
        body: { items: [{ productId, quantity }], paymentMethod: 'pix' },
      })
    ).body;
    for (const status of ['shipped', 'delivered']) {
      await call('PATCH', `/admin/orders/${order.id}/status`, {
        token: adminToken,
        body: { status },
      });
    }
    return order;
  };

  return { app, db, call, login, deliverOrder, close: () => app.close() };
}
