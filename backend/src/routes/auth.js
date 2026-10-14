import { Router } from 'express';
import bcrypt from 'bcrypt';
import { getDb } from '../db/database.js';
import { requireAuth, requireOwner } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const db   = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email.trim());
    const hash = user ? user.password_hash : '$2b$12$invaliddummyhashpaddingtomaintaintimingx';
    const ok   = await bcrypt.compare(password, hash);

    if (!user || !ok)
      return res.status(401).json({ error: 'Invalid email or password.' });
    if (!user.is_active)
      return res.status(403).json({ error: 'This account has been deactivated.' });

    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'Session error.' });
      req.session.userId = user.id;
      req.session.role   = user.role;
      res.json({ data: { id: user.id, name: user.name, email: user.email, role: user.role } });
    });
  } catch (e) {
    res.status(500).json({ error: 'Login failed.' });
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('rf_sid');
    res.json({ data: { message: 'Logged out.' } });
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const db   = getDb();
  const user = db.prepare('SELECT id, email, name, role, is_active FROM users WHERE id = ?').get(req.session.userId);
  if (!user || !user.is_active) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: 'Account not found or deactivated.' });
  }
  res.json({ data: user });
});

// GET /api/auth/employees  (owner only)
router.get('/employees', requireAuth, requireOwner, (req, res) => {
  const employees = getDb().prepare(
    "SELECT id, email, name, role, is_active, created_at FROM users WHERE role='employee' ORDER BY created_at DESC"
  ).all();
  res.json({ data: employees });
});

// POST /api/auth/employees  (owner only)
router.post('/employees', requireAuth, requireOwner, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim())            return res.status(400).json({ error: 'Name is required.' });
    if (!email?.trim())           return res.status(400).json({ error: 'Email is required.' });
    if (!password || password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const db = getDb();
    if (db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email.trim()))
      return res.status(409).json({ error: 'An account with this email already exists.' });

    const hash   = await bcrypt.hash(password, 12);
    const result = db.prepare(
      "INSERT INTO users (name, email, password_hash, role, is_active) VALUES (?, ?, ?, 'employee', 1)"
    ).run(name.trim(), email.trim().toLowerCase(), hash);

    const created = db.prepare('SELECT id, email, name, role, is_active, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ data: created });
  } catch (e) {
    res.status(500).json({ error: 'Failed to create employee.' });
  }
});

// PATCH /api/auth/employees/:id  (owner only)
router.patch('/employees/:id', requireAuth, requireOwner, (req, res) => {
  const db  = getDb();
  const emp = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'employee'").get(req.params.id);
  if (!emp) return res.status(404).json({ error: 'Employee not found.' });

  const active = req.body.is_active ? 1 : 0;
  db.prepare("UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?").run(active, req.params.id);
  res.json({ data: db.prepare('SELECT id, email, name, role, is_active, created_at FROM users WHERE id = ?').get(req.params.id) });
});

// DELETE /api/auth/employees/:id  (owner only)
router.delete('/employees/:id', requireAuth, requireOwner, (req, res) => {
  const db  = getDb();
  const emp = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'employee'").get(req.params.id);
  if (!emp) return res.status(404).json({ error: 'Employee not found.' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ data: { message: 'Employee deleted.' } });
});

// POST /api/auth/setup  — one-time owner creation (locked after first owner exists)
router.post('/setup', async (req, res) => {
  try {
    const db = getDb();
    if (db.prepare("SELECT id FROM users WHERE role = 'owner'").get())
      return res.status(403).json({ error: 'Owner already exists. Setup is disabled.' });

    const { name, email, password, setupKey } = req.body;
    if (!process.env.RF_SETUP_KEY || setupKey !== process.env.RF_SETUP_KEY)
      return res.status(403).json({ error: 'Invalid setup key.' });
    if (!name?.trim() || !email?.trim())
      return res.status(400).json({ error: 'Name and email are required.' });
    if (!password || password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const hash = await bcrypt.hash(password, 12);
    db.prepare("INSERT INTO users (name, email, password_hash, role, is_active) VALUES (?, ?, ?, 'owner', 1)")
      .run(name.trim(), email.trim().toLowerCase(), hash);

    console.log(`[Auth] Owner created: ${email.trim().toLowerCase()}`);
    res.status(201).json({ data: { message: 'Owner account created.', email: email.trim().toLowerCase() } });
  } catch (e) {
    res.status(500).json({ error: 'Setup failed.' });
  }
});

export default router;
