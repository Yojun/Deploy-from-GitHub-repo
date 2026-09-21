const db = require('../db');
const { triggerMeta, actionMeta } = require('../data/automation');

const HISTORY_WINDOW_DAYS = 90;
const MIN_SAMPLE_SIZE = 10; // below this we don't trust the real count yet

async function estimate(triggerKey, stepKeys) {
  const trigger = triggerMeta[triggerKey];
  if (!trigger) {
    const err = new Error(`未知的 trigger：${triggerKey}`);
    err.status = 400;
    throw err;
  }

  const recentEvents = await db.eventsInRangeDays(HISTORY_WINDOW_DAYS);
  const realCount = recentEvents.filter((e) => e.event === trigger.eventType).length;

  const usingRealAudience = realCount >= MIN_SAMPLE_SIZE;
  let audience = usingRealAudience ? realCount : trigger.fallbackAudience;

  const steps = [{ label: '觸發對象', value: audience }];
  stepKeys.forEach((key) => {
    const action = actionMeta[key];
    if (!action) {
      const err = new Error(`未知的步驟：${key}`);
      err.status = 400;
      throw err;
    }
    if (!action.isDelay) {
      audience = Math.round(audience * action.rate);
      steps.push({ label: action.label, value: audience });
    }
  });

  const completionRate = steps.length > 1 ? (steps[steps.length - 1].value / steps[0].value) * 100 : 100;

  return {
    trigger: triggerKey,
    steps,
    completion_rate: completionRate,
    // 'blended': real audience count from CRM events, but step rates are
    // still the placeholder defaults in data/automation.js until you wire
    // up real ESP (email/SMS/LINE) reporting.
    source: usingRealAudience ? 'blended' : 'demo'
  };
}

module.exports = { estimate };
