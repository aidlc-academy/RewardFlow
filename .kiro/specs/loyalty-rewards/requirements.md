# RewardFlow — Smart Customer Loyalty and Rewards Engine
## Requirements Document

**Version:** 1.0  
**Date:** 2026-10-13  
**Project:** AWS Kiro AI-DLC Challenge — Project #37

---

## 1. Overview

Small retailers struggle to run consistent loyalty programmes. RewardFlow is a web-based loyalty management platform designed for small supermarkets, grocery stores, cafés, and local retail businesses. It tracks purchases, calculates reward points, manages redemptions, and generates personalised offers from purchase history using deterministic rules.

---

## 2. User Stories

### Retailer / Admin

- As a retailer, I want to register new customers so that I can track their purchases and reward them.
- As a retailer, I want to record a customer purchase so that reward points are automatically calculated and credited.
- As a retailer, I want to apply a points redemption to a purchase so that loyal customers receive a discount.
- As a retailer, I want to view each customer's reward balance so that I can confirm their eligibility before redemption.
- As a retailer, I want to see a dashboard with key metrics so that I can understand business performance at a glance.
- As a retailer, I want to view transaction history with filters so that I can audit and resolve customer queries.
- As a retailer, I want to see personalised offer recommendations for each customer so that I can engage them with relevant promotions.
- As a retailer, I want to configure reward rules so that I can adapt the programme to my business.
- As a retailer, I want to edit customer details so that records remain accurate over time.
- As a retailer, I want the system to prevent duplicate purchases and invalid redemptions so that the ledger stays accurate.

### Customer-Facing (managed by retailer on behalf of customer)

- As a customer, I want my points to be calculated correctly on every purchase so that I trust the programme.
- As a customer, I want to redeem points for discounts so that I receive tangible value from my loyalty.
- As a customer, I want to see my reward balance and history so that I can plan future redemptions.
- As a customer, I want offers that reflect my actual buying behaviour so that promotions feel relevant.

---

## 3. Functional Requirements

### FR-01: Customer Management
- FR-01-1: The system shall allow creation of customers with: name, phone, email (optional), join date.
- FR-01-2: The system shall generate a unique customer ID for each customer.
- FR-01-3: The system shall allow editing of customer name, phone, and email.
- FR-01-4: The system shall allow searching customers by name or phone.
- FR-01-5: The system shall display customer profile including: balance, lifetime spend, last purchase date, purchase history, reward ledger, and active offers.
- FR-01-6: Customer data shall persist across server restarts.

### FR-02: Purchase Management
- FR-02-1: The system shall allow recording a purchase for an existing customer.
- FR-02-2: Each purchase shall have: unique purchase ID, customer ID, line items (product, category, quantity, unit price), subtotal, tax, total, and timestamp.
- FR-02-3: The system shall reject duplicate purchase IDs.
- FR-02-4: The system shall reject purchases with zero or negative amounts.
- FR-02-5: The system shall optionally allow applying a redemption discount at purchase time.
- FR-02-6: A completed purchase shall atomically update: purchase table, reward ledger, and customer balance.

### FR-03: Reward Point Engine
- FR-03-1: The system shall calculate earned points using the active reward rule: floor(eligible_amount / earn_threshold) × earn_multiplier.
- FR-03-2: Default rule: ₹10 spend = 1 point (earn_threshold=10, earn_multiplier=1).
- FR-03-3: Points shall be rounded down (floor) to whole numbers.
- FR-03-4: When a redemption discount is applied to the same purchase, points shall be calculated on the net eligible amount (total − redemption_discount).
- FR-03-5: The system shall allow redemption: points_to_redeem × redemption_rate = discount value. Default: 10 points = ₹1.
- FR-03-6: Minimum redemption: 100 points.
- FR-03-7: Customers cannot redeem more points than their current balance.
- FR-03-8: Redemption discount cannot exceed purchase total.
- FR-03-9: Point balances shall never go negative.
- FR-03-10: The system shall maintain an immutable reward ledger recording every earn and redeem event with timestamp, type, amount, and reference purchase ID.
- FR-03-11: All reward calculations shall be performed on the backend.

