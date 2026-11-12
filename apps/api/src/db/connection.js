import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

import { migrate } from './migrations.js';

/** Abre (e migra) o banco. Use ':memory:' nos testes. */
export function openDb(file) {
  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  }

  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  migrate(db);
  return db;
}
