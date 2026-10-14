import { Router } from 'express';
import { getDb } from '../db/database.js';
import { getActiveRule, calculatePurchase } from '../services/rewardEngine.js';
import { syncPurchase, syncCustomer, syncLedgerEntry, syncRedemption } from '../services/firebase.js';

const router = Router();

// GET /api/purchases — list all purchases
router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { customerId, from, to, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT p.*, c.name as customer_name, c.phone as customer_phone
      FROM purchases p
      JOIN customers c ON c.id = p.customer_id
      WHERE 1=1
    `;
    const params = [];

    if (customerId) {
      query += ' AND p.customer_id = ?';
      params.push(customerId);
    }
    if (from) {
      query += ' AND p.created_at >= ?';
      params.push(from);
    }
    if (to) {
      query += ' AND p.created_at <= ?';
      params.push(to + ' 23:59:59');
    }

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const purchases = db.prepare(query).all(...params);
    const getItems = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?');
    const result = purchases.map(p => ({ ...p, items: getItems.all(p.id) }));

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/purchases/:id — single purchase
router.get('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const purchase = db.prepare(`
      SELECT p.*, c.name as customer_name, c.phone as customer_phone
      FROM purchases p
      JOIN customers c ON c.id = p.customer_id
      WHERE p.id = ?
    `).get(req.params.id);

    if (!purchase) {
      return res.status(404).json({ error: 'Purchase not found.' });
    }

    const items = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(req.params.id);
    res.json({ data: { ...purchase, items } });
  } catch (err) {
    next(err);
  }
});

// POST /api/purchases — record a new purchase
router.post('/', (req, res, next) => {
  try {
    const db = getDb();
    const { customerId, purchaseRef, items, pointsToRedeem } = req.body;

    // Validate required fields
    if (!customerId) {
      return res.status(400).json({ error: 'Customer ID is required.' });
    }
    if (!purchaseRef || !purchaseRef.trim()) {
      return res.status(400).json({ error: 'Purchase reference is required.' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one purchase item is required.' });
    }

    // Validate all items
    for (const item of items) {
      if (!item.productName || !item.category) {
        return res.status(400).json({ error: 'Each item must have a product name and category.' });
      }
      if (!item.quantity || item.quantity <= 0 || !Number.isInteger(Number(item.quantity))) {
        return res.status(400).json({ error: 'Item quantity must be a positive integer.' });
      }
      if (!item.unitPrice || item.unitPrice <= 0) {
        return res.status(400).json({ error: 'Item unit price must be a positive number.' });
      }
    }

    // Check customer exists
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    // Check for duplicate purchase reference
    const existing = db.prepare('SELECT id FROM purchases WHERE purchase_ref = ?').get(purchaseRef.trim());
    if (existing) {
      const err = new Error(`Purchase reference '${purchaseRef}' already exists.`);
      err.code = 'DUPLICATE_PURCHASE';
      throw err;
    }

    // Calculate subtotal from items
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const tax = 0; // Simplified: no tax for this demo
    const total = subtotal + tax;

    if (total <= 0) {
      const err = new Error('Purchase total must be greater than zero.');
      err.code = 'INVALID_AMOUNT';
      throw err;
    }

    // Get active reward rule
    const rule = getActiveRule(db);

    // Calculate points, redemption, etc.
    const calc = calculatePurchase(total, customer.points_balance, pointsToRedeem || null, rule);

    // Atomic database transaction using explicit SQL BEGIN/COMMIT
    let purchaseId;
    try {
      db.exec('BEGIN');

      // Insert purchase
      const purchaseResult = db.prepare(`
        INSERT INTO purchases
          (purchase_ref, customer_id, subtotal, tax, total, redemption_used, redemption_discount, net_eligible, points_earned, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        purchaseRef.trim(),
        customerId,
        subtotal,
        tax,
        total,
        calc.redemptionUsed,
        calc.redemptionDiscount,
        calc.netEligible,
        calc.pointsEarned
      );
      purchaseId = purchaseResult.lastInsertRowid;

      // Insert items
      const insertItem = db.prepare(`
        INSERT INTO purchase_items (purchase_id, product_name, category, quantity, unit_price, line_total)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const item of items) {
        insertItem.run(
          purchaseId,
          item.productName,
          item.category,
          Number(item.quantity),
          Number(item.unitPrice),
          Number(item.quantity) * Number(item.unitPrice)
        );
      }

      let runningBalance = customer.points_balance;

      // If redemption was applied, insert redemption record and ledger entry
      if (calc.redemptionUsed > 0) {
        db.prepare(`
          INSERT INTO redemptions (customer_id, purchase_id, points_redeemed, discount_value, idempotency_key, created_at)
          VALUES (?, ?, ?, ?, ?, datetime('now'))
        `).run(customerId, purchaseId, calc.redemptionUsed, calc.redemptionDiscount, `purchase-${purchaseRef.trim()}`);

        runningBalance -= calc.redemptionUsed;

        db.prepare(`
          INSERT INTO reward_ledger (customer_id, type, points, balance_after, reference_id, description, created_at)
          VALUES (?, 'redeem', ?, ?, ?, ?, datetime('now'))
        `).run(
          customerId,
          -calc.redemptionUsed,
          runningBalance,
          purchaseRef.trim(),
          `Redeemed ${calc.redemptionUsed} points for ₹${calc.redemptionDiscount} discount on purchase ${purchaseRef.trim()}`
        );
      }

      // Insert earn ledger entry
      runningBalance += calc.pointsEarned;
      db.prepare(`
        INSERT INTO reward_ledger (customer_id, type, points, balance_after, reference_id, description, created_at)
        VALUES (?, 'earn', ?, ?, ?, ?, datetime('now'))
      `).run(
        customerId,
        calc.pointsEarned,
        runningBalance,
        purchaseRef.trim(),
        `Earned ${calc.pointsEarned} points on purchase ${purchaseRef.trim()} (net eligible: ₹${calc.netEligible.toFixed(2)})`
      );

      // Update customer balance, lifetime spend, last purchase date
      db.prepare(`
        UPDATE customers
        SET points_balance = ?,
            lifetime_spend = lifetime_spend + ?,
            last_purchase_date = date('now'),
            updated_at = datetime('now')
        WHERE id = ?
      `).run(runningBalance, total, customerId);

      db.exec('COMMIT');
    } catch (txErr) {
      db.exec('ROLLBACK');
      throw txErr;
    }

    // Fetch the created purchase for response
    const purchase = db.prepare(`
      SELECT p.*, c.name as customer_name FROM purchases p
      JOIN customers c ON c.id = p.customer_id
      WHERE p.id = ?
    `).get(purchaseId);
    const savedItems = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(purchaseId);
    const updatedCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);

    // ── Firestore sync (non-blocking) ──────────────────────────────────────
    syncPurchase(purchase, savedItems).catch(() => {});
    syncCustomer(updatedCustomer).catch(() => {});
    // Sync the ledger entries just written
    const newLedger = db.prepare(
      'SELECT * FROM reward_ledger WHERE customer_id = ? ORDER BY id DESC LIMIT ?'
    ).all(customerId, calc.redemptionUsed > 0 ? 2 : 1);
    newLedger.forEach(e => syncLedgerEntry(e).catch(() => {}));
    // Sync redemption record if present
    if (calc.redemptionUsed > 0) {
      const red = db.prepare(
        'SELECT * FROM redemptions WHERE customer_id = ? ORDER BY id DESC LIMIT 1'
      ).get(customerId);
      if (red) syncRedemption(red).catch(() => {});
    }
    // ──────────────────────────────────────────────────────────────────────

    res.status(201).json({
      data: {
        purchase: { ...purchase, items: savedItems },
        calculation: calc,
        customer: {
          id: updatedCustomer.id,
          name: updatedCustomer.name,
          points_balance: updatedCustomer.points_balance
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

export default router;
