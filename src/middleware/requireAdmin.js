const jwt = require('jsonwebtoken');
const config = require('../config');

// For managing automation flows and reading the send log — this should
// never be called from the public page. Get a token via
// POST /api/auth/token using ADMIN_CLIENT_ID / ADMIN_CLIENT_SECRET
// (server-side credentials, e.g. from a script or an internal tool).
function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ error: { code: 'unauthorized', message: '缺少 Bearer Token，請先呼叫 POST /api/auth/token' } });
  }
  try {
    req.admin = jwt.verify(token, config.jwtSecret);
    next();
  } catch (err) {
    return res.status(401).json({ error: { code: 'invalid_token', message: 'Token 無效或已過期，請重新呼叫 POST /api/auth/token' } });
  }
}

module.exports = requireAdmin;
