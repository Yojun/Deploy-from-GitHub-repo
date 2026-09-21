const config = require('../config');

// For GET /api/analytics and POST /api/automation/estimate — meant to be
// embedded in axisgrowth.html, so this is a low-privilege, non-secret-ish
// key (like a Stripe "publishable key"), not something that grants write
// access. Pair with rate limiting (see server.js) since anyone who views
// page source can see it.
function requirePublicKey(req, res, next) {
  const header = req.headers.authorization || '';
  const key = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!config.publicApiKey) {
    return res.status(500).json({ error: { code: 'server_misconfigured', message: 'PUBLIC_API_KEY 尚未設定' } });
  }
  if (!key || key !== config.publicApiKey) {
    return res.status(401).json({ error: { code: 'unauthorized', message: '缺少或無效的 Public API Key' } });
  }
  next();
}

module.exports = requirePublicKey;
