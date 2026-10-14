/**
 * Global error handler middleware for Express.
 */
export function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // SQLite unique constraint violation
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.message && err.message.includes('UNIQUE constraint'))) {
    return res.status(409).json({ error: 'A record with this identifier already exists.' });
  }

  // Custom business logic errors
  if (err.code === 'BELOW_MINIMUM') {
    return res.status(422).json({ error: err.message, code: err.code, details: err.details });
  }
  if (err.code === 'INSUFFICIENT_BALANCE') {
    return res.status(422).json({ error: err.message, code: err.code, details: err.details });
  }
  if (err.code === 'DISCOUNT_EXCEEDS_TOTAL') {
    return res.status(422).json({ error: err.message, code: err.code });
  }
  if (err.code === 'DUPLICATE_PURCHASE') {
    return res.status(409).json({ error: err.message, code: err.code });
  }
  if (err.code === 'INVALID_AMOUNT') {
    return res.status(400).json({ error: err.message, code: err.code });
  }
  if (err.code === 'NOT_FOUND') {
    return res.status(404).json({ error: err.message });
  }

  // Default server error
  res.status(500).json({ error: err.message || 'An unexpected error occurred.' });
}
