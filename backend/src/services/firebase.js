/**
 * RewardFlow — Firebase Firestore Sync Service
 *
 * Architecture:
 *   SQLite  →  primary store (all reads, all business logic)
 *   Firestore → real-time mirror (cloud backup, analytics, dashboard)
 *
 * Every write to SQLite is followed by a non-blocking Firestore sync.
 * If Firestore is unavailable the local operation still succeeds.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Initialise Firebase ──────────────────────────────────────────────────────

let db = null;
let enabled = false;

function init() {
  if (db) return db;

  // Look for the service-account key in the project root
  const keyPath = path.join(__dirname, '..', '..', '..', 'rewardflow-ce9a4-firebase-adminsdk-fbsvc-a06efaf989.json');

  if (!fs.existsSync(keyPath)) {
    console.warn('[Firebase] Service account key not found — Firestore sync disabled.');
    return null;
  }

  try {
    if (!getApps().length) {
      initializeApp({ credential: cert(keyPath) });
    }
    db = getFirestore();
    db.settings({ ignoreUndefinedProperties: true });
    enabled = true;
    console.log('[Firebase] Firestore sync enabled ✓  project: rewardflow-ce9a4');
    return db;
  } catch (err) {
    console.warn('[Firebase] Init failed — Firestore sync disabled.', err.message);
    return null;
  }
}

// Call init once at module load
init();

// ─── Safe write wrapper ───────────────────────────────────────────────────────

async function safeWrite(fn) {
  if (!enabled || !db) return;
  try {
    await fn(db);
  } catch (err) {
    // Never crash the main request — just log
    console.warn('[Firebase] Sync error:', err.message);
  }
}

// ─── Collection helpers ───────────────────────────────────────────────────────

export function isEnabled() { return enabled; }

// ─── Customer sync ────────────────────────────────────────────────────────────

export async function syncCustomer(customer) {
  await safeWrite(async (db) => {
    await db.collection('customers').doc(String(customer.id)).set({
      id:                  customer.id,
      name:                customer.name,
      phone:               customer.phone,
      email:               customer.email || null,
      joinDate:            customer.join_date,
      pointsBalance:       customer.points_balance,
      lifetimeSpend:       customer.lifetime_spend,
      lastPurchaseDate:    customer.last_purchase_date || null,
      createdAt:           customer.created_at,
      updatedAt:           customer.updated_at,
      syncedAt:            new Date().toISOString(),
    }, { merge: true });
  });
}

export async function syncAllCustomers(customers) {
  await safeWrite(async (db) => {
    const batch = db.batch();
    for (const c of customers) {
      const ref = db.collection('customers').doc(String(c.id));
      batch.set(ref, {
        id:               c.id,
        name:             c.name,
        phone:            c.phone,
        email:            c.email || null,
        joinDate:         c.join_date,
        pointsBalance:    c.points_balance,
        lifetimeSpend:    c.lifetime_spend,
        lastPurchaseDate: c.last_purchase_date || null,
        createdAt:        c.created_at,
        updatedAt:        c.updated_at,
        syncedAt:         new Date().toISOString(),
      }, { merge: true });
    }
    await batch.commit();
    console.log(`[Firebase] Synced ${customers.length} customers to Firestore.`);
  });
}

// ─── Purchase sync ────────────────────────────────────────────────────────────

export async function syncPurchase(purchase, items) {
  await safeWrite(async (db) => {
    const batch = db.batch();

    // Main purchase document
    const purchaseRef = db.collection('purchases').doc(String(purchase.id));
    batch.set(purchaseRef, {
      id:                  purchase.id,
      purchaseRef:         purchase.purchase_ref,
      customerId:          purchase.customer_id,
      customerName:        purchase.customer_name || null,
      subtotal:            purchase.subtotal,
      tax:                 purchase.tax,
      total:               purchase.total,
      redemptionUsed:      purchase.redemption_used,
      redemptionDiscount:  purchase.redemption_discount,
      netEligible:         purchase.net_eligible,
      pointsEarned:        purchase.points_earned,
      createdAt:           purchase.created_at,
      syncedAt:            new Date().toISOString(),
      items: (items || []).map(i => ({
        productName: i.product_name,
        category:    i.category,
        quantity:    i.quantity,
        unitPrice:   i.unit_price,
        lineTotal:   i.line_total,
      })),
    });

    // Denormalised copy under customer
    const custPurchaseRef = db
      .collection('customers').doc(String(purchase.customer_id))
      .collection('purchases').doc(String(purchase.id));
    batch.set(custPurchaseRef, {
      purchaseRef:  purchase.purchase_ref,
      total:        purchase.total,
      pointsEarned: purchase.points_earned,
      createdAt:    purchase.created_at,
    });

    await batch.commit();
  });
}

export async function syncAllPurchases(purchases) {
  await safeWrite(async (db) => {
    // Firestore batch limit is 500 — chunk if needed
    const chunks = [];
    for (let i = 0; i < purchases.length; i += 400) {
      chunks.push(purchases.slice(i, i + 400));
    }
    for (const chunk of chunks) {
      const batch = db.batch();
      for (const p of chunk) {
        const ref = db.collection('purchases').doc(String(p.id));
        batch.set(ref, {
          id:               p.id,
          purchaseRef:      p.purchase_ref,
          customerId:       p.customer_id,
          customerName:     p.customer_name || null,
          subtotal:         p.subtotal,
          total:            p.total,
          pointsEarned:     p.points_earned,
          redemptionUsed:   p.redemption_used,
          redemptionDiscount: p.redemption_discount,
          netEligible:      p.net_eligible,
          createdAt:        p.created_at,
          syncedAt:         new Date().toISOString(),
        }, { merge: true });
      }
      await batch.commit();
    }
    console.log(`[Firebase] Synced ${purchases.length} purchases to Firestore.`);
  });
}

// ─── Reward ledger sync ───────────────────────────────────────────────────────

export async function syncLedgerEntry(entry) {
  await safeWrite(async (db) => {
    await db.collection('reward_ledger').doc(String(entry.id)).set({
      id:           entry.id,
      customerId:   entry.customer_id,
      type:         entry.type,          // 'earn' | 'redeem'
      points:       entry.points,
      balanceAfter: entry.balance_after,
      referenceId:  entry.reference_id || null,
      description:  entry.description || null,
      createdAt:    entry.created_at,
      syncedAt:     new Date().toISOString(),
    });
  });
}

// ─── Redemption sync ──────────────────────────────────────────────────────────

export async function syncRedemption(redemption) {
  await safeWrite(async (db) => {
    await db.collection('redemptions').doc(String(redemption.id)).set({
      id:             redemption.id,
      customerId:     redemption.customer_id,
      purchaseId:     redemption.purchase_id || null,
      pointsRedeemed: redemption.points_redeemed,
      discountValue:  redemption.discount_value,
      createdAt:      redemption.created_at,
      syncedAt:       new Date().toISOString(),
    });
  });
}

// ─── Offer sync ───────────────────────────────────────────────────────────────

export async function syncOffers(customerId, offers) {
  await safeWrite(async (db) => {
    const batch = db.batch();
    // Overwrite the offers sub-collection for this customer
    for (const o of offers) {
      const ref = db
        .collection('customers').doc(String(customerId))
        .collection('offers').doc(String(o.id));
      batch.set(ref, {
        id:          o.id,
        offerType:   o.offer_type,
        title:       o.title,
        description: o.description,
        reason:      o.reason,
        triggerRule: o.trigger_rule,
        discountPct: o.discount_pct || null,
        validUntil:  o.valid_until || null,
        createdAt:   o.created_at,
      });
    }
    await batch.commit();
  });
}

// ─── Dashboard stats sync ─────────────────────────────────────────────────────

export async function syncDashboardStats(stats) {
  await safeWrite(async (db) => {
    await db.collection('meta').doc('dashboard_stats').set({
      ...stats,
      syncedAt: new Date().toISOString(),
    });
  });
}

// ─── Full initial sync ────────────────────────────────────────────────────────

export async function runFullSync(sqliteDb) {
  if (!enabled) {
    console.log('[Firebase] Firestore not enabled — skipping full sync.');
    return { synced: false };
  }

  console.log('[Firebase] Starting full sync to Firestore...');

  const customers = sqliteDb.prepare('SELECT * FROM customers').all();
  const purchases = sqliteDb.prepare(`
    SELECT p.*, c.name as customer_name
    FROM purchases p JOIN customers c ON c.id = p.customer_id
  `).all();
  const ledger    = sqliteDb.prepare('SELECT * FROM reward_ledger').all();
  const offers    = sqliteDb.prepare('SELECT * FROM customer_offers').all();
  const redemptions = sqliteDb.prepare('SELECT * FROM redemptions').all();

  await syncAllCustomers(customers);
  await syncAllPurchases(purchases);

  // Ledger — chunk into 400s
  const ledgerChunks = [];
  for (let i = 0; i < ledger.length; i += 400) ledgerChunks.push(ledger.slice(i, i + 400));
  for (const chunk of ledgerChunks) {
    await safeWrite(async (db) => {
      const batch = db.batch();
      for (const e of chunk) {
        batch.set(db.collection('reward_ledger').doc(String(e.id)), {
          id: e.id, customerId: e.customer_id, type: e.type,
          points: e.points, balanceAfter: e.balance_after,
          referenceId: e.reference_id || null, description: e.description || null,
          createdAt: e.created_at, syncedAt: new Date().toISOString(),
        });
      }
      await batch.commit();
    });
  }

  // Offers grouped by customer
  const offersByCustomer = {};
  for (const o of offers) {
    if (!offersByCustomer[o.customer_id]) offersByCustomer[o.customer_id] = [];
    offersByCustomer[o.customer_id].push(o);
  }
  for (const [custId, custOffers] of Object.entries(offersByCustomer)) {
    await syncOffers(custId, custOffers);
  }

  // Stats
  const stats = {
    totalCustomers:  customers.length,
    totalPurchases:  purchases.length,
    totalSales:      purchases.reduce((s, p) => s + p.total, 0),
    pointsIssued:    ledger.filter(e => e.type === 'earn').reduce((s, e) => s + e.points, 0),
    pointsRedeemed:  ledger.filter(e => e.type === 'redeem').reduce((s, e) => s + Math.abs(e.points), 0),
    outstandingPoints: customers.reduce((s, c) => s + c.points_balance, 0),
  };
  await syncDashboardStats(stats);

  console.log(`[Firebase] Full sync complete:
    customers=${customers.length}
    purchases=${purchases.length}
    ledger=${ledger.length}
    offers=${offers.length}`);

  return { synced: true, counts: { customers: customers.length, purchases: purchases.length, ledger: ledger.length } };
}
