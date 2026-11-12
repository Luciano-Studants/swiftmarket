import assert from 'node:assert/strict';
import { test } from 'node:test';

import { openDb } from '../src/db/connection.js';
import { bootstrap } from '../src/db/seed.js';

const emails = (db) =>
  db
    .prepare('SELECT email FROM users ORDER BY email')
    .all()
    .map((row) => row.email);

test('modo demonstração: carrega produtos e cliente, mas NÃO o admin público admin123', () => {
  const db = openDb(':memory:');
  bootstrap(db, {
    seedDemoData: true,
    demoMode: true,
    adminEmail: 'dono@exemplo.com',
    adminPassword: 'senha-forte-123',
  });

  assert.ok(db.prepare('SELECT COUNT(*) AS n FROM products').get().n > 0);
  assert.deepEqual(emails(db), ['dono@exemplo.com', 'john.doe@swiftmarket.io']);
});

test('desenvolvimento: admin de demonstração continua existindo', () => {
  const db = openDb(':memory:');
  bootstrap(db, { seedDemoData: true });
  assert.ok(emails(db).includes('admin@swiftmarket.com'));
});

test('produção real (sem demo): nada é semeado', () => {
  const db = openDb(':memory:');
  bootstrap(db, { seedDemoData: false });
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM products').get().n, 0);
  assert.deepEqual(emails(db), []);
});