### FR-04: Personalised Offers
- FR-04-1: The system shall segment customers and generate offers using deterministic rules.
- FR-04-2: Segmentation rules:
  - New customer (< 30 days, < 2 purchases) → Welcome Offer
  - Inactive customer (no purchase > 60 days) → Comeback Offer
  - Frequent grocery buyer (≥ 3 grocery purchases in last 90 days) → Grocery Discount Offer
  - Frequent café buyer (≥ 3 café purchases in last 90 days) → Café Reward Offer
  - High spender (lifetime spend ≥ ₹10,000) → Premium Loyalty Offer
  - Repeat customer (≥ 5 purchases total) → Repeat Customer Offer
- FR-04-3: Each offer record shall store: offer type, reason, trigger rule, generated date, and expiry date.
- FR-04-4: Offers shall be regenerated on demand or on each profile view.
- FR-04-5: The UI shall display the reason behind each offer.

### FR-05: Redemption Interface
- FR-05-1: The redemption interface shall show: available points, conversion rate, minimum threshold, and calculated discount.
- FR-05-2: The system shall validate redemption before confirming.
- FR-05-3: The system shall prevent duplicate redemption requests (idempotency key or timestamp check).
- FR-05-4: Post-redemption, the balance shall update immediately.
- FR-05-5: Redemption history shall be stored and visible.

### FR-06: Dashboard
- FR-06-1: Dashboard shall display live metrics from the database: total customers, total sales, points issued, points redeemed, outstanding points, repeat customer count.
- FR-06-2: Dashboard shall show recent transactions (last 10).
- FR-06-3: Dashboard shall include a sales trend chart (last 30 days).
- FR-06-4: Dashboard shall include a reward redemption trend chart (last 30 days).

### FR-07: Transaction History
- FR-07-1: The system shall show all purchase transactions with: ID, customer, date, amount, points earned.
- FR-07-2: The system shall show all reward events: earn and redeem entries from the ledger.
- FR-07-3: Filters: by customer, by date range, by transaction type.

### FR-08: Reward Rules Settings
- FR-08-1: The system shall allow viewing of active reward rules.
- FR-08-2: The system shall allow creating new rules (future use, non-destructive).
- FR-08-3: The system shall display: earn threshold, earn multiplier, redemption rate, minimum redemption.

---

## 4. Non-Functional Requirements

- NFR-01: The application shall run locally on a Windows laptop without cloud services.
- NFR-02: All data shall be persisted in a SQLite database file.
- NFR-03: The backend API shall respond within 500ms for standard queries.
- NFR-04: The frontend shall be responsive (desktop-first, tablet-compatible).
- NFR-05: All reward calculations shall be deterministic and reproducible.
- NFR-06: Database operations affecting balances shall use SQLite transactions to ensure atomicity.
- NFR-07: The application shall handle invalid inputs gracefully with clear error messages.
- NFR-08: No external AI APIs, paid services, or cloud credentials required.

---

## 5. Business Rules

| Rule | Value |
|------|-------|
| Earn threshold | ₹10 per point |
| Earn multiplier | 1 point per threshold |
| Redemption rate | 10 points = ₹1 |
| Minimum redemption | 100 points |
| Max redemption per transaction | Customer balance (cannot exceed purchase total) |
| Point rounding | Floor (round down) |
| Net amount for points (with redemption) | Purchase total − redemption discount |
| Negative balance | Not allowed |

---

## 6. Acceptance Criteria

| ID | Scenario | Expected Result |
|----|----------|----------------|
| AC-01 | Register customer Arun | Customer created with balance 0 |
| AC-02 | Purchase ₹2,000 for Arun | 200 points credited, balance = 200 |
| AC-03 | Redeem 100 points | ₹10 discount, balance = 100 |
| AC-04 | Redeem 50 points (below minimum) | Error: minimum 100 points |
| AC-05 | Redeem 200 points with balance 100 | Error: insufficient balance |
| AC-06 | Submit duplicate purchase ID | Error: duplicate purchase |
| AC-07 | Submit purchase with amount ₹0 | Error: invalid amount |
| AC-08 | Refresh browser | All data persists |
| AC-09 | Customer with 5+ purchases | Repeat Customer Offer shown |
| AC-10 | Customer inactive 61 days | Comeback Offer shown |

---

## 7. Edge Cases

- Exactly 100 points (minimum redemption boundary) — allowed
- Points earned when redemption applied: floor((2000 − 10) / 10) = 199 points
- Customer with zero purchases — no offers except Welcome Offer if new
- Very large purchase amounts — no overflow in integer arithmetic
- Concurrent submissions of same purchase ID — second rejected
- Redemption where discount equals total — allowed, 0 net amount, 0 points earned
