# RewardFlow — Technical Decisions

## D-01: SQLite over PostgreSQL/MySQL
**Decision:** Use SQLite with better-sqlite3.  
**Rationale:** No installation overhead; works offline on Windows; better-sqlite3 is synchronous which simplifies transaction handling; sufficient for a local retail store's data volume.  
**Trade-off:** Not suitable for multi-server deployments, but fits the challenge scope exactly.

## D-02: better-sqlite3 over node-sqlite3
**Decision:** Use better-sqlite3 (synchronous API).  
**Rationale:** Synchronous API avoids callback complexity in Express handlers; easier atomic transaction management; better performance for small datasets.  
**Trade-off:** Blocking I/O, but SQLite operations on a local DB are fast enough.

## D-03: Rule-based offers, not ML
**Decision:** Implement offers as deterministic rules.  
**Rationale:** Challenge explicitly requires deterministic rules and purchase-pattern segmentation; ML would require training data and infrastructure; rules are transparent and auditable.  
**Trade-off:** Less adaptable than a trained model, but fully explainable.

## D-04: Backend-only reward calculation
**Decision:** All point calculations happen in Express services, never in frontend code.  
**Rationale:** Prevents clients from manipulating point values; single source of truth; easier to test.

## D-05: Atomic SQLite transactions for purchases
**Decision:** Every purchase uses BEGIN/COMMIT transaction covering: purchase insert, ledger insert, balance update.  
**Rationale:** Prevents partial failures from corrupting balances.

## D-06: Vite proxy in development
**Decision:** Frontend Vite dev server proxies /api/* to backend.  
**Rationale:** Avoids CORS issues in development; clean separation.

## D-07: Floor (not round) for point calculation
**Decision:** Use Math.floor() for earned points.  
**Rationale:** Challenge specification explicitly states "round down to a whole number".

## D-08: Indian Rupees (₹) as currency
**Decision:** All monetary values displayed in ₹.  
**Rationale:** Challenge example uses ₹2,000 purchase and ₹10 discount.

## D-09: Vitest for testing
**Decision:** Use Vitest instead of Jest.  
**Rationale:** Vitest is faster, natively supports ES modules, and is the standard for Vite-based projects.

## D-10: No authentication
**Decision:** No login/auth system.  
**Rationale:** Challenge scope is a retailer-operated tool; adding auth would increase complexity without demonstrating loyalty engine functionality; noted as a known limitation.
