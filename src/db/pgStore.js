const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({ connectionString: config.databaseUrl });

function dedupeKey(evt) {
  return [evt.event, evt.contact && evt.contact.id, evt.occurred_at].join('::');
}

// ---- events ----
async function appendEvent(evt) {
  await pool.query(
    `INSERT INTO events (event, occurred_at, dedupe_key, contact, properties)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (dedupe_key) DO NOTHING`,
    [evt.event, evt.occurred_at, dedupeKey(evt), evt.contact || {}, evt.properties || {}]
  );
  return evt;
}

async function eventExists(evt) {
  const res = await pool.query('SELECT 1 FROM events WHERE dedupe_key = $1', [dedupeKey(evt)]);
  return res.rowCount > 0;
}

async function eventsInRangeDays(days) {
  const res = await pool.query(
    `SELECT event, occurred_at, contact, properties
     FROM events
     WHERE occurred_at >= now() - ($1 || ' days')::interval`,
    [days]
  );
  return res.rows.map((r) => ({
    event: r.event,
    occurred_at: r.occurred_at.toISOString(),
    contact: r.contact,
    properties: r.properties
  }));
}

// ---- flows ----
async function createFlow({ trigger, steps }) {
  const res = await pool.query(
    `INSERT INTO flows (trigger, steps, active) VALUES ($1, $2, true) RETURNING *`,
    [trigger, JSON.stringify(steps)]
  );
  return rowToFlow(res.rows[0]);
}

async function listFlows({ activeOnly } = {}) {
  const res = activeOnly
    ? await pool.query('SELECT * FROM flows WHERE active = true ORDER BY id DESC')
    : await pool.query('SELECT * FROM flows ORDER BY id DESC');
  return res.rows.map(rowToFlow);
}

async function getFlow(id) {
  const res = await pool.query('SELECT * FROM flows WHERE id = $1', [id]);
  return res.rows[0] ? rowToFlow(res.rows[0]) : null;
}

async function deactivateFlow(id) {
  const res = await pool.query('UPDATE flows SET active = false WHERE id = $1 RETURNING *', [id]);
  return res.rows[0] ? rowToFlow(res.rows[0]) : null;
}

async function activeFlowsForTrigger(trigger) {
  const res = await pool.query('SELECT * FROM flows WHERE trigger = $1 AND active = true', [trigger]);
  return res.rows.map(rowToFlow);
}

function rowToFlow(row) {
  return {
    id: row.id,
    trigger: row.trigger,
    steps: row.steps,
    active: row.active,
    created_at: row.created_at.toISOString()
  };
}

// ---- messages ----
async function recordMessage(msg) {
  const res = await pool.query(
    `INSERT INTO messages (flow_id, trigger, action, contact, status, detail)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [msg.flow_id || null, msg.trigger, msg.action, msg.contact || {}, msg.status, msg.detail || null]
  );
  return rowToMessage(res.rows[0]);
}

async function listMessages({ flowId, limit } = {}) {
  const lim = Math.min(limit || 100, 500);
  const res = flowId
    ? await pool.query('SELECT * FROM messages WHERE flow_id = $1 ORDER BY sent_at DESC LIMIT $2', [flowId, lim])
    : await pool.query('SELECT * FROM messages ORDER BY sent_at DESC LIMIT $1', [lim]);
  return res.rows.map(rowToMessage);
}

function rowToMessage(row) {
  return {
    id: row.id,
    flow_id: row.flow_id,
    trigger: row.trigger,
    action: row.action,
    contact: row.contact,
    status: row.status,
    detail: row.detail,
    sent_at: row.sent_at.toISOString()
  };
}

module.exports = {
  kind: 'postgres',
  pool,
  appendEvent,
  eventExists,
  eventsInRangeDays,
  createFlow,
  listFlows,
  getFlow,
  deactivateFlow,
  activeFlowsForTrigger,
  recordMessage,
  listMessages
};
