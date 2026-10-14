export function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHENTICATED' });
  }
  next();
}

export function requireOwner(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required.', code: 'UNAUTHENTICATED' });
  }
  if (req.session.role !== 'owner') {
    return res.status(403).json({ error: 'Owner access required.', code: 'FORBIDDEN' });
  }
  next();
}

export function loadUser(db) {
  return (req, res, next) => {
    if (!req.session?.userId) return next();
    const user = db.prepare(
      'SELECT id, email, name, role, is_active FROM users WHERE id = ?'
    ).get(req.session.userId);
    if (!user || !user.is_active) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Account deactivated.', code: 'DEACTIVATED' });
    }
    req.user = user;
    next();
  };
}
