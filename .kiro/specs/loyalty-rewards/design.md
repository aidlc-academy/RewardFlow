# RewardFlow — System Design Document

**Version:** 1.0  
**Date:** 2026-10-13

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────┐
│           Browser (React + Vite)        │
│   Tailwind CSS | Recharts | Lucide      │
└─────────────────┬───────────────────────┘
                  │ HTTP REST (port 5000)
┌─────────────────▼───────────────────────┐
│        Express.js API Server            │
│        Node.js (port 5000)              │
│  Routes → Controllers → Services       │
└─────────────────┬───────────────────────┘
                  │ better-sqlite3
┌─────────────────▼───────────────────────┐
│         SQLite Database                 │
│         data/rewardflow.db              │
└─────────────────────────────────────────┘
```

Single-page React app (Vite dev server on port 5173) proxies API calls to Express (port 5000). In production, Express serves the built frontend.

---

## 2. Database Schema

### 2.1 customers
```sql
CREATE TABLE customers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  phone        TEXT    NOT NULL UNIQUE,
  email        TEXT,
  join_date    TEXT    NOT NULL DEFAULT (date('now')),
  points_balance INTEGER NOT NULL DEFAULT 0,
  lifetime_spend REAL  NOT NULL DEFAULT 0,
  last_purchase_date TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_name  ON customers(name);
