import bcrypt from 'bcryptjs';
import { CATEGORY_EMOJI, ROLES } from '@swiftmarket/shared';

const BCRYPT_COST = 10;

/** [nome, descrição, categoria, preço, promoção, estoque, hue, destaque, status] (preços em reais) */
const PRODUCTS = [
  [
    'Fone de Ouvido Sem Fio Premium',
    'Som imersivo com graves profundos e bateria para o dia todo.',
    'electronics',
    299,
    0,
    24,
    220,
    1,
  ],
  [
    'Assistente Inteligente para Casa',
    'Controle luzes, música e rotinas apenas com a voz.',
    'electronics',
    129,
    99,
    18,
    190,
    1,
  ],
  [
    'Teclado Mecânico Gamer',
    'Switches táteis, iluminação RGB e estrutura em alumínio.',
    'electronics',
    159.5,
    0,
    9,
    280,
    1,
  ],
  [
    'Cadeira de Escritório Ergonômica',
    'Suporte lombar ajustável e apoio de braço 3D.',
    'home',
    349,
    0,
    6,
    30,
    0,
  ],
  [
    'Luminária de Mesa Minimalista',
    'Luz quente regulável com design compacto.',
    'home',
    45,
    0,
    42,
    45,
    1,
  ],
  [
    'Relógio de Couro Minimalista',
    'Caixa fina em aço e pulseira de couro legítimo.',
    'fashion',
    125,
    0,
    15,
    25,
    1,
  ],
  [
    'Fone com Cancelamento de Ruído',
    'Cancelamento ativo de ruído e 30 horas de bateria.',
    'electronics',
    249,
    0,
    12,
    200,
    0,
  ],
  [
    'Tênis de Corrida',
    'Amortecimento responsivo e cabedal respirável.',
    'fashion',
    89,
    69,
    30,
    340,
    0,
  ],
  [
    'Sérum Facial Hidratante',
    'Ácido hialurônico e vitamina B5 para pele macia.',
    'beauty',
    34,
    0,
    50,
    330,
    0,
  ],
  [
    'Conjunto de Blocos de Montar',
    'Mais de 500 peças para criar sem limites.',
    'toys',
    39,
    29,
    3,
    10,
    0,
  ],
  [
    'Vaso de Cerâmica para Plantas',
    'Acabamento fosco com furo de drenagem.',
    'home',
    24,
    0,
    0,
    120,
    0,
    'out_of_stock',
  ],
  ['Jaqueta Jeans', 'Corte clássico em denim resistente.', 'fashion', 79, 0, 20, 215, 0],
];

const toCents = (reais) => Math.round(reais * 100);

/** Emoji específico por produto; os que não constam usam o emoji da categoria. */
const PRODUCT_EMOJI = {
  'Assistente Inteligente para Casa': '🔊',
  'Teclado Mecânico Gamer': '⌨️',
  'Cadeira de Escritório Ergonômica': '🪑',
  'Luminária de Mesa Minimalista': '💡',
  'Relógio de Couro Minimalista': '⌚',
  'Tênis de Corrida': '👟',
  'Sérum Facial Hidratante': '🧴',
  'Conjunto de Blocos de Montar': '🧱',
  'Vaso de Cerâmica para Plantas': '🪴',
  'Jaqueta Jeans': '🧥',
};

export function seedProducts(db) {
  const { total } = db.prepare('SELECT COUNT(*) AS total FROM products').get();
  if (total > 0) return;

  const insert = db.prepare(`
    INSERT INTO products
      (name, description, category, price_cents, promo_cents, stock, emoji, hue,
       featured, recommended, status, rating, rating_count)
    VALUES
      (@name, @description, @category, @priceCents, @promoCents, @stock, @emoji, @hue,
       @featured, @recommended, @status, 0, 0)
  `);

  db.transaction(() => {
    PRODUCTS.forEach(
      ([name, description, category, price, promo, stock, hue, featured, status], index) => {
        insert.run({
          name,
          description,
          category,
          priceCents: toCents(price),
          promoCents: toCents(promo),
          stock,
          emoji: PRODUCT_EMOJI[name] ?? CATEGORY_EMOJI[category],
          hue,
          featured,
          recommended: index % 2 === 0 ? 1 : 0,
          status: status ?? 'active',
        });
      },
    );
  })();
}

/** Cria o usuário se o e-mail ainda não existir. Retorna true se criou. */
export function ensureUser(db, { email, name, password, role }) {
  const exists = db.prepare('SELECT 1 FROM users WHERE email = ?').get(email);
  if (exists) return false;

  db.prepare('INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)').run(
    email,
    name,
    bcrypt.hashSync(password, BCRYPT_COST),
    role,
  );
  return true;
}

/** Usuários de demonstração: SOMENTE desenvolvimento (config.seedDemoData). */
export function seedDemoUsers(db, { withAdmin = true } = {}) {
  if (withAdmin) {
    ensureUser(db, {
      email: 'admin@swiftmarket.com',
      name: 'Admin',
      password: 'admin123',
      role: ROLES.ADMIN,
    });
  }
  ensureUser(db, {
    email: 'john.doe@swiftmarket.io',
    name: 'John Doe',
    password: 'user123',
    role: ROLES.USER,
  });
}

/** Executado no boot do servidor. */
export function bootstrap(db, config) {
  if (config.seedDemoData) {
    seedProducts(db);
    seedDemoUsers(db, { withAdmin: !config.demoMode });
  }

  if (config.adminEmail && config.adminPassword) {
    ensureUser(db, {
      email: config.adminEmail,
      name: 'Administrador',
      password: config.adminPassword,
      role: ROLES.ADMIN,
    });
  }
}
