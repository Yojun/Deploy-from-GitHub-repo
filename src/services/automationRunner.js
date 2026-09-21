const config = require('../config');
const db = require('../db');
const queue = require('../queue');
const { actionMeta } = require('../data/automation');

const emailProvider = require('../providers/email');
const smsProvider = require('../providers/sms');
const lineProvider = require('../providers/line');
const crmTagProvider = require('../providers/crmTag');

const providers = { email: emailProvider, sms: smsProvider, line: lineProvider, tag: crmTagProvider };

const REAL_DELAY_MS = { wait1: 24 * 60 * 60 * 1000, wait3: 72 * 60 * 60 * 1000 };
const FAST_DELAY_MS = { wait1: 2000, wait3: 4000 }; // FAST_DELAYS=true, for local testing only

function delayFor(stepKey) {
  const table = config.fastDelays ? FAST_DELAY_MS : REAL_DELAY_MS;
  return table[stepKey] || 0;
}

// Flatten ['email','wait1','sms'] into [{action:'email', delayMs:0}, {action:'sms', delayMs:86400000}]
// so each send is scheduled independently — no chained lookups needed later.
function buildPlan(steps) {
  let cumulative = 0;
  const plan = [];
  steps.forEach((key) => {
    const meta = actionMeta[key];
    if (!meta) return;
    if (meta.isDelay) {
      cumulative += delayFor(key);
    } else {
      plan.push({ action: key, delayMs: cumulative });
    }
  });
  return plan;
}

function messageFor(action, event) {
  const contactLabel = event.contact && (event.contact.email || event.contact.id) || '訪客';
  const subjectByAction = {
    email: `AxisGrowth：關於你剛才的 ${event.event}`,
    sms: `AxisGrowth 提醒：${event.event}`,
    line: `AxisGrowth 通知：${event.event}`,
    tag: null
  };
  return {
    subject: subjectByAction[action],
    body: `Hi ${contactLabel}，這是依據「${event.event}」觸發的自動化訊息（示範內容，正式上線請換成真正的文案）。`
  };
}

// Called from the CRM webhook route once an event has been stored, for
// every active flow whose trigger matches that event type.
async function startFlow(flow, event) {
  const plan = buildPlan(flow.steps);
  for (const step of plan) {
    await queue.enqueue(
      'automation.send',
      { flowId: flow.id, trigger: flow.trigger, action: step.action, event },
      { delayMs: step.delayMs }
    );
  }
}

// Registered once at server startup; this is what actually calls the
// provider and writes the result to the messages log.
function registerWorker() {
  queue.process('automation.send', async ({ flowId, trigger, action, event }) => {
    const provider = providers[action];
    if (!provider) {
      console.warn(`[automation] 未知的 action：${action}`);
      return;
    }
    const { subject, body } = messageFor(action, event);
    const result = await provider.send({ contact: event.contact || {}, subject, body });

    await db.recordMessage({
      flow_id: flowId,
      trigger,
      action,
      contact: event.contact || {},
      status: result.status,
      detail: result.detail
    });

    console.log(`[automation] flow #${flowId} → ${action} → ${result.status}（${result.detail}）`);
  });
}

module.exports = { buildPlan, startFlow, registerWorker };
