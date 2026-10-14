import { Router } from 'express';
import { getDb } from '../db/database.js';
import { getActiveRule, validateRedemption, calculateRedemptionDiscount, calculateEarnedPoints } from '../services/rewardEngine.js';
import { syncCustomer, syncLedgerEntry, syncRedemption } from '../services/firebase.js';

const router = Router();

// GET /api/rewards/rules — get all reward rules
router.get('/rules', (req, res, next) => {
  try {
    const db = getDb();
    const rules = db.prepare('SELECT * FROM reward_rules ORDER BY id DESC').all();
    res.json({ data: rules });
  } catch (err) {
    next(err);
  }
});

// POST /api/rewards/rules — create a new reward rule
router.post('/rules', (req, res, next) => {
  try {
    const db = getDb();
    const { name, earnThreshold, earnMultiplier, redemptionRate, minRedemption } = req.body;

    if (!name) return res.status(400).json({ error: 'Rule name is required.' });
    if (!earnThreshold || earnThreshold <= 0) return res.status(400).json({ error: 'Earn threshold must be positive.' });
    if (!redemptionRate || redemptionRate <= 0) return res.status(400).json({ error: 'Redemption rate must be positive.' });
    if (!minRedemption || minRedemption < 1) return res.status(400).json({ error: 'Minimum redemption must be at least 1.' });

    // Deactivate existing rules
    db.prepare('UPDATE reward_rules SET is_active = 0').run();

    const result = db.prepare(`
      INSERT INTO reward_rules (name, earn_threshold, earn_multiplier, redemption_rate, min_redemption, is_active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(
      name,
      Number(earnThreshold),
      Number(earnMultiplier) || 1,
      Number(redemptionRate),
      Number(minRedemption)
    );

    const rule = db.prepare('SELECT * FROM reward_rules WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ data: rule });
  } catch (err) {
    next(err);
  }
});

// GET /api/rewards/calculate — preview points calculation
router.get('/calculate', (req, res, next) => {
  try {
    const db = getDb();
    const { amount, pointsToRedeem } = req.query;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number.' });
    }

    const rule = getActiveRule(db);
    const total = Number(amount);
    const redeem = pointsToRedeem ? Number(pointsToRedeem) : 0;

    let discount = 0;
    if (redeem > 0) {
      discount = calculateRedemptionDiscount(redeem, rule);
    }

    const netEligible = Math.max(0, total - discount);
    const pointsEarned = calculateEarnedPoints(netEligible, rule);

    res.json({
      data: {
        amount: total,
        redemptionDiscount: discount,
        netEligible,
        pointsEarned,
        rule: {
          earn_threshold: rule.earn_threshold,
          earn_multiplier: rule.earn_multiplier,
          redemption_rate: rule.redemption_rate,
          min_redemption: rule.min_redemption
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/rewards/redeem — standalone redemption (not tied to a purchase)
router.post('/redeem', (req, res, next) => {
  try {
    const db = getDb();
    const { customerId, pointsToRedeem, idempotencyKey } = req.body;

    if (!customerId) return res.status(400).json({ error: 'Customer ID is required.' });
    if (!pointsToRedeem || pointsToRedeem <= 0) {
      return res.status(400).json({ error: 'Points to redeem must be a positive number.' });
    }

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    // Check idempotency — prevent duplicate redemption
    if (idempotencyKey) {
      const existing = db.prepare('SELECT id FROM redemptions WHERE idempotency_key = ?').get(idempotencyKey);
      if (existing) {
        return res.status(409).json({ error: 'This redemption request has already been processed.', code: 'DUPLICATE_REDEMPTION' });
      }
    }

    const rule = getActiveRule(db);
    const points = Number(pointsToRedeem);

    const validation = validateRedemption(points, customer.points_balance, 0, rule);
    if (!validation.valid) {
      return res.status(422).json({ error: validation.error, code: validation.code, details: validation });
    }

    const discount = calculateRedemptionDiscount(points, rule);

    // Atomic transaction
    let newBalance;
    try {
      db.exec('BEGIN');

      newBalance = customer.points_balance - points;

      // Insert redemption
      const iKey = idempotencyKey || `standalone-${customerId}-${Date.now()}`;
      db.prepare(`
        INSERT INTO redemptions (customer_id, purchase_id, points_redeemed, discount_value, idempotency_key, created_at)
        VALUES (?, NULL, ?, ?, ?, datetime('now'))
      `).run(customerId, points, discount, iKey);

      // Insert ledger entry
      db.prepare(`
        INSERT INTO reward_ledger (customer_id, type, points, balance_after, description, created_at)
        VALUES (?, 'redeem', ?, ?, ?, datetime('now'))
      `).run(customerId, -points, newBalance, `Standalone redemption: ${points} points for ₹${discount} discount`);

      // Update customer balance
      db.prepare(`
        UPDATE customers SET points_balance = ?, updated_at = datetime('now') WHERE id = ?
      `).run(newBalance, customerId);

      db.exec('COMMIT');
    } catch (txErr) {
      db.exec('ROLLBACK');
      throw txErr;
    }
    const updatedCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);

    // ── Firestore sync (non-blocking) ──────────────────────────────────────
    syncCustomer(updatedCustomer).catch(() => {});
    const latestLedger = db.prepare(
      "SELECT * FROM reward_ledger WHERE customer_id = ? AND type='redeem' ORDER BY id DESC LIMIT 1"
    ).get(customerId);
    if (latestLedger) syncLedgerEntry(latestLedger).catch(() => {});
    const latestRedemption = db.prepare(
      'SELECT * FROM redemptions WHERE customer_id = ? ORDER BY id DESC LIMIT 1'
    ).get(customerId);
    if (latestRedemption) syncRedemption(latestRedemption).catch(() => {});
    // ──────────────────────────────────────────────────────────────────────

    res.json({
      data: {
        pointsRedeemed: points,
        discountValue: discount,
        previousBalance: customer.points_balance,
        newBalance,
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
