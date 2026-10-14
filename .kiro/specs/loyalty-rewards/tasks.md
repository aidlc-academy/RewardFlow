# RewardFlow — Implementation Tasks

**Version:** 1.0  
**Date:** 2026-10-13

---

## Phase 1: Backend Foundation

### T-01: Initialise backend Node.js project
- Create `backend/package.json` with Express, better-sqlite3, cors, uuid dependencies
- Create `backend/server.js` entry point
- Status: [ ]

### T-02: Database setup and schema
- Create `backend/src/db/database.js` — SQLite connection singleton
- Create `backend/src/db/schema.js` — all CREATE TABLE statements
- Initialise DB on server start
- Status: [ ]

### T-03: Seed script with synthetic data
- Create `backend/src/db/seed.js`
- Insert 10 sample customers
- Insert sample products across categories
- Insert 30+ purchase transactions
- Insert reward ledger entries consistent with purchases
- Status: [ ]

### T-04: Reward engine service
- Create `backend/src/services/rewardEngine.js`
- Implement calculateEarnedPoints(amount, rule)
- Implement calculateRedemptionDiscount(points, rule)
- Implement validateRedemption(points, balance, purchaseTotal, rule)
- Status: [ ]

### T-05: Customer routes
- GET /api/customers — list with search
- POST /api/customers — create
- GET /api/customers/:id — profile
- PUT /api/customers/:id — update
- GET /api/customers/:id/purchases
- GET /api/customers/:id/ledger
- Status: [ ]

### T-06: Purchase routes (atomic transaction)
- POST /api/purchases — record purchase with atomic DB transaction
- GET /api/purchases — list all
- GET /api/purchases/:id — detail
- Status: [ ]

### T-07: Reward and redemption routes
- POST /api/rewards/redeem — standalone redemption
- GET /api/rewards/rules — get active rules
- GET /api/rewards/calculate — preview calculation
- Status: [ ]

### T-08: Dashboard routes
- GET /api/dashboard/stats
- GET /api/dashboard/recent-transactions
- GET /api/dashboard/sales-trend
- GET /api/dashboard/redemption-trend
- Status: [ ]

### T-09: Offer engine and routes
- Create `backend/src/services/offerEngine.js` with all 6 rules
- POST /api/offers/generate/:customerId
- GET /api/customers/:id/offers
- Status: [ ]

---

## Phase 2: Backend Tests

### T-10: Write and run backend tests
- Customer creation
- Duplicate purchase rejection
- Points calculation correctness
- Point rounding (floor)
- Minimum redemption validation
- Insufficient balance rejection
- Redemption with purchase (net amount)
- Ledger consistency
- Status: [ ]

---

## Phase 3: Frontend Setup

### T-11: Initialise React/Vite frontend
- Create frontend project with Vite
- Install Tailwind CSS, Recharts, Lucide React
- Configure Vite proxy to backend
- Status: [ ]

### T-12: Layout and navigation
- Sidebar navigation component
- Header component
- Layout wrapper
- React Router routes
- Status: [ ]

### T-13: API client layer
- Create `frontend/src/api/` modules for each domain
- Consistent error handling
- Status: [ ]

---

## Phase 4: Frontend Pages

### T-14: Dashboard page
- Stats cards (6 KPIs)
- Recent transactions table
- Sales trend chart (Recharts)
- Redemption trend chart
- Status: [ ]

### T-15: Customers list page
- Table with search/filter
- Add customer button → modal or page
- Status: [ ]

### T-16: Customer profile page
- Customer details card
- Points balance
- Purchase history table
- Reward ledger table
- Active offers section
- Status: [ ]

### T-17: New purchase page
- Customer selector
- Add items (product, category, qty, price)
- Subtotal / total calculation
- Optional redemption input
- Points preview
- Submit → success confirmation
- Status: [ ]

### T-18: Rewards and redemption page
- Customer selector
- Balance display
- Points input with validation
- Discount preview
- Confirm button
- History table
- Status: [ ]

### T-19: Personalised offers page
- Filter by customer
- Offer cards with reason
- Regenerate button
- Status: [ ]

### T-20: Transaction history page
- Combined purchase + ledger view
- Search and date filters
- Status: [ ]

### T-21: Reward rules settings page
- Display active rules
- Earn/redeem rates
- Status: [ ]

---

## Phase 5: Integration and Seed Data

### T-22: End-to-end integration
- Verify all API calls work from frontend
- Test full purchase → ledger → balance flow
- Status: [ ]

### T-23: Demonstration data
- Ensure seed data covers demo scenario
- Arun customer ready for demo
- Sample category purchases for offer triggers
- Status: [ ]

---

## Phase 6: Documentation

### T-24: README.md and DECISIONS.md
- Setup and run instructions
- Windows PowerShell commands
- Demo walkthrough
- Status: [ ]
