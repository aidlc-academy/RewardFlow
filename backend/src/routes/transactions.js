import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

// GET /api/transactions — unified view of purchases and ledger events
router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { customerId, type, from, to, limit = 50, offset = 0 } = req.query;

    // Build purchase query
    let purchaseQuery = `
      SELECT
        'purchase' as transaction_type,
        p.id,
        p.purchase_ref as reference,
        p.total as amount,
        p.points_earned as points,
        p.redemption_discount,
        p.created_at,
        c.id as customer_id,
        c.name as customer_name
      FROM purchases p
      JOIN customers c ON c.id = p.customer_id
      WHERE 1=1
    `;
    const pParams = [];

    if (customerId) { purchaseQuery += ' AND p.customer_id = ?'; pParams.push(customerId); }
    if (from) { purchaseQuery += ' AND p.created_at >= ?'; pParams.push(from); }
    if (to) { purchaseQuery += ' AND p.created_at <= ?'; pParams.push(to + ' 23:59:59'); }

    // Build ledger query
    let ledgerQuery = `
      SELECT
        CASE WHEN rl.type = 'earn' THEN 'earn' ELSE 'redeem' END as transaction_type,
        rl.id,
        COALESCE(rl.reference_id, 'N/A') as reference,
        ABS(rl.points) as amount,
        rl.points,
        0 as redemption_discount,
        rl.created_at,
        c.id as customer_id,
        c.name as customer_name
      FROM reward_ledger rl
      JOIN customers c ON c.id = rl.customer_id
      WHERE 1=1
    `;
    const lParams = [];

    if (customerId) { ledgerQuery += ' AND rl.customer_id = ?'; lParams.push(customerId); }
    if (from) { ledgerQuery += ' AND rl.created_at >= ?'; lParams.push(from); }
    if (to) { ledgerQuery += ' AND rl.created_at <= ?'; lParams.push(to + ' 23:59:59'); }

    let results = [];
    if (!type || type === 'purchase') {
      results = [...results, ...db.prepare(purchaseQuery).all(...pParams)];
    }
    if (!type || type === 'earn' || type === 'redeem') {
      const filtered = db.prepare(ledgerQuery).all(...lParams)
        .filter(r => !type || r.transaction_type === type);
      results = [...results, ...filtered];
    }

    // Sort by created_at desc, paginate
    results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const total = results.length;
    const paginated = results.slice(Number(offset), Number(offset) + Number(limit));

    res.json({ data: paginated, total, limit: Number(limit), offset: Number(offset) });
  } catch (err) {
    next(err);
  }
});

export default router;
