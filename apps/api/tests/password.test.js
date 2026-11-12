import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

import { buildApp } from '../src/app.js';
import { config as baseConfig } from '../src/config/env.js';
import { openDb } from '../src/db/connection.js';
import { bootstrap } from '../src/db/seed.js';

const BASE = '/api/v1';
const EMAIL = 'john.doe@swiftmarket.io';
let app;
let db;
const outbox = [];

async function call(method, url, { token, body } = {}) {
  const response = await app.inject({
    method,
    url: `${BASE}${url}`,
    payload: body,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return { status: response.statusCode, body: response.body ? JSON.parse(response.body) : null };
}

const login = (password) => call('POST', '/auth/login', { body: { email: EMAIL, password } });
const forgot = (email = EMAIL) => call('POST', '/auth/forgot-password', { body: { email } });
const lastCode = () => outbox.at(-1)?.text.match(/\b(\d{6})\b/)?.[1];
const reset = (code, password = 'novaSenha123') =>
  call('POST', '/auth/reset-password', { body: { email: EMAIL, code, password } });

before(async () => {
  const config = {
    ...baseConfig,
    jwtSecret: 'test-secret',
    corsOrigins: [],
    seedDemoData: true,
    enableSimulatedSocial: true,
    uploadDir: '/tmp/swiftmarket-password-test-uploads',
  };
  db = openDb(':memory:');
  bootstrap(db, config);
  app = await buildApp({
    db,
    config,
    mailer: { send: async (message) => void outbox.push(message) },
  });
});

after(() => app.close());

describe('recuperação de senha', () => {
  test('e-mail inexistente responde 202 igual e não envia nada', async () => {
    const res = await forgot('ninguem@naoexiste.com');
    assert.equal(res.status, 202);
    assert.equal(outbox.length, 0);
  });

  test('código errado é recusado e depois de 5 erros nem o certo vale', async () => {
    await forgot();
    const right = lastCode();
    const wrong = right === '000000' ? '111111' : '000000';

    for (let i = 0; i < 5; i += 1) {
      const res = await reset(wrong);
      assert.equal(res.body.error.code, 'INVALID_RESET_CODE');
    }
    const blocked = await reset(right);
    assert.equal(blocked.body.error.code, 'INVALID_RESET_CODE', 'bloqueado após 5 tentativas');
  });

  test('código certo redefine a senha, é de uso único e derruba sessões antigas', async () => {
    const oldToken = (await login('user123')).body.token;
    assert.equal((await call('GET', '/me', { token: oldToken })).status, 200);

    await forgot(); // pode ser limitado por hora; o teste anterior usou 1 de 3
    const code = lastCode();

    const ok = await reset(code);
    assert.equal(ok.status, 200);

    assert.equal((await reset(code)).body.error.code, 'INVALID_RESET_CODE', 'uso único');
    assert.equal((await login('user123')).status, 401, 'senha antiga deixa de valer');
    assert.equal((await login('novaSenha123')).status, 200);
    assert.equal(
      (await call('GET', '/me', { token: oldToken })).status,
      401,
      'token antigo revogado',
    );
  });

  test('código expirado não vale', async () => {
    await forgot();
    const code = lastCode();
    db.prepare("UPDATE password_resets SET expires_at = datetime('now', '-1 minute')").run();
    assert.equal((await reset(code)).body.error.code, 'INVALID_RESET_CODE');
  });

  test('o código não fica guardado em claro e o limite é de 3 por hora', async () => {
    db.prepare('DELETE FROM password_resets').run();
    outbox.length = 0;

    for (let i = 0; i < 5; i += 1) await forgot();

    assert.equal(outbox.length, 3, 'só 3 e-mails por hora');
    const stored = db.prepare('SELECT code_hash FROM password_resets').all();
    for (const { code_hash: hash } of stored) {
      assert.doesNotMatch(hash, /^\d{6}$/);
      assert.equal(hash.length, 64);
    }
  });

  test('senha nova fraca é recusada', async () => {
    db.prepare('DELETE FROM password_resets').run();
    await forgot();
    const res = await reset(lastCode(), '123');
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });
});

describe('regra de senha (mínimo 8)', () => {
  test('cadastro com 7 caracteres é recusado; com 8 passa', async () => {
    const short = await call('POST', '/auth/register', {
      body: { name: 'Curta Senha', email: 'curta@teste.com', password: '1234567' },
    });
    assert.equal(short.status, 400);
    assert.equal(short.body.error.code, 'VALIDATION_ERROR');

    const ok = await call('POST', '/auth/register', {
      body: { name: 'Curta Senha', email: 'curta@teste.com', password: '12345678' },
    });
    assert.equal(ok.status, 201);
  });

  test('contas antigas com senha curta ainda conseguem entrar', async () => {
    // Simula um usuário criado quando o mínimo era 6.
    const bcrypt = await import('bcryptjs');
    db.prepare(
      "INSERT INTO users (email, name, password_hash) VALUES ('antiga@teste.com','Antiga',?)",
    ).run(bcrypt.default.hashSync('abc123', 4));
    const res = await call('POST', '/auth/login', {
      body: { email: 'antiga@teste.com', password: 'abc123' },
    });
    assert.equal(res.status, 200);
  });
});

describe('troca de senha (logado)', () => {
  test('exige a senha atual, devolve token novo e derruba o antigo', async () => {
    const token = (await login('novaSenha123')).body.token;

    const wrong = await call('POST', '/me/password', {
      token,
      body: { currentPassword: 'errada', newPassword: 'outraSenha456' },
    });
    assert.equal(wrong.body.error.code, 'INVALID_CURRENT_PASSWORD');

    const ok = await call('POST', '/me/password', {
      token,
      body: { currentPassword: 'novaSenha123', newPassword: 'outraSenha456' },
    });
    assert.equal(ok.status, 200);

    assert.equal((await call('GET', '/me', { token })).status, 401, 'token antigo caiu');
    assert.equal((await call('GET', '/me', { token: ok.body.token })).status, 200);
    assert.equal((await login('outraSenha456')).status, 200);
  });

  test('sem login não troca senha', async () => {
    const res = await call('POST', '/me/password', {
      body: { currentPassword: 'x', newPassword: 'yyyyyy' },
    });
    assert.equal(res.status, 401);
  });
});
