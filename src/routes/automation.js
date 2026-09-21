const express = require('express');
const requirePublicKey = require('../middleware/requirePublicKey');
const { triggerMeta, actionMeta } = require('../data/automation');
const engine = require('../services/automationEngine');

const router = express.Router();

router.post('/automation/estimate', requirePublicKey, async (req, res) => {
  const { trigger, steps } = req.body || {};

  if (!trigger || !triggerMeta[trigger]) {
    return res.status(400).json({ error: { code: 'invalid_trigger', message: '未知或缺少的 trigger' } });
  }
  if (!Array.isArray(steps) || steps.some((s) => !actionMeta[s])) {
    return res.status(400).json({ error: { code: 'invalid_steps', message: 'steps 必須是已知的動作代碼陣列' } });
  }

  try {
    const result = await engine.estimate(trigger, steps);
    res.json(result);
  } catch (err) {
    const status = err.status || 500;
    res.status(status).json({ error: { code: 'estimate_failed', message: err.message } });
  }
});

module.exports = router;
