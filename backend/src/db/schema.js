import { getDb } from './database.js';

export function initSchema() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      name            TEXT    NOT NULL,
      phone           TEXT    NOT NULL UNIQUE,
      email           TEXT,
      join_date       TEXT    NOT NULL DEFAULT (date('now')),
      points_balance  INTEGER NOT NULL DEFAULT 0,
      lifetime_spend  REAL    NOT NULL DEFAULT 0,
      last_purchase_date TEXT,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_customers_name  ON customers(name);

    CREATE TABLE IF NOT EXISTS products (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      name     TEXT NOT NULL,
      category TEXT NOT NULL,
      price    REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_ref        TEXT    NOT NULL UNIQUE,
      customer_id         INTEGER NOT NULL,
      subtotal            REAL    NOT NULL,
      tax                 REAL    NOT NULL DEFAULT 0,
      total               REAL    NOT NULL,
      redemption_used     INTEGER NOT NULL DEFAULT 0,
      redemption_discount REAL    NOT NULL DEFAULT 0,
      net_eligible        REAL    NOT NULL,
      points_earned       INTEGER NOT NULL DEFAULT 0,
      created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
    CREATE INDEX IF NOT EXISTS idx_purchases_customer ON purchases(customer_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_ref      ON purchases(purchase_ref);
    CREATE INDEX IF NOT EXISTS idx_purchases_date     ON purchases(created_at);

    CREATE TABLE IF NOT EXISTS purchase_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id  INTEGER NOT NULL,
      product_name TEXT    NOT NULL,
      category     TEXT    NOT NULL,
      quantity     INTEGER NOT NULL,
      unit_price   REAL    NOT NULL,
      line_total   REAL    NOT NULL,
      FOREIGN KEY (purchase_id) REFERENCES purchases(id)
    );

    CREATE TABLE IF NOT EXISTS reward_rules (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      name             TEXT    NOT NULL,
      earn_threshold   REAL    NOT NULL DEFAULT 10,
      earn_multiplier  REAL    NOT NULL DEFAULT 1,
      redemption_rate  REAL    NOT NULL DEFAULT 10,
      min_redemption   INTEGER NOT NULL DEFAULT 100,
      is_active        INTEGER NOT NULL DEFAULT 1,
      created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reward_ledger (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id   INTEGER NOT NULL,
      type          TEXT    NOT NULL CHECK(type IN ('earn','redeem')),
      points        INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      reference_id  TEXT,
      description   TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
    CREATE INDEX IF NOT EXISTS idx_ledger_customer ON reward_ledger(customer_id);
    CREATE INDEX IF NOT EXISTS idx_ledger_created  ON reward_ledger(created_at);

    CREATE TABLE IF NOT EXISTS redemptions (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id     INTEGER NOT NULL,
      purchase_id     INTEGER,
      points_redeemed INTEGER NOT NULL,
      discount_value  REAL    NOT NULL,
      idempotency_key TEXT    UNIQUE,
      created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (purchase_id) REFERENCES purchases(id)
    );

    CREATE TABLE IF NOT EXISTS customer_offers (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id  INTEGER NOT NULL,
      offer_type   TEXT    NOT NULL,
      title        TEXT    NOT NULL,
      description  TEXT    NOT NULL,
      reason       TEXT    NOT NULL,
      trigger_rule TEXT    NOT NULL,
      discount_pct REAL,
      valid_until  TEXT,
      created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
    CREATE INDEX IF NOT EXISTS idx_offers_customer ON customer_offers(customer_id);

    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT    NOT NULL,
      name          TEXT    NOT NULL,
      role          TEXT    NOT NULL CHECK(role IN ('owner','employee')),
      is_active     INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);

  const existingRule = db.prepare('SELECT id FROM reward_rules WHERE is_active = 1').get();
  if (!existingRule) {
    db.prepare(`
      INSERT INTO reward_rules (name, earn_threshold, earn_multiplier, redemption_rate, min_redemption, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('Standard Loyalty Rule', 10, 1, 10, 100, 1);
  }

  console.log('Database schema initialised.');
}
