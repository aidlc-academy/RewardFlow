/**
 * RewardFlow — Synthetic Data Seed Script
 * Generates realistic test data for demonstration.
 * Safe to re-run (uses INSERT OR IGNORE where possible).
 */

import { getDb } from './database.js';
import { initSchema } from './schema.js';
import { getActiveRule, calculatePurchase } from '../services/rewardEngine.js';
import bcrypt from 'bcrypt';

const db = getDb();
initSchema();

const rule = getActiveRule(db);

// ─── Helper ────────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

function dateOnly(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// ─── Clear existing seed data ──────────────────────────────────────────────

console.log('Clearing existing data...');
db.exec(`
  DELETE FROM customer_offers;
  DELETE FROM redemptions;
  DELETE FROM reward_ledger;
  DELETE FROM purchase_items;
  DELETE FROM purchases;
  DELETE FROM customers;
`);

// Reset autoincrement
db.exec(`
  DELETE FROM sqlite_sequence WHERE name IN
    ('customers','purchases','purchase_items','reward_ledger','redemptions','customer_offers');
`);

// ─── Customers ─────────────────────────────────────────────────────────────

console.log('Inserting customers...');

const insertCustomer = db.prepare(`
  INSERT INTO customers (name, phone, email, join_date, points_balance, lifetime_spend, last_purchase_date, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
`);

const customers = [
  { name: 'Priya Sharma',    phone: '9876543210', email: 'priya@example.com',    join_date: dateOnly(180), points: 450,  spend: 15200, last: 3 },
  { name: 'Rahul Verma',     phone: '9876543211', email: 'rahul@example.com',    join_date: dateOnly(90),  points: 210,  spend: 7800,  last: 10 },
  { name: 'Sneha Patel',     phone: '9876543212', email: 'sneha@example.com',    join_date: dateOnly(45),  points: 80,   spend: 2300,  last: 25 },
  { name: 'Aakash Mehta',    phone: '9876543213', email: 'aakash@example.com',   join_date: dateOnly(200), points: 1100, spend: 42000, last: 2 },
  { name: 'Divya Nair',      phone: '9876543214', email: 'divya@example.com',    join_date: dateOnly(120), points: 330,  spend: 11500, last: 15 },
  { name: 'Karan Joshi',     phone: '9876543215', email: 'karan@example.com',    join_date: dateOnly(365), points: 0,    spend: 5600,  last: 75 },
  { name: 'Meena Krishnan',  phone: '9876543216', email: 'meena@example.com',    join_date: dateOnly(60),  points: 190,  spend: 6200,  last: 8 },
  { name: 'Rohan Gupta',     phone: '9876543217', email: 'rohan@example.com',    join_date: dateOnly(10),  points: 50,   spend: 1500,  last: 5 },
  { name: 'Anjali Singh',    phone: '9876543218', email: 'anjali@example.com',   join_date: dateOnly(300), points: 720,  spend: 28000, last: 20 },
  { name: 'Vikram Reddy',    phone: '9876543219', email: 'vikram@example.com',   join_date: dateOnly(150), points: 160,  spend: 8900,  last: 45 },
];

const customerIds = {};
for (const c of customers) {
  const result = insertCustomer.run(
    c.name, c.phone, c.email, c.join_date,
    c.points, c.spend, dateOnly(c.last)
  );
  customerIds[c.name] = result.lastInsertRowid;
}
console.log(`Inserted ${customers.length} customers.`);

// ─── Purchases ─────────────────────────────────────────────────────────────

console.log('Inserting purchases and ledger entries...');

const insertPurchase = db.prepare(`
  INSERT INTO purchases
    (purchase_ref, customer_id, subtotal, tax, total, redemption_used, redemption_discount, net_eligible, points_earned, created_at)
  VALUES (?, ?, ?, 0, ?, 0, 0, ?, ?, ?)
`);

const insertItem = db.prepare(`
  INSERT INTO purchase_items (purchase_id, product_name, category, quantity, unit_price, line_total)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const insertLedger = db.prepare(`
  INSERT INTO reward_ledger (customer_id, type, points, balance_after, reference_id, description, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const purchaseData = [
  // Priya Sharma — high spender, frequent grocery
  { customer: 'Priya Sharma', ref: 'PUR-001', amount: 3500, daysAgo: 3,  items: [{ name: 'Rice 5kg', cat: 'Groceries', qty: 2, price: 600 }, { name: 'Cooking Oil 1L', cat: 'Groceries', qty: 1, price: 300 }, { name: 'Vegetables', cat: 'Groceries', qty: 1, price: 2000 }] },
  { customer: 'Priya Sharma', ref: 'PUR-002', amount: 2200, daysAgo: 20, items: [{ name: 'Dal 2kg', cat: 'Groceries', qty: 2, price: 450 }, { name: 'Sugar 1kg', cat: 'Groceries', qty: 2, price: 200 }, { name: 'Biscuits', cat: 'Snacks', qty: 4, price: 325 }] },
  { customer: 'Priya Sharma', ref: 'PUR-003', amount: 1800, daysAgo: 45, items: [{ name: 'Milk 1L', cat: 'Dairy', qty: 6, price: 60 }, { name: 'Bread', cat: 'Bakery', qty: 2, price: 40 }, { name: 'Eggs 12pk', cat: 'Dairy', qty: 2, price: 120 }] },
  { customer: 'Priya Sharma', ref: 'PUR-004', amount: 4200, daysAgo: 60, items: [{ name: 'Wheat Flour 5kg', cat: 'Groceries', qty: 2, price: 350 }, { name: 'Ghee 500ml', cat: 'Groceries', qty: 1, price: 500 }, { name: 'Detergent', cat: 'Household', qty: 2, price: 180 }] },
  { customer: 'Priya Sharma', ref: 'PUR-005', amount: 3500, daysAgo: 75, items: [{ name: 'Atta 10kg', cat: 'Groceries', qty: 1, price: 500 }, { name: 'Spices pack', cat: 'Groceries', qty: 1, price: 300 }, { name: 'Shampoo', cat: 'Personal Care', qty: 2, price: 120 }] },

  // Rahul Verma — regular
  { customer: 'Rahul Verma', ref: 'PUR-006', amount: 2000, daysAgo: 10, items: [{ name: 'Cold Coffee', cat: 'Café', qty: 2, price: 150 }, { name: 'Sandwich', cat: 'Café', qty: 2, price: 120 }, { name: 'Chips', cat: 'Snacks', qty: 5, price: 80 }] },
  { customer: 'Rahul Verma', ref: 'PUR-007', amount: 1500, daysAgo: 25, items: [{ name: 'Espresso', cat: 'Café', qty: 3, price: 100 }, { name: 'Croissant', cat: 'Café', qty: 3, price: 80 }, { name: 'Juice', cat: 'Beverages', qty: 2, price: 60 }] },
  { customer: 'Rahul Verma', ref: 'PUR-008', amount: 1800, daysAgo: 40, items: [{ name: 'Cappuccino', cat: 'Café', qty: 4, price: 120 }, { name: 'Muffin', cat: 'Bakery', qty: 2, price: 60 }, { name: 'Water Bottle', cat: 'Beverages', qty: 4, price: 25 }] },
  { customer: 'Rahul Verma', ref: 'PUR-009', amount: 2500, daysAgo: 55, items: [{ name: 'Groceries mix', cat: 'Groceries', qty: 1, price: 1500 }, { name: 'Latte', cat: 'Café', qty: 2, price: 130 }] },

  // Sneha Patel — newer customer
  { customer: 'Sneha Patel', ref: 'PUR-010', amount: 800,  daysAgo: 25, items: [{ name: 'Tomatoes 1kg', cat: 'Groceries', qty: 2, price: 80 }, { name: 'Onions 1kg', cat: 'Groceries', qty: 2, price: 60 }, { name: 'Coriander', cat: 'Groceries', qty: 4, price: 20 }] },
  { customer: 'Sneha Patel', ref: 'PUR-011', amount: 1500, daysAgo: 45, items: [{ name: 'Ready meal', cat: 'Groceries', qty: 3, price: 350 }, { name: 'Fruit pack', cat: 'Groceries', qty: 2, price: 225 }] },

  // Aakash Mehta — premium, high spender
  { customer: 'Aakash Mehta', ref: 'PUR-012', amount: 8000, daysAgo: 2,  items: [{ name: 'Premium Whisky', cat: 'Beverages', qty: 2, price: 2500 }, { name: 'Cheese platter', cat: 'Dairy', qty: 1, price: 1500 }, { name: 'Imported Chocolates', cat: 'Snacks', qty: 3, price: 500 }] },
  { customer: 'Aakash Mehta', ref: 'PUR-013', amount: 6500, daysAgo: 15, items: [{ name: 'Organic Vegetables', cat: 'Groceries', qty: 1, price: 2000 }, { name: 'Artisan Bread', cat: 'Bakery', qty: 2, price: 300 }, { name: 'Greek Yoghurt', cat: 'Dairy', qty: 4, price: 180 }, { name: 'Cold Brew', cat: 'Café', qty: 5, price: 160 }] },
  { customer: 'Aakash Mehta', ref: 'PUR-014', amount: 9000, daysAgo: 30, items: [{ name: 'Premium Groceries', cat: 'Groceries', qty: 1, price: 5000 }, { name: 'Wine', cat: 'Beverages', qty: 2, price: 1200 }, { name: 'Specialty Coffee', cat: 'Café', qty: 6, price: 133 }] },
  { customer: 'Aakash Mehta', ref: 'PUR-015', amount: 7500, daysAgo: 50, items: [{ name: 'Monthly Grocery Box', cat: 'Groceries', qty: 1, price: 7500 }] },
  { customer: 'Aakash Mehta', ref: 'PUR-016', amount: 5000, daysAgo: 70, items: [{ name: 'Household Supplies', cat: 'Household', qty: 1, price: 3000 }, { name: 'Personal Care kit', cat: 'Personal Care', qty: 1, price: 2000 }] },
  { customer: 'Aakash Mehta', ref: 'PUR-017', amount: 6000, daysAgo: 90, items: [{ name: 'Electronics accessories', cat: 'Electronics', qty: 1, price: 4000 }, { name: 'Gift pack', cat: 'Snacks', qty: 2, price: 1000 }] },

  // Divya Nair — repeat customer
  { customer: 'Divya Nair', ref: 'PUR-018', amount: 2500, daysAgo: 15, items: [{ name: 'Groceries', cat: 'Groceries', qty: 1, price: 2500 }] },
  { customer: 'Divya Nair', ref: 'PUR-019', amount: 1800, daysAgo: 30, items: [{ name: 'Café order', cat: 'Café', qty: 1, price: 1800 }] },
  { customer: 'Divya Nair', ref: 'PUR-020', amount: 3200, daysAgo: 50, items: [{ name: 'Groceries', cat: 'Groceries', qty: 1, price: 3200 }] },
  { customer: 'Divya Nair', ref: 'PUR-021', amount: 1500, daysAgo: 70, items: [{ name: 'Household', cat: 'Household', qty: 1, price: 1500 }] },
  { customer: 'Divya Nair', ref: 'PUR-022', amount: 2500, daysAgo: 100, items: [{ name: 'Groceries', cat: 'Groceries', qty: 1, price: 2500 }] },

  // Karan Joshi — inactive (75+ days)
  { customer: 'Karan Joshi', ref: 'PUR-023', amount: 1200, daysAgo: 75, items: [{ name: 'Groceries', cat: 'Groceries', qty: 1, price: 1200 }] },
  { customer: 'Karan Joshi', ref: 'PUR-024', amount: 1500, daysAgo: 120, items: [{ name: 'Personal Care', cat: 'Personal Care', qty: 1, price: 1500 }] },
  { customer: 'Karan Joshi', ref: 'PUR-025', amount: 2900, daysAgo: 200, items: [{ name: 'Groceries', cat: 'Groceries', qty: 1, price: 2900 }] },

  // Meena Krishnan
  { customer: 'Meena Krishnan', ref: 'PUR-026', amount: 2100, daysAgo: 8,  items: [{ name: 'Groceries', cat: 'Groceries', qty: 1, price: 2100 }] },
  { customer: 'Meena Krishnan', ref: 'PUR-027', amount: 1600, daysAgo: 22, items: [{ name: 'Café items', cat: 'Café', qty: 1, price: 1600 }] },
  { customer: 'Meena Krishnan', ref: 'PUR-028', amount: 2500, daysAgo: 40, items: [{ name: 'Groceries', cat: 'Groceries', qty: 1, price: 2500 }] },

  // Rohan Gupta — new customer
  { customer: 'Rohan Gupta', ref: 'PUR-029', amount: 1500, daysAgo: 5, items: [{ name: 'Welcome order', cat: 'Groceries', qty: 1, price: 1500 }] },

  // Anjali Singh — premium
  { customer: 'Anjali Singh', ref: 'PUR-030', amount: 5000, daysAgo: 20, items: [{ name: 'Monthly Groceries', cat: 'Groceries', qty: 1, price: 5000 }] },
  { customer: 'Anjali Singh', ref: 'PUR-031', amount: 4500, daysAgo: 45, items: [{ name: 'Premium items', cat: 'Groceries', qty: 1, price: 4500 }] },
  { customer: 'Anjali Singh', ref: 'PUR-032', amount: 6000, daysAgo: 70, items: [{ name: 'Bulk purchase', cat: 'Groceries', qty: 1, price: 6000 }] },
  { customer: 'Anjali Singh', ref: 'PUR-033', amount: 3500, daysAgo: 95, items: [{ name: 'Household', cat: 'Household', qty: 1, price: 3500 }] },
  { customer: 'Anjali Singh', ref: 'PUR-034', amount: 4000, daysAgo: 120, items: [{ name: 'Groceries', cat: 'Groceries', qty: 1, price: 4000 }] },
  { customer: 'Anjali Singh', ref: 'PUR-035', amount: 5000, daysAgo: 145, items: [{ name: 'Big shop', cat: 'Groceries', qty: 1, price: 5000 }] },

  // Vikram Reddy — inactive
  { customer: 'Vikram Reddy', ref: 'PUR-036', amount: 1800, daysAgo: 45, items: [{ name: 'Snacks', cat: 'Snacks', qty: 1, price: 1800 }] },
  { customer: 'Vikram Reddy', ref: 'PUR-037', amount: 2200, daysAgo: 80, items: [{ name: 'Groceries', cat: 'Groceries', qty: 1, price: 2200 }] },
  { customer: 'Vikram Reddy', ref: 'PUR-038', amount: 2900, daysAgo: 120, items: [{ name: 'Household', cat: 'Household', qty: 1, price: 2900 }] },
  { customer: 'Vikram Reddy', ref: 'PUR-039', amount: 2000, daysAgo: 150, items: [{ name: 'Groceries', cat: 'Groceries', qty: 1, price: 2000 }] },
];

// We track running balance per customer
const balances = {};
for (const name of Object.keys(customerIds)) {
  balances[name] = 0;
}

for (const p of purchaseData) {
  const customerId = customerIds[p.customer];
  if (!customerId) { console.warn(`Unknown customer: ${p.customer}`); continue; }

  const ts = daysAgo(p.daysAgo);

  const purchaseResult = insertPurchase.run(
    p.ref, customerId, p.amount, p.amount, p.amount,
    Math.floor(p.amount / rule.earn_threshold) * rule.earn_multiplier,
    ts
  );
  const purchaseId = purchaseResult.lastInsertRowid;

  for (const item of p.items) {
    insertItem.run(purchaseId, item.name, item.cat, item.qty, item.price, item.qty * item.price);
  }

  const pointsEarned = Math.floor(p.amount / rule.earn_threshold) * rule.earn_multiplier;
  balances[p.customer] = (balances[p.customer] || 0) + pointsEarned;

  insertLedger.run(
    customerId, 'earn', pointsEarned, balances[p.customer],
    p.ref, `Earned ${pointsEarned} points on purchase ${p.ref}`, ts
  );
}

console.log(`Inserted ${purchaseData.length} purchases.`);

// Update customer balances and lifetime spend from actual data
for (const [name, id] of Object.entries(customerIds)) {
  const agg = db.prepare('SELECT COALESCE(SUM(total),0) as spend FROM purchases WHERE customer_id = ?').get(id);
  const lastPurchase = db.prepare('SELECT MAX(date(created_at)) as last FROM purchases WHERE customer_id = ?').get(id);
  // Use stored balance from seed data (includes redemptions)
  const originalCustomer = customers.find(c => c.name === name);
  db.prepare(`
    UPDATE customers SET lifetime_spend = ?, last_purchase_date = ?, points_balance = ?, updated_at = datetime('now') WHERE id = ?
  `).run(agg.spend, lastPurchase.last, originalCustomer ? originalCustomer.points : 0, id);
}

console.log('Seed complete. Database ready for demonstration.');
console.log('\nSample customers seeded:');
customers.forEach(c => {
  console.log(`  • ${c.name} (${c.phone}) — ₹${c.spend.toLocaleString()} spent, ${c.points} points`);
});

// ─── Demo user accounts ────────────────────────────────────────────────────

console.log('\nCreating demo user accounts...');

const demoUsers = [
  { name: 'Store Owner',  email: 'owner@rewardflow.com',  password: 'Owner@2026!',    role: 'owner' },
  { name: 'Jane Employee',email: 'jane@rewardflow.com',   password: 'Jane@2026!',     role: 'employee' },
];

for (const u of demoUsers) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(u.email);
  if (existing) {
    console.log(`  • ${u.role} account already exists: ${u.email}`);
    continue;
  }
  const hash = await bcrypt.hash(u.password, 12);
  db.prepare(`
    INSERT INTO users (name, email, password_hash, role, is_active)
    VALUES (?, ?, ?, ?, 1)
  `).run(u.name, u.email, hash, u.role);
  console.log(`  • Created ${u.role}: ${u.email} / ${u.password}`);
}

console.log('\n✓ Demo accounts ready:');
console.log('  Owner    → owner@rewardflow.com  /  Owner@2026!');
console.log('  Employee → jane@rewardflow.com   /  Jane@2026!');
