import { Router } from 'express';
import { getDb } from '../db/database.js';
import { generateOffers, saveOffers } from '../services/offerEngine.js';

const router = Router();

// POST /api/offers/generate/:customerId — regenerate offers for a customer
router.post('/generate/:customerId', (req, res, next) => {
  try {
    const db = getDb();
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const purchases = db.prepare('SELECT * FROM purchases WHERE customer_id = ? ORDER BY created_at DESC').all(req.params.customerId);
    const getItems = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?');
    const purchasesWithItems = purchases.map(p => ({ ...p, items: getItems.all(p.id) }));

    const offers = generateOffers(customer, purchasesWithItems);
    saveOffers(db, customer.id, offers);

    const savedOffers = db.prepare('SELECT * FROM customer_offers WHERE customer_id = ? ORDER BY created_at DESC').all(req.params.customerId);
    res.json({ data: savedOffers, count: savedOffers.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/offers — get all offers with optional filter
router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const { customerId, offerType } = req.query;

    let query = `
      SELECT co.*, c.name as customer_name, c.phone as customer_phone
      FROM customer_offers co
      JOIN customers c ON c.id = co.customer_id
      WHERE 1=1
    `;
    const params = [];

    if (customerId) {
      query += ' AND co.customer_id = ?';
      params.push(customerId);
    }
    if (offerType) {
      query += ' AND co.offer_type = ?';
      params.push(offerType);
    }

    query += ' ORDER BY co.created_at DESC';

    const offers = db.prepare(query).all(...params);
    res.json({ data: offers });
  } catch (err) {
    next(err);
  }
});

export default router;
