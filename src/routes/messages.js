const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const db = require('../db');

const router = express.Router();

router.get('/automation/messages', requireAdmin, async (req, res) => {
  const flowId = req.query.flow_id;
  const limit = parseInt(req.query.limit, 10) || 50;
  const messages = await db.listMessages({ flowId, limit });
  res.json({ messages });
});

module.exports = router;
