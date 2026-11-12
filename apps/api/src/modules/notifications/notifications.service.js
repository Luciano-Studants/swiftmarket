import { toIso } from '../../core/dates.js';
import { notFound } from '../../core/errors.js';

const toDto = (row) => ({
  id: row.id,
  type: row.type,
  data: JSON.parse(row.data),
  createdAt: toIso(row.created_at),
  read: row.read_at !== null,
});

/** Cria uma notificação. O texto é montado no app (i18n); aqui vai só tipo + dados. */
export function notify(db, userId, type, data = {}) {
  db.prepare('INSERT INTO notifications (user_id, type, data) VALUES (?, ?, ?)').run(
    userId,
    type,
    JSON.stringify(data),
  );
}

export const unreadCount = (db, userId) =>
  db
    .prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL')
    .get(userId).n;

export function listNotifications(db, userId, { page, limit }) {
  const { total } = db
    .prepare('SELECT COUNT(*) AS total FROM notifications WHERE user_id = ?')
    .get(userId);
  const rows = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?')
    .all(userId, limit, (page - 1) * limit);

  return {
    items: rows.map(toDto),
    unread: unreadCount(db, userId),
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

export function markRead(db, userId, id) {
  // Filtra por dono: não revela nem altera notificações de outros usuários.
  const { changes } = db
    .prepare(
      `UPDATE notifications SET read_at = COALESCE(read_at, datetime('now'))
       WHERE id = ? AND user_id = ?`,
    )
    .run(id, userId);
  if (!changes) throw notFound('NOTIFICATION_NOT_FOUND');
}

export function markAllRead(db, userId) {
  db.prepare(
    "UPDATE notifications SET read_at = datetime('now') WHERE user_id = ? AND read_at IS NULL",
  ).run(userId);
}
