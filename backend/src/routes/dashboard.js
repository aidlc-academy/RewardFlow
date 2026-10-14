import { Router } from 'express';
import { getDb } from '../db/database.js';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', (req, res, next) => {
  try {
    const db = getDb();

    const totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
    const totalSales = db.prepare('SELECT COALESCE(SUM(total), 0) as sum FROM purchases').get().sum;
    const totalPurchases = db.prepare('SELECT COUNT(*) as count FROM purchases').get().count;
    const pointsIssued = db.prepare(`SELECT COALESCE(SUM(points), 0) as sum FROM reward_ledger WHERE type = 'earn'`).get().sum;
    const pointsRedeemed = db.prepare(`SELECT COALESCE(SUM(ABS(points)), 0) as sum FROM reward_ledger WHERE type = 'redeem'`).get().sum;
    const outstandingPoints = db.prepare('SELECT COALESCE(SUM(points_balance), 0) as sum FROM customers').get().sum;

    // Repeat customers = customers with 2+ purchases
    const repeatCustomers = db.prepare(`
      SELECT COUNT(*) as count FROM (
        SELECT customer_id FROM purchases GROUP BY customer_id HAVING COUNT(*) >= 2
      )
    `).get().count;

    res.json({
      data: {
        totalCustomers,
        totalSales: Number(totalSales.toFixed(2)),
        totalPurchases,
        pointsIssued,
        pointsRedeemed,
        outstandingPoints,
        repeatCustomers
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/recent-transactions
router.get('/recent-transactions', (req, res, next) => {
  try {
    const db = getDb();
    const transactions = db.prepare(`
      SELECT
        p.id,
        p.purchase_ref,
        p.total,
        p.points_earned,
        p.redemption_discount,
        p.created_at,
        c.id as customer_id,
        c.name as customer_name,
        c.phone as customer_phone
      FROM purchases p
      JOIN customers c ON c.id = p.customer_id
      ORDER BY p.created_at DESC
      LIMIT 10
    `).all();

    res.json({ data: transactions });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/sales-trend — last 30 days
router.get('/sales-trend', (req, res, next) => {
  try {
    const db = getDb();
    const trend = db.prepare(`
      SELECT
        date(created_at) as date,
        ROUND(SUM(total), 2) as sales,
        COUNT(*) as transactions
      FROM purchases
      WHERE created_at >= date('now', '-29 days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).all();

    // Fill in missing days with 0
    const result = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const found = trend.find(t => t.date === dateStr);
      result.push({
        date: dateStr,
        sales: found ? found.sales : 0,
        transactions: found ? found.transactions : 0
      });
    }

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/redemption-trend — last 30 days
router.get('/redemption-trend', (req, res, next) => {
  try {
    const db = getDb();
    const trend = db.prepare(`
      SELECT
        date(created_at) as date,
        SUM(ABS(points)) as points_redeemed,
        COUNT(*) as redemptions
      FROM reward_ledger
      WHERE type = 'redeem'
        AND created_at >= date('now', '-29 days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).all();

    const result = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const found = trend.find(t => t.date === dateStr);
      result.push({
        date: dateStr,
        pointsRedeemed: found ? found.points_redeemed : 0,
        redemptions: found ? found.redemptions : 0
      });
    }

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
