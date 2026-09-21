// Zero-config default store. Same exported function names/shapes as
// pgStore.js, so src/db/index.js can hand back either one and nothing
// else in the codebase needs to know which is active.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', '..', 'store');
const FILES = {
  events: path.join(DIR, 'events.json'),
  flows: path.join(DIR, 'flows.json'),
  messages: path.join(DIR, 'messages.json')
};

function ensureFile(file) {
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, '[]', 'utf-8');
  }
}

function load(file) {
  ensureFile(file);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (err) {
    return [];
  }
}

function save(file, data) {
  ensureFile(file);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8');
}

function nextId(list) {
  return list.reduce((max, item) => Math.max(max, item.id || 0), 0) + 1;
}

function dedupeKey(evt) {
  return [evt.event, evt.contact && evt.contact.id, evt.occurred_at].join('::');
}

// ---- events ----
async function appendEvent(evt) {
  const events = load(FILES.events);
  events.push({ id: nextId(events), ...evt });
  save(FILES.events, events);
  return evt;
}

async function eventExists(evt) {
  const events = load(FILES.events);
  const key = dedupeKey(evt);
  return events.some((e) => dedupeKey(e) === key);
}

async function eventsInRangeDays(days) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return load(FILES.events).filter((e) => {
    const t = Date.parse(e.occurred_at);
    return !Number.isNaN(t) && t >= cutoff;
  });
}

// ---- flows ----
async function createFlow({ trigger, steps }) {
  const flows = load(FILES.flows);
  const flow = { id: nextId(flows), trigger, steps, active: true, created_at: new Date().toISOString() };
  flows.push(flow);
  save(FILES.flows, flows);
  return flow;
}

async function listFlows({ activeOnly } = {}) {
  const flows = load(FILES.flows);
  return activeOnly ? flows.filter((f) => f.active) : flows;
}

async function getFlow(id) {
  const flows = load(FILES.flows);
  return flows.find((f) => f.id === Number(id)) || null;
}

async function deactivateFlow(id) {
  const flows = load(FILES.flows);
  const flow = flows.find((f) => f.id === Number(id));
  if (!flow) return null;
  flow.active = false;
  save(FILES.flows, flows);
  return flow;
}

async function activeFlowsForTrigger(trigger) {
  const flows = load(FILES.flows);
  return flows.filter((f) => f.trigger === trigger && f.active);
}

// ---- messages ----
async function recordMessage(msg) {
  const messages = load(FILES.messages);
  const record = { id: nextId(messages), sent_at: new Date().toISOString(), ...msg };
  messages.push(record);
  save(FILES.messages, messages);
  return record;
}

async function listMessages({ flowId, limit } = {}) {
  let messages = load(FILES.messages);
  if (flowId) messages = messages.filter((m) => m.flow_id === Number(flowId));
  messages = messages.slice().reverse();
  return limit ? messages.slice(0, limit) : messages;
}

module.exports = {
  kind: 'json',
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
