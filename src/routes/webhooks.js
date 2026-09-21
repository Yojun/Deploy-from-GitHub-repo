const express = require('express');
const config = require('../config');
const db = require('../db');
const { verifySignature } = require('../services/crmSignature');
const { triggerMeta } = require('../data/automation');
const automationRunner = require('../services/automationRunner');

const router = express.Router();

const ALLOWED_EVENTS = new Set(['form.submitted', 'cart.abandoned', 'deal.won', 'contact.birthday', 'catalog.downloaded']);

const eventTypeToTrigger = {};
Object.entries(triggerMeta).forEach(([key, meta]) => {
  eventTypeToTrigger[meta.eventType] = key;
});

// NOTE: this route is mounted in server.js with express.raw(), so
// req.body here is a Buffer, not a parsed object — that's required to
// verify the HMAC signature against the exact bytes the CRM signed.
router.post('/webhooks/crm', async (req, res) => {
  const rawBody = req.body; // Buffer

  const signature = req.header('X-Signature');
  if (!verifySignature(rawBody, signature, config.crmWebhookSecret)) {
    return res.status(401).json({ error: { code: 'invalid_signature', message: '簽章驗證失敗' } });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf-8'));
  } catch (err) {
    return res.status(400).json({ error: { code: 'invalid_json', message: '請求內容不是合法的 JSON' } });
  }

  if (!payload.event || !ALLOWED_EVENTS.has(payload.event)) {
    return res.status(400).json({ error: { code: 'invalid_event', message: `event 必須是以下其中之一：${Array.from(ALLOWED_EVENTS).join(', ')}` } });
  }
  if (!payload.occurred_at || Number.isNaN(Date.parse(payload.occurred_at))) {
    return res.status(400).json({ error: { code: 'invalid_occurred_at', message: 'occurred_at 必須是合法的 ISO 時間字串' } });
  }

  const alreadySeen = await db.eventExists(payload);
  if (alreadySeen) {
    return res.status(200).json({ received: true, deduped: true });
  }

  await db.appendEvent(payload);
  // Respond as soon as the event is durably stored; kick off matching
  // automation flows without making the CRM wait for them to finish.
  res.status(200).json({ received: true });

  const triggerKey = eventTypeToTrigger[payload.event];
  if (triggerKey) {
    try {
      const flows = await db.activeFlowsForTrigger(triggerKey);
      for (const flow of flows) {
        await automationRunner.startFlow(flow, payload);
      }
    } catch (err) {
      console.error('[webhooks] 觸發自動化流程時發生錯誤：', err);
    }
  }
});

module.exports = router;
