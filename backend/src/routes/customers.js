import { Router } from 'express';
import { getDb } from '../db/database.js';
import { generateOffers, saveOffers } from '../services/offerEngine.js';
import { syncCustomer, syncOffers as syncFirestoreOffers } from '../services/firebase.js';

const router = Router();

// GET /api/customers — list all customers with optional search
router.get('/', (req, res, next) => {
  try {
    const db = getDb();
    const q = req.query.q ? `%${req.query.q}%` : null;

    let customers;
    if (q) {
      customers = db.prepare(`
        SELECT * FROM customers
        WHERE name LIKE ? OR phone LIKE ?
        ORDER BY name ASC
      `).all(q, q);
    } else {
      customers = db.prepare('SELECT * FROM customers ORDER BY name ASC').all();
    }

    res.json({ data: customers });
  } catch (err) {
    next(err);
  }
});

// POST /api/customers — create a new customer
router.post('/', (req, res, next) => {
  try {
    const db = getDb();
    const { name, phone, email } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Customer name is required.' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    // Check for duplicate phone
    const existing = db.prepare('SELECT id FROM customers WHERE phone = ?').get(phone.trim());
    if (existing) {
      return res.status(409).json({ error: 'A customer with this phone number already exists.' });
    }

    const result = db.prepare(`
      INSERT INTO customers (name, phone, email, join_date, created_at, updated_at)
      VALUES (?, ?, ?, date('now'), datetime('now'), datetime('now'))
    `).run(name.trim(), phone.trim(), email ? email.trim() : null);

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
    // Firestore sync
    syncCustomer(customer).catch(() => {});
    res.status(201).json({ data: customer });
  } catch (err) {
    next(err);
  }
});

// GET /api/customers/:id — get customer profile
router.get('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }
    res.json({ data: customer });
  } catch (err) {
    next(err);
  }
});

// PUT /api/customers/:id — update customer
router.put('/:id', (req, res, next) => {
  try {
    const db = getDb();
    const { name, phone, email } = req.body;

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Customer name is required.' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'Phone number is required.' });
    }

    // Check duplicate phone for another customer
    const duplicate = db.prepare('SELECT id FROM customers WHERE phone = ? AND id != ?').get(phone.trim(), req.params.id);
    if (duplicate) {
      return res.status(409).json({ error: 'Another customer with this phone number already exists.' });
    }

    db.prepare(`
      UPDATE customers SET name = ?, phone = ?, email = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(name.trim(), phone.trim(), email ? email.trim() : null, req.params.id);

    const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    // Firestore sync
    syncCustomer(updated).catch(() => {});
    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
});

// GET /api/customers/:id/purchases — purchase history
router.get('/:id/purchases', (req, res, next) => {
  try {
    const db = getDb();
    const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const purchases = db.prepare(`
      SELECT * FROM purchases WHERE customer_id = ? ORDER BY created_at DESC
    `).all(req.params.id);

    // Attach items to each purchase
    const getItems = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?');
    const result = purchases.map(p => ({ ...p, items: getItems.all(p.id) }));

    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/customers/:id/ledger — reward ledger
router.get('/:id/ledger', (req, res, next) => {
  try {
    const db = getDb();
    const customer = db.prepare('SELECT id FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    const ledger = db.prepare(`
      SELECT * FROM reward_ledger WHERE customer_id = ? ORDER BY created_at DESC
    `).all(req.params.id);

    res.json({ data: ledger });
  } catch (err) {
    next(err);
  }
});

// GET /api/customers/:id/offers — get offers
router.get('/:id/offers', (req, res, next) => {
  try {
    const db = getDb();
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found.' });
    }

    // Regenerate offers fresh
    const purchases = db.prepare('SELECT * FROM purchases WHERE customer_id = ? ORDER BY created_at DESC').all(req.params.id);
    const getItems = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?');
    const purchasesWithItems = purchases.map(p => ({ ...p, items: getItems.all(p.id) }));

    const offers = generateOffers(customer, purchasesWithItems);
    saveOffers(db, customer.id, offers);

    const savedOffers = db.prepare('SELECT * FROM customer_offers WHERE customer_id = ? ORDER BY created_at DESC').all(req.params.id);
    // Firestore sync
    syncFirestoreOffers(req.params.id, savedOffers).catch(() => {});
    res.json({ data: savedOffers });
  } catch (err) {
    next(err);
  }
});

export default router;
