# RewardFlow — Smart Customer Loyalty and Rewards Engine

**AWS Kiro AI-DLC Challenge — Project #37**

A complete, locally-runnable loyalty management platform for small retailers. Track purchases, calculate reward points, manage redemptions, and deliver personalised offers based on purchase patterns — all with transparent, deterministic rules and persistent SQLite storage.

---

## Quick Start (Windows PowerShell)

### Prerequisites

- Node.js v22+ (install via https://nodejs.org or run the installer)
- No other dependencies required

### 1. Clone / navigate to the project

```powershell
cd "C:\Kiro Project"
```

### 2. Install backend dependencies

```powershell
cd backend
npm install
```

### 3. Seed the database with sample data

```powershell
node src/db/seed.js
```

### 4. Start the backend server

```powershell
node server.js
```

The API is now running on **http://localhost:5000**

### 5. Start the frontend (new terminal)

```powershell
cd "C:\Kiro Project\frontend"
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Running Tests

```powershell
cd "C:\Kiro Project\backend"
npm test
```

Expected output: **61 tests pass, 0 failures**

---

## Project Structure

```
C:\Kiro Project\
├── backend\
│   ├── src\
│   │   ├── db\
│   │   │   ├── database.js        SQLite connection (node:sqlite built-in)
│   │   │   ├── schema.js          Table definitions and initialisation
│   │   │   └── seed.js            Synthetic data generation
│   │   ├── routes\
│   │   │   ├── customers.js       Customer CRUD + history
│   │   │   ├── purchases.js       Purchase recording (atomic transactions)
│   │   │   ├── rewards.js         Points calculation + redemption
│   │   │   ├── dashboard.js       Aggregate statistics
│   │   │   ├── offers.js          Offer generation and retrieval
│   │   │   └── transactions.js    Unified transaction history
│   │   ├── services\
│   │   │   ├── rewardEngine.js    Core points calculation logic
│   │   │   └── offerEngine.js     Deterministic recommendation rules
│   │   └── middleware\
│   │       └── errorHandler.js
│   ├── tests\
│   │   ├── rewardEngine.test.js   26 tests for core calculation
│   │   ├── offerEngine.test.js    12 tests for offer rules
│   │   └── database.test.js       23 tests for business logic
│   ├── data\
│   │   └── rewardflow.db          SQLite database (auto-created)
│   ├── server.js
│   └── package.json
├── frontend\
│   ├── src\
│   │   ├── pages\                 All 8 application screens
│   │   ├── components\            Shared UI components
│   │   └── api\                   API client layer
│   └── package.json
└── .kiro\
    ├── specs\loyalty-rewards\
    │   ├── requirements.md
    │   ├── design.md
    │   └── tasks.md
    └── steering\
        └── rewardflow.md
```

---

## Reward Business Rules

| Rule | Value |
|------|-------|
| Earn rate | ₹10 spend = 1 point |
| Point rounding | floor() — always rounds down |
| Redemption rate | 10 points = ₹1 discount |
| Minimum redemption | 100 points |
| Net eligible amount | Total − Redemption Discount |
| Negative balance | Never allowed |

**Example:** ₹2,000 purchase → floor(2000/10) = **200 points**

**Example with redemption:** ₹2,000 purchase, redeem 100 pts (₹10 off) → net = ₹1,990 → floor(1990/10) = **199 points**

---

## Personalised Offer Rules

| Rule | Trigger | Offer |
|------|---------|-------|
| Welcome | Joined < 30 days AND < 2 purchases | 5% off next purchase |
| Comeback | Last purchase > 60 days ago | 50 bonus points |
| Grocery Loyalist | ≥ 3 grocery purchases in 90 days | 10% off groceries |
| Café Favourite | ≥ 3 café purchases in 90 days | Free beverage voucher |
| Premium Member | Lifetime spend ≥ ₹10,000 | 15% off + double points |
| Repeat Customer | ≥ 5 total purchases | 100 bonus points |

All offers store the reason and trigger rule for transparency.

---

## API Endpoints

### Customers
- `GET /api/customers?q=search` — list with optional search
- `POST /api/customers` — create
- `GET /api/customers/:id` — profile
- `PUT /api/customers/:id` — update
- `GET /api/customers/:id/purchases` — history
- `GET /api/customers/:id/ledger` — reward ledger
- `GET /api/customers/:id/offers` — personalised offers

### Purchases
- `POST /api/purchases` — record purchase (atomic transaction)
- `GET /api/purchases` — list all
- `GET /api/purchases/:id` — detail

### Rewards
- `POST /api/rewards/redeem` — standalone redemption
- `GET /api/rewards/rules` — active rules
- `GET /api/rewards/calculate?amount=X&pointsToRedeem=Y` — preview

### Dashboard
- `GET /api/dashboard/stats`
- `GET /api/dashboard/recent-transactions`
- `GET /api/dashboard/sales-trend`
- `GET /api/dashboard/redemption-trend`

---

## Demo Walkthrough

1. Open **http://localhost:5173** — dashboard shows live metrics
2. Go to **Customers** → **Add Customer** → Register "Arun Kumar"
3. Go to **New Purchase** → Select Arun → Add item ₹2,000 → Record
4. See **200 points earned** in the success screen
5. Navigate to Arun's **Customer Profile** → confirm 200 pts balance
6. Go to **Rewards & Redemption** → Select Arun → Redeem 100 pts
7. See **₹10 discount** applied, balance drops to **100 pts**
8. Refresh browser (F5) — all data persists (SQLite)
9. Try redeeming 50 pts → error: "Minimum 100 points"
10. Try redeeming 200 pts → error: "Insufficient balance"
11. Check **Personalised Offers** page for Arun's offers

---

## Known Limitations

1. **No authentication** — all data accessible without login. Suitable for single-operator use at a counter.
2. **Single currency** — Indian Rupees (₹) only.
3. **No real payment gateway** — purchases are recorded as completed; no payment processing.
4. **Single active rule** — creating a new reward rule deactivates the previous one; past transactions keep historical rates in their records.
5. **node:sqlite built-in** — requires Node.js v22.5+. The `node:sqlite` module is experimental/stable as of Node 24.
6. **No multi-store support** — single store instance per database.
7. **Offer generation is on-demand** — offers are regenerated when a customer profile is viewed or manually refreshed.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 19 + Vite 8 |
| Styling | Tailwind CSS 3 |
| Charts | Recharts 2 |
| Icons | Lucide React |
| Routing | React Router v7 |
| Backend | Node.js + Express 4 |
| Database | SQLite (node:sqlite built-in — no native compilation required) |
| Testing | Vitest 1.6 |

---

## Re-seeding Data

To reset the database to the original demo state:

```powershell
cd "C:\Kiro Project\backend"
node src/db/seed.js
```

This clears all existing data and re-creates the 10 sample customers and 39 purchase records.
