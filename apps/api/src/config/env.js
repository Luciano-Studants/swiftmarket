const env = process.env.NODE_ENV ?? 'development';
const isProd = env === 'production';

const list = (value) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

export const config = {
  env,
  isProd,
  host: process.env.HOST ?? '0.0.0.0',
  port: Number(process.env.PORT ?? 3333),
  // true só atrás de proxy reverso confiável (Caddy/Nginx): senão X-Forwarded-For burla o rate limit.
  trustProxy: process.env.TRUST_PROXY === 'true',

  dbFile: process.env.DB_FILE ?? './data/swiftmarket.db',
  uploadDir: process.env.UPLOAD_DIR ?? './data/uploads',

  jwtSecret: process.env.JWT_SECRET ?? (isProd ? undefined : 'dev-only-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',

  // Vazio em desenvolvimento = libera qualquer origem.
  corsOrigins: list(process.env.CORS_ORIGINS),

  adminEmail: process.env.ADMIN_EMAIL?.trim().toLowerCase() || null,
  adminPassword: process.env.ADMIN_PASSWORD || null,

  // Login Google/Apple é simulado: nunca habilitado em produção.
  enableSimulatedSocial: !isProd,
  seedDemoData: !isProd,

  // E-mail (recuperação de senha). Em desenvolvimento, sem SMTP_URL o código vai para o log.
  smtpUrl: process.env.SMTP_URL || null,
  mailFrom: process.env.MAIL_FROM ?? 'SwiftMarket <no-reply@swiftmarket.local>',

  maxUploadBytes: 1_500_000,
};

if (isProd && !config.jwtSecret) {
  throw new Error('JWT_SECRET é obrigatório em produção.');
}

if (isProd && !config.smtpUrl) {
  throw new Error('SMTP_URL é obrigatório em produção (e-mail de recuperação de senha).');
}

if (isProd && config.adminPassword && config.adminPassword.length < 8) {
  throw new Error('ADMIN_PASSWORD deve ter ao menos 8 caracteres.');
}
