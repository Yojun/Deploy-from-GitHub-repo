const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const db = require('../db');
const { triggerMeta, actionMeta } = require('../data/automation');

const router = express.Router();

router.post('/automation/flows', requireAdmin, async (req, res) => {
  const { trigger, steps } = req.body || {};
  if (!trigger || !triggerMeta[trigger]) {
    return res.status(400).json({ error: { code: 'invalid_trigger', message: '未知或缺少的 trigger' } });
  }
  if (!Array.isArray(steps) || steps.length === 0 || steps.some((s) => !actionMeta[s])) {
    return res.status(400).json({ error: { code: 'invalid_steps', message: 'steps 必須是至少一個已知動作代碼的陣列' } });
  }
  const flow = await db.createFlow({ trigger, steps });
  res.status(201).json(flow);
});

router.get('/automation/flows', requireAdmin, async (req, res) => {
  const activeOnly = req.query.active === 'true';
  const flows = await db.listFlows({ activeOnly });
  res.json({ flows });
});

router.delete('/automation/flows/:id', requireAdmin, async (req, res) => {
  const flow = await db.deactivateFlow(req.params.id);
  if (!flow) return res.status(404).json({ error: { code: 'not_found', message: '找不到這個流程' } });
  res.json(flow);
});

module.exports = router;
