// Run with: npm run migrate
// Only does anything if DATABASE_URL is set — otherwise the app uses the
// JSON file store and there's nothing to migrate.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log('DATABASE_URL 未設定，略過（目前會用 store/*.json 檔案儲存）');
    return;
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const sql = fs.readFileSync(path.join(__dirname, '..', 'src', 'db', 'schema.sql'), 'utf-8');
  await pool.query(sql);
  await pool.end();
  console.log('已套用 schema.sql 到', process.env.DATABASE_URL.replace(/:[^:@]*@/, ':***@'));
}

main().catch((err) => {
  console.error('migrate 失敗：', err);
  process.exit(1);
});
