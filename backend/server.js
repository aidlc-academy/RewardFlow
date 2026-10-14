import express from 'express';
import cors from 'cors';
import session from 'express-session';
import { rateLimit } from 'express-rate-limit';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';

import { initSchema } from './src/db/schema.js';
import { getDb } from './src/db/database.js';
import { errorHandler } from './src/middleware/errorHandler.js';
import { requireAuth, requireOwner, loadUser } from './src/middleware/auth.js';

import authRouter         from './src/routes/auth.js';
import customersRouter    from './src/routes/customers.js';
import purchasesRouter    from './src/routes/purchases.js';
import rewardsRouter      from './src/routes/rewards.js';
import dashboardRouter    from './src/routes/dashboard.js';
import offersRouter       from './src/routes/offers.js';
import transactionsRouter from './src/routes/transactions.js';
import syncRouter         from './src/routes/sync.js';

import { runFullSync, isEnabled } from './src/services/firebase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app    = express();
const PORT   = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === 'production';

// ── Database ──────────────────────────────────────────────────────────────────
initSchema();

// ── Session secret ────────────────────────────────────────────────────────────
const SESSION_SECRET = process.env.RF_SESSION_SECRET || crypto.randomBytes(48).toString('hex');
if (!process.env.RF_SESSION_SECRET)
  console.warn('[Auth] RF_SESSION_SECRET not set — sessions will not survive restarts.');

// ── Core middleware ───────────────────────────────────────────────────────────
app.set('trust proxy', 1);

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5000'],
  credentials: true,
}));

app.use(express.json());

app.use(session({
  name:   'rf_sid',
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure:   isProd,
    maxAge:   8 * 60 * 60 * 1000,  // 8 hours
  },
}));

// ── Rate limit on login ───────────────────────────────────────────────────────
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true, legacyHeaders: false,
}));

// ── Load user on every /api request ──────────────────────────────────────────
app.use('/api', loadUser(getDb()));

// ── Public routes ─────────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    firestore: isEnabled() ? 'connected' : 'disabled',
    auth: req.session?.userId ? `logged in as ${req.session.role}` : 'not authenticated',
  });
});

// ── Protected routes ──────────────────────────────────────────────────────────
app.use('/api/customers',    requireAuth, customersRouter);
app.use('/api/purchases',    requireAuth, purchasesRouter);
app.use('/api/rewards',      requireAuth, rewardsRouter);
app.use('/api/dashboard',    requireAuth, dashboardRouter);
app.use('/api/offers',       requireAuth, offersRouter);
app.use('/api/transactions', requireAuth, transactionsRouter);
app.use('/api/sync',         requireAuth, requireOwner, syncRouter);

// ── Frontend (production build) ───────────────────────────────────────────────
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get('*', (req, res) => {
  const indexPath = path.join(frontendDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) res.status(200).json({ message: 'RewardFlow API running.' });
  });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`
╔══════════════════════════════════════════════╗
║  RewardFlow  —  http://localhost:${PORT}          ║
║  Auth: Sessions (HttpOnly cookie)            ║
║  Firestore: ${isEnabled() ? 'ENABLED ✓              ' : 'disabled              '}║
╚══════════════════════════════════════════════╝`);

  if (isEnabled()) {
    setTimeout(async () => {
      try { await runFullSync(getDb()); }
      catch (e) { console.warn('[Firebase] Sync error:', e.message); }
    }, 3000);
  }
});
