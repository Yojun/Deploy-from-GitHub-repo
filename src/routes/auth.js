const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config');

const router = express.Router();
const EXPIRES_IN = '1h';

router.post('/auth/token', (req, res) => {
  const { client_id, client_secret } = req.body || {};

  if (!config.adminClientId || !config.adminClientSecret || !config.jwtSecret) {
    return res.status(500).json({ error: { code: 'server_misconfigured', message: 'ADMIN_CLIENT_ID / ADMIN_CLIENT_SECRET / JWT_SECRET 尚未設定' } });
  }
  if (client_id !== config.adminClientId || client_secret !== config.adminClientSecret) {
    return res.status(401).json({ error: { code: 'invalid_credentials', message: 'client_id 或 client_secret 錯誤' } });
  }

  const token = jwt.sign({ sub: client_id, scope: 'admin' }, config.jwtSecret, { expiresIn: EXPIRES_IN });
  res.json({ access_token: token, token_type: 'Bearer', expires_in: 3600 });
});

module.exports = router;
