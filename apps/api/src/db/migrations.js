/**
 * Migrations versionadas via `PRAGMA user_version`.
 * Regra: nunca editar uma migration já publicada; adicione uma nova ao final.
 * Valores monetários são sempre inteiros em centavos.
 */
export const MIGRATIONS = [
  /* 1 - schema inicial */
  `
  CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE,
    name          TEXT    NOT NULL,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    address       TEXT,
    preferences   TEXT    NOT NULL DEFAULT '{}',
    created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE products (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT    NOT NULL,
    description TEXT    NOT NULL DEFAULT '',
    category    TEXT    NOT NULL,
    price_cents INTEGER NOT NULL CHECK (price_cents > 0),
    promo_cents INTEGER NOT NULL DEFAULT 0 CHECK (promo_cents >= 0),
    stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    emoji       TEXT    NOT NULL DEFAULT '📦',
    hue         INTEGER NOT NULL DEFAULT 200,
    image_url   TEXT,
    status      TEXT    NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'draft', 'out_of_stock')),
    featured    INTEGER NOT NULL DEFAULT 0,
    recommended INTEGER NOT NULL DEFAULT 0,
    rating      REAL    NOT NULL DEFAULT 4.5,
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX idx_products_category ON products (category);
  CREATE INDEX idx_products_status   ON products (status);

  CREATE TABLE favorites (
    user_id    INTEGER NOT NULL REFERENCES users (id)    ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, product_id)
  );

  CREATE TABLE orders (
    id             TEXT    PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users (id),
    status         TEXT    NOT NULL DEFAULT 'confirmed'
                   CHECK (status IN ('confirmed', 'shipped', 'delivered')),
    payment_method TEXT    NOT NULL,
    address        TEXT    NOT NULL,
    subtotal_cents INTEGER NOT NULL,
    shipping_cents INTEGER NOT NULL,
    tax_cents      INTEGER NOT NULL,
    total_cents    INTEGER NOT NULL,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX idx_orders_user    ON orders (user_id);
  CREATE INDEX idx_orders_created ON orders (created_at);

  CREATE TABLE order_items (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id         TEXT    NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    product_id       INTEGER REFERENCES products (id) ON DELETE SET NULL,
    name             TEXT    NOT NULL,
    unit_price_cents INTEGER NOT NULL,
    quantity         INTEGER NOT NULL CHECK (quantity > 0)
  );
  CREATE INDEX idx_order_items_order ON order_items (order_id);
  `,

  /* 2 - status "cancelled" + histórico de status (order_events)
   * O CHECK do status não pode ser alterado no SQLite: recria a tabela (procedimento oficial
   * de 12 passos; o migrate() desliga foreign_keys fora da transação e confere depois). */
  `
  CREATE TABLE orders_new (
    id             TEXT    PRIMARY KEY,
    user_id        INTEGER NOT NULL REFERENCES users (id),
    status         TEXT    NOT NULL DEFAULT 'confirmed'
                   CHECK (status IN ('confirmed', 'shipped', 'delivered', 'cancelled')),
    payment_method TEXT    NOT NULL,
    address        TEXT    NOT NULL,
    subtotal_cents INTEGER NOT NULL,
    shipping_cents INTEGER NOT NULL,
    tax_cents      INTEGER NOT NULL,
    total_cents    INTEGER NOT NULL,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  INSERT INTO orders_new
    SELECT id, user_id, status, payment_method, address,
           subtotal_cents, shipping_cents, tax_cents, total_cents, created_at
    FROM orders;
  DROP TABLE orders;
  ALTER TABLE orders_new RENAME TO orders;
  CREATE INDEX idx_orders_user    ON orders (user_id);
  CREATE INDEX idx_orders_created ON orders (created_at);

  CREATE TABLE order_events (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id   TEXT    NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
    status     TEXT    NOT NULL,
    actor_id   INTEGER REFERENCES users (id) ON DELETE SET NULL,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX idx_order_events_order ON order_events (order_id);

  -- Pedidos já existentes ganham o histórico mínimo.
  INSERT INTO order_events (order_id, status, created_at)
    SELECT id, 'confirmed', created_at FROM orders;
  INSERT INTO order_events (order_id, status, created_at)
    SELECT id, status, created_at FROM orders WHERE status <> 'confirmed';
  `,

  /* 3 - recuperação de senha por código + revogação de sessões
   * token_version: o JWT carrega a versão; trocar/redefinir a senha incrementa e derruba
   * todas as sessões antigas. O código nunca é guardado em claro (só HMAC). */
  `
  ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;

  CREATE TABLE password_resets (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    code_hash  TEXT    NOT NULL,
    expires_at TEXT    NOT NULL,
    attempts   INTEGER NOT NULL DEFAULT 0,
    used_at    TEXT,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX idx_password_resets_user ON password_resets (user_id);
  `,

  /* 4 - avaliações reais, cupons e notificações
   * products.rating era um valor FICTÍCIO do seed: zera e passa a ser a média das avaliações
   * visíveis (0 = sem avaliações), com rating_count ao lado. */
  `
  ALTER TABLE products ADD COLUMN rating_count INTEGER NOT NULL DEFAULT 0;
  UPDATE products SET rating = 0;

  CREATE TABLE reviews (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    user_id    INTEGER NOT NULL REFERENCES users (id)    ON DELETE CASCADE,
    rating     INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT    NOT NULL DEFAULT '',
    status     TEXT    NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden')),
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (product_id, user_id)
  );
  CREATE INDEX idx_reviews_product ON reviews (product_id, status);

  CREATE TABLE coupons (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    code               TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    type               TEXT    NOT NULL CHECK (type IN ('percent', 'fixed')),
    value              INTEGER NOT NULL CHECK (value > 0),
    min_subtotal_cents INTEGER NOT NULL DEFAULT 0,
    max_uses           INTEGER,
    uses               INTEGER NOT NULL DEFAULT 0,
    expires_at         TEXT,
    active             INTEGER NOT NULL DEFAULT 1,
    created_at         TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  ALTER TABLE orders ADD COLUMN discount_cents INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE orders ADD COLUMN coupon_code TEXT;

  -- Um uso por cliente; cancelar o pedido libera o cupom (linha removida).
  CREATE TABLE coupon_redemptions (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    coupon_id INTEGER NOT NULL REFERENCES coupons (id) ON DELETE CASCADE,
    user_id   INTEGER NOT NULL REFERENCES users (id)   ON DELETE CASCADE,
    order_id  TEXT    NOT NULL UNIQUE REFERENCES orders (id) ON DELETE CASCADE,
    UNIQUE (coupon_id, user_id)
  );

  -- O texto é montado no app (i18n): aqui ficam só tipo + dados estruturados.
  CREATE TABLE notifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type       TEXT    NOT NULL,
    data       TEXT    NOT NULL DEFAULT '{}',
    created_at TEXT    NOT NULL DEFAULT (datetime('now')),
    read_at    TEXT
  );
  CREATE INDEX idx_notifications_user ON notifications (user_id, read_at);
  `,
];

export function migrate(db) {
  const current = db.pragma('user_version', { simple: true });

  for (let version = current; version < MIGRATIONS.length; version += 1) {
    // Recriar tabela com foreign_keys ligado apagaria filhos em cascata: desliga fora da
    // transação (PRAGMA é ignorado dentro dela), migra e só religa se nada ficou órfão.
    db.pragma('foreign_keys = OFF');
    try {
      db.transaction(() => {
        db.exec(MIGRATIONS[version]);
        const broken = db.pragma('foreign_key_check');
        if (broken.length) throw new Error(`Migration ${version + 1} quebrou chaves estrangeiras.`);
        db.pragma(`user_version = ${version + 1}`);
      })();
    } finally {
      db.pragma('foreign_keys = ON');
    }
  }
}
