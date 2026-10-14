import { Router } from 'express';
import { getDb } from '../db/database.js';
import {
  runFullSync, isEnabled,
  syncCustomer, syncPurchase, syncLedgerEntry, syncRedemption
} from '../services/firebase.js';

const router = Router();

// GET /api/sync/status — check if Firestore sync is enabled
router.get('/status', (req, res) => {
  res.json({
    data: {
      firestoreEnabled: isEnabled(),
      project: 'rewardflow-ce9a4',
      message: isEnabled()
        ? 'Firestore sync is active. All writes are mirrored to Firebase.'
        : 'Firestore sync is disabled (service account key not found or invalid).'
    }
  });
});

// POST /api/sync/full — push everything from SQLite to Firestore
router.post('/full', async (req, res, next) => {
  try {
    const db = getDb();
    const result = await runFullSync(db);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// POST /api/sync/customer/:id — sync a single customer
router.post('/customer/:id', async (req, res, next) => {
  try {
    const db = getDb();
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });
    await syncCustomer(customer);
    res.json({ data: { synced: true, customer: customer.name } });
  } catch (err) {
    next(err);
  }
});

export default router;