```

### 2.2 products
```sql
CREATE TABLE products (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  name     TEXT    NOT NULL,
  category TEXT    NOT NULL,
  price    REAL    NOT NULL
);
```

### 2.3 purchases
```sql
CREATE TABLE purchases (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_ref    TEXT    NOT NULL UNIQUE,
  customer_id     INTEGER NOT NULL REFERENCES customers(id),
  subtotal        REAL    NOT NULL,
  tax             REAL    NOT NULL DEFAULT 0,
  total           REAL    NOT NULL,
  redemption_used INTEGER NOT NULL DEFAULT 0,
  redemption_discount REAL NOT NULL DEFAULT 0,
  net_eligible    REAL    NOT NULL,
  points_earned   INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
CREATE INDEX idx_purchases_customer ON purchases(customer_id);
CREATE INDEX idx_purchases_ref      ON purchases(purchase_ref);
CREATE INDEX idx_purchases_date     ON purchases(created_at);
```

### 2.4 purchase_items
```sql
CREATE TABLE purchase_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER NOT NULL REFERENCES purchases(id),
  product_name TEXT   NOT NULL,
  category    TEXT    NOT NULL,
  quantity    INTEGER NOT NULL,
  unit_price  REAL    NOT NULL,
  line_total  REAL    NOT NULL,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id)
);
```

### 2.5 reward_rules
```sql
CREATE TABLE reward_rules (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT NOT NULL,
  earn_threshold    REAL NOT NULL DEFAULT 10,
  earn_multiplier   REAL NOT NULL DEFAULT 1,
  redemption_rate   REAL NOT NULL DEFAULT 10,
  min_redemption    INTEGER NOT NULL DEFAULT 100,
  is_active         INTEGER NOT NULL DEFAULT 1,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 2.6 reward_ledger
```sql
CREATE TABLE reward_ledger (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id  INTEGER NOT NULL REFERENCES customers(id),
  type         TEXT    NOT NULL CHECK(type IN ('earn','redeem')),
  points       INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  reference_id TEXT,
  description  TEXT,
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
CREATE INDEX idx_ledger_customer ON reward_ledger(customer_id);
```

### 2.7 redemptions
```sql
CREATE TABLE redemptions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id  INTEGER NOT NULL REFERENCES customers(id),
  purchase_id  INTEGER REFERENCES purchases(id),
  points_redeemed INTEGER NOT NULL,
  discount_value  REAL NOT NULL,
  idempotency_key TEXT UNIQUE,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (purchase_id) REFERENCES purchases(id)
);
```

### 2.8 customer_offers
```sql
CREATE TABLE customer_offers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id  INTEGER NOT NULL REFERENCES customers(id),
  offer_type   TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL,
  reason       TEXT NOT NULL,
  trigger_rule TEXT NOT NULL,
  discount_pct REAL,
  valid_until  TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
CREATE INDEX idx_offers_customer ON customer_offers(customer_id);
```

---

## 3. API Endpoints

### Customers
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/customers | List all customers (search ?q=) |
| POST | /api/customers | Create customer |
| GET | /api/customers/:id | Get customer profile |
| PUT | /api/customers/:id | Update customer |
| GET | /api/customers/:id/purchases | Customer purchase history |
| GET | /api/customers/:id/ledger | Reward ledger |
| GET | /api/customers/:id/offers | Personalised offers |

### Purchases
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/purchases | List all purchases |
| POST | /api/purchases | Record new purchase |
| GET | /api/purchases/:id | Get purchase detail |

### Rewards
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/rewards/redeem | Redeem points |
| GET | /api/rewards/rules | Get active rules |
| POST | /api/rewards/rules | Create new rule |
| GET | /api/rewards/calculate | Calculate preview |

### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/dashboard/stats | Aggregate stats |
| GET | /api/dashboard/recent-transactions | Last 10 |
| GET | /api/dashboard/sales-trend | Last 30 days |
| GET | /api/dashboard/redemption-trend | Last 30 days |

### Offers
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/offers/generate/:customerId | Regenerate offers |

---

## 4. Reward Calculation Flow

```
Purchase Submitted
       │
       ▼
Validate input (amount > 0, customer exists, ref not duplicate)
       │
       ▼
BEGIN TRANSACTION
       │
       ├─ If redemption requested:
       │    • Validate: points >= min_redemption
       │    • Validate: customer balance >= points_to_redeem
       │    • Calculate discount = floor(points / redemption_rate)
       │    • Validate: discount <= purchase total
       │    • net_eligible = total - discount
       │  Else:
       │    • net_eligible = total
       │
       ├─ Calculate earned points:
       │    points_earned = floor(net_eligible / earn_threshold) × earn_multiplier
       │
       ├─ Insert purchase record
       ├─ Insert purchase_items
       │
       ├─ If redemption:
       │    • INSERT redemption record
       │    • INSERT ledger entry (type=redeem, points=-points_redeemed)
       │    • UPDATE customer balance -= points_redeemed
       │
       ├─ INSERT ledger entry (type=earn, points=+points_earned)
       ├─ UPDATE customer points_balance += points_earned
       ├─ UPDATE customer lifetime_spend, last_purchase_date
       │
COMMIT TRANSACTION
       │
       ▼
Return purchase summary
```

---

## 5. Offer Recommendation Logic

Evaluated in priority order; multiple offers can apply:

```
function generateOffersForCustomer(customer, purchases):
  offers = []

  daysSinceJoin = today - customer.join_date
  daysSinceLastPurchase = today - customer.last_purchase_date (or ∞ if none)
  totalPurchases = count(purchases)
  lifetimeSpend = customer.lifetime_spend

  categoryPurchasesLast90Days = groupBy(
    filter(purchases, date > today-90days),
    category
  )

  // Rule 1: Welcome Offer
  if daysSinceJoin < 30 AND totalPurchases < 2:
    offers.push(WELCOME_OFFER)

  // Rule 2: Comeback Offer
  if daysSinceLastPurchase > 60:
    offers.push(COMEBACK_OFFER)

  // Rule 3: Grocery Discount
  if categoryPurchasesLast90Days['Groceries'] >= 3:
    offers.push(GROCERY_OFFER)

  // Rule 4: Café Reward
  if categoryPurchasesLast90Days['Café'] >= 3:
    offers.push(CAFE_OFFER)

  // Rule 5: Premium Loyalty
  if lifetimeSpend >= 10000:
    offers.push(PREMIUM_OFFER)

  // Rule 6: Repeat Customer
  if totalPurchases >= 5:
    offers.push(REPEAT_CUSTOMER_OFFER)

  return offers
```

---

## 6. Error Handling Strategy

| Error Type | HTTP Status | Response |
|-----------|-------------|----------|
| Validation error | 400 | { error, details } |
| Not found | 404 | { error } |
| Duplicate key | 409 | { error } |
| Insufficient balance | 422 | { error, current_balance } |
| Server error | 500 | { error } |

All errors return JSON `{ "error": "message" }`. Frontend displays contextual toast/alert messages.

---

## 7. Frontend Route Structure

```
/                     → Dashboard
/customers            → Customer list
/customers/new        → Add customer form
/customers/:id        → Customer profile
/purchases            → Purchase history
/purchases/new        → New purchase form
/rewards              → Redemption interface
/offers               → All offers (filterable)
/transactions         → Transaction history
/settings/rules       → Reward rules configuration
```

---

## 8. Project File Structure

```
c:\Kiro Project\
├── backend\
│   ├── src\
│   │   ├── db\
│   │   │   ├── database.js        # SQLite connection
│   │   │   ├── schema.js          # Table definitions
│   │   │   └── seed.js            # Synthetic data
│   │   ├── routes\
│   │   │   ├── customers.js
│   │   │   ├── purchases.js
│   │   │   ├── rewards.js
│   │   │   ├── dashboard.js
│   │   │   └── offers.js
│   │   ├── services\
│   │   │   ├── rewardEngine.js    # Core calculation logic
│   │   │   ├── offerEngine.js     # Recommendation rules
│   │   │   └── purchaseService.js
│   │   └── middleware\
│   │       └── errorHandler.js
│   ├── tests\
│   │   └── *.test.js
│   ├── data\                      # SQLite DB file location
│   ├── server.js
│   └── package.json
├── frontend\
│   ├── src\
│   │   ├── components\
│   │   ├── pages\
│   │   ├── api\
│   │   ├── hooks\
│   │   └── main.jsx
│   ├── vite.config.js
│   └── package.json
├── .kiro\
│   ├── specs\loyalty-rewards\
│   └── steering\
├── README.md
└── DECISIONS.md
```
