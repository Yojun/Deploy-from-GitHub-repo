const config = require('../config');

const queue = config.redisUrl ? require('./bullmqQueue') : require('./memoryQueue');

if (queue.kind === 'memory') {
  console.log('[queue] REDIS_URL 未設定，使用行程內記憶體佇列（重啟就會遺失還沒執行的工作）');
} else {
  console.log('[queue] 使用 BullMQ + Redis（REDIS_URL 已設定）');
}

module.exports = queue;
