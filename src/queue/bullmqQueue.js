const { Queue, Worker } = require('bullmq');
const config = require('../config');

const connection = { url: config.redisUrl };
const queues = {};
const workers = {};

function getQueue(jobName) {
  if (!queues[jobName]) {
    queues[jobName] = new Queue(jobName, { connection });
  }
  return queues[jobName];
}

function process_(jobName, handler) {
  if (workers[jobName]) return; // one worker per job name is enough here
  workers[jobName] = new Worker(
    jobName,
    async (job) => handler(job.data),
    { connection }
  );
  workers[jobName].on('failed', (job, err) => {
    console.error(`[queue:bullmq] ${jobName} 工作失敗（job ${job && job.id}）：`, err.message);
  });
}

async function enqueue(jobName, data, opts = {}) {
  const queue = getQueue(jobName);
  const job = await queue.add(jobName, data, { delay: opts.delayMs || 0, removeOnComplete: 100, removeOnFail: 100 });
  return { jobName, id: job.id, delayMs: opts.delayMs || 0 };
}

module.exports = { kind: 'bullmq', enqueue, process: process_ };
