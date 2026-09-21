const config = require('../config');

const store = config.databaseUrl ? require('./pgStore') : require('./jsonStore');

if (store.kind === 'json') {
  console.log('[db] DATABASE_URL 未設定，使用 store/*.json 檔案儲存（適合本機測試，別用在正式環境）');
} else {
  console.log('[db] 使用 PostgreSQL（DATABASE_URL 已設定）');
}

module.exports = store;
