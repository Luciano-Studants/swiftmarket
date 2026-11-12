import { DEFAULT_PREFERENCES } from '@swiftmarket/shared';

import { toIso } from '../../core/dates.js';
import { notFound } from '../../core/errors.js';

const parsePreferences = (json) => {
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(json) };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
};

function toProfileDto(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    address: row.address,
    preferences: parsePreferences(row.preferences),
    createdAt: toIso(row.created_at),
  };
}

export function getProfile(db, userId) {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!row) throw notFound('USER_NOT_FOUND');
  return toProfileDto(row);
}

export function updateProfile(db, userId, { name, address }) {
  db.prepare(
    'UPDATE users SET name = COALESCE(?, name), address = COALESCE(?, address) WHERE id = ?',
  ).run(name ?? null, address ?? null, userId);

  return getProfile(db, userId);
}

export function updatePreferences(db, userId, preferences) {
  db.prepare('UPDATE users SET preferences = ? WHERE id = ?').run(
    JSON.stringify(preferences),
    userId,
  );
  return getProfile(db, userId);
}

/** Contagens exibidas na tela de perfil. */
export function getProfileStats(db, userId) {
  const orders = db.prepare('SELECT COUNT(*) AS n FROM orders WHERE user_id = ?').get(userId).n;
  const favorites = db
    .prepare('SELECT COUNT(*) AS n FROM favorites WHERE user_id = ?')
    .get(userId).n;
  return { orders, favorites };
}

export function listUsers(db, { page, limit }) {
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM users').get();
  const rows = db
    .prepare('SELECT * FROM users ORDER BY id LIMIT ? OFFSET ?')
    .all(limit, (page - 1) * limit);

  return {
    items: rows.map(({ id, email, name, role, created_at }) => ({
      id,
      email,
      name,
      role,
      createdAt: toIso(created_at),
    })),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
