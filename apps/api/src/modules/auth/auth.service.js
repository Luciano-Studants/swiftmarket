import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { ROLES } from '@swiftmarket/shared';

import { AppError } from '../../core/errors.js';

const BCRYPT_COST = 10;

// Hash descartável: comparamos contra ele quando o e-mail não existe, para que
// o tempo de resposta não revele quais e-mails estão cadastrados.
const DUMMY_HASH = bcrypt.hashSync('swiftmarket-dummy', BCRYPT_COST);

export const toPublicUser = (row) => ({
  id: row.id,
  email: row.email,
  name: row.name,
  role: row.role,
});

export async function register(db, { name, email, password }) {
  const exists = db.prepare('SELECT 1 FROM users WHERE email = ?').get(email);
  if (exists) throw new AppError(409, 'EMAIL_ALREADY_REGISTERED');

  const hash = await bcrypt.hash(password, BCRYPT_COST);
  const { lastInsertRowid } = db
    .prepare('INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)')
    .run(email, name, hash, ROLES.USER); // cadastro público é sempre "user"

  return db.prepare('SELECT * FROM users WHERE id = ?').get(lastInsertRowid);
}

export async function login(db, { email, password }) {
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  const valid = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);

  if (!row || !valid) throw new AppError(401, 'INVALID_CREDENTIALS');
  return row;
}

/**
 * Login Google/Apple SIMULADO (decisão do projeto): cria/reutiliza uma conta de
 * demonstração por provedor. Desabilitado em produção (config.enableSimulatedSocial).
 */
export async function simulatedSocialLogin(db, provider) {
  const email = `${provider}.demo@swiftmarket.local`;
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (existing) return existing;

  const unusablePassword = crypto.randomBytes(24).toString('hex');
  return register(db, {
    name: provider === 'google' ? 'Usuário Google' : 'Usuário Apple',
    email,
    password: unusablePassword,
  }).then((user) => db.prepare('SELECT * FROM users WHERE id = ?').get(user.id));
}

// ---------------------------------------------------------------------------
// Recuperação e troca de senha
// ---------------------------------------------------------------------------

const RESET_TTL_MINUTES = 15;
const RESET_MAX_ATTEMPTS = 5;
const RESET_MAX_PER_HOUR = 3;

const sqlDate = (date) => date.toISOString().replace('T', ' ').slice(0, 19);

/** HMAC do código atrelado ao usuário: vazar o banco não revela códigos válidos. */
const hashCode = (secret, userId, code) =>
  crypto.createHmac('sha256', secret).update(`${userId}:${code}`).digest('hex');

/**
 * Gera um código de 6 dígitos (15 min, 5 tentativas) e envia por e-mail.
 * Responde igual exista ou não o e-mail; o envio NÃO é aguardado para o tempo de
 * resposta também não revelar contas. Limite de 3 códigos/hora por conta.
 */
export function requestPasswordReset(db, { mailer, secret }, { email }) {
  const user = db.prepare('SELECT id, name FROM users WHERE email = ?').get(email);
  if (!user) return;

  const { recent } = db
    .prepare(
      `SELECT COUNT(*) AS recent FROM password_resets
       WHERE user_id = ? AND created_at > datetime('now', '-1 hour')`,
    )
    .get(user.id);
  if (recent >= RESET_MAX_PER_HOUR) return;

  // Só o código mais recente vale.
  db.prepare(
    "UPDATE password_resets SET used_at = datetime('now') WHERE user_id = ? AND used_at IS NULL",
  ).run(user.id);

  const code = String(crypto.randomInt(100000, 1000000));
  db.prepare('INSERT INTO password_resets (user_id, code_hash, expires_at) VALUES (?, ?, ?)').run(
    user.id,
    hashCode(secret, user.id, code),
    sqlDate(new Date(Date.now() + RESET_TTL_MINUTES * 60_000)),
  );

  mailer
    .send({
      to: email,
      subject: 'SwiftMarket · código para redefinir sua senha',
      text:
        `Olá, ${user.name.split(' ')[0]}!\n\n` +
        `Seu código de verificação é: ${code}\n` +
        `Ele vale por ${RESET_TTL_MINUTES} minutos. Se não foi você, ignore este e-mail.`,
    })
    .catch((error) => console.error('Falha ao enviar e-mail de recuperação:', error.message));
}

/** Confere o código e define a nova senha; derruba todas as sessões antigas. */
export async function resetPassword(db, { secret }, { email, code, password }) {
  const invalid = () => new AppError(400, 'INVALID_RESET_CODE');

  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (!user) throw invalid();

  const reset = db
    .prepare(
      `SELECT * FROM password_resets
       WHERE user_id = ? AND used_at IS NULL AND expires_at > datetime('now')
       ORDER BY id DESC LIMIT 1`,
    )
    .get(user.id);
  if (!reset || reset.attempts >= RESET_MAX_ATTEMPTS) throw invalid();

  const expected = Buffer.from(reset.code_hash, 'hex');
  const given = Buffer.from(hashCode(secret, user.id, code), 'hex');

  if (!crypto.timingSafeEqual(expected, given)) {
    db.prepare('UPDATE password_resets SET attempts = attempts + 1 WHERE id = ?').run(reset.id);
    throw invalid();
  }

  const hash = await bcrypt.hash(password, BCRYPT_COST);
  db.transaction(() => {
    db.prepare("UPDATE password_resets SET used_at = datetime('now') WHERE id = ?").run(reset.id);
    db.prepare(
      'UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?',
    ).run(hash, user.id);
  })();
}

/** Troca de senha logado: exige a senha atual e devolve o usuário já com a nova versão. */
export async function changePassword(db, userId, { currentPassword, newPassword }) {
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

  if (!(await bcrypt.compare(currentPassword, row.password_hash))) {
    throw new AppError(400, 'INVALID_CURRENT_PASSWORD');
  }

  const hash = await bcrypt.hash(newPassword, BCRYPT_COST);
  db.prepare(
    'UPDATE users SET password_hash = ?, token_version = token_version + 1 WHERE id = ?',
  ).run(hash, userId);

  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
}
