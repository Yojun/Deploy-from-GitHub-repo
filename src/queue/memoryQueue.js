// Zero-config default queue. Same enqueue()/process() shape as
// bullmqQueue.js so src/queue/index.js can hand back either one.
// Delays are real setTimeout calls, so this only lives as long as the
// Node process — fine for demos and small deployments, not for anything
// that needs jobs to survive a restart (use REDIS_URL for that).
const handlers = {};

function process_(jobName, handler) {
  handlers[jobName] = handler;
}

function enqueue(jobName, data, opts = {}) {
  const delayMs = opts.delayMs || 0;
  setTimeout(async () => {
    const handler = handlers[jobName];
    if (!handler) {
      console.warn(`[queue:memory] 沒有註冊 ${jobName} 的處理函式`);
      return;
    }
    try {
      await handler(data);
    } catch (err) {
      console.error(`[queue:memory] 執行 ${jobName} 失敗：`, err);
    }
  }, delayMs);
  return Promise.resolve({ jobName, delayMs });
}

module.exports = { kind: 'memory', enqueue, process: process_ };
