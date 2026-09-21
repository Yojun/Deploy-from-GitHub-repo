# AxisGrowth MarTech Backend

`axisgrowth.html` 前端的真後端。這個版本補齊了上一版列出的四個缺口，而且**都在容器裡實際跑過、驗證過**，不是只有寫程式碼：

| 缺口 | 現在的狀態 |
|---|---|
| 真資料庫 | PostgreSQL 已接上（`DATABASE_URL` 設定就啟用），零設定時退回 JSON 檔案，兩邊介面一致 |
| 佇列 | BullMQ + Redis 已接上（`REDIS_URL` 設定就啟用），零設定時退回行程內記憶體佇列 |
| 真登入 / Token 簽發 | `POST /api/auth/token`，用 client_id/secret 換一張 1 小時效期的 JWT，管理端點都要帶這張票 |
| 自動化真的會執行 | CRM 事件進來、比對到啟用中的流程，會真的排程執行每一步（Email/簡訊/LINE/CRM 標籤），不是只有算預估 |

## 已經測試過的東西

在這個 repo 打包前，我實際做過兩輪端對端測試：

**第一輪（零設定：JSON 檔案 + 記憶體佇列）**
建立自動化流程 → 送出符合條件的 CRM webhook 事件 → 等待（`FAST_DELAYS=true` 把等待步驟從 1 天縮短成 2 秒方便測試）→ 查詢發送紀錄，確認 Email／簡訊／標籤三個步驟都依序真的執行了，狀態都記錄下來。

**第二輪（真實設施：PostgreSQL + Redis/BullMQ）**
本機裝了 PostgreSQL 16 跟 Redis 7，跑 `npm run migrate` 建表，把 `.env` 指過去。重複上面的流程，並且**直接用 `psql` 查資料庫**確認流程真的寫進 `flows` 表、發送紀錄真的寫進 `messages` 表；用 `redis-cli keys` 確認 BullMQ 真的把工作排進 Redis。兩條路徑都是真的在動，不是寫好放著沒測。

沒測到的部分老實講：Email/簡訊/LINE/CRM 標籤這四個 provider，在沒有填真實憑證時都會走「模擬」分支（記錄到資料庫、印到 console，但不會真的發出去）——因為這個環境沒有對外網路可以打 SendGrid/Twilio/LINE 的 API，也不會幫你申請這些服務的帳號。程式碼是照官方 API 規格寫的，你填上真的憑證應該就能動，但我沒辦法在這裡替你證實這一步，接上之後你自己測一次真實發送會比較踏實。

## 快速開始（零設定路徑）

```bash
npm install
cp .env.example .env
# 打開 .env，至少把這三個改掉：
#   PUBLIC_API_KEY（前端要用的）
#   ADMIN_CLIENT_ID / ADMIN_CLIENT_SECRET / JWT_SECRET（管理端要用的）
#   CRM_WEBHOOK_SECRET（你的 CRM 那邊也要設一樣的）
npm run seed      # 灌一些示範用的歷史事件，讓 API 一開始就有數據
npm start          # http://localhost:3001
```

`DATABASE_URL` 和 `REDIS_URL` 留空，就是這個路徑：JSON 檔案 + 記憶體佇列，開發、demo、小流量都夠用。

## 接上真資料庫 / 真佇列

```bash
# .env 加上：
# DATABASE_URL=postgres://user:pass@host:5432/dbname
# REDIS_URL=redis://host:6379

npm run migrate    # 建表（只在 DATABASE_URL 有設定時才會做事）
npm start
```

啟動時 console 會印出目前用的是哪一種（`[db] 使用 PostgreSQL` 或 `[db] 使用 store/*.json 檔案儲存`），一眼就能確認設定生效了沒有。

## 認證：兩種金鑰，權限不一樣

- **`PUBLIC_API_KEY`**：保護 `GET /api/analytics` 跟 `POST /api/automation/estimate`。這兩支是唯讀／無副作用的端點，設計成可以直接寫進 `axisgrowth.html` 裡（前端原始碼本來就是公開的，所以這把鑰匙也被當作公開的，靠 rate limit 擋濫用，不是靠保密）。
- **管理端 JWT**：保護建立/查詢/刪除自動化流程、查發送紀錄。**不要放進前端**。用 `POST /api/auth/token` 拿：

  ```bash
  curl -X POST http://localhost:3001/api/auth/token \
    -H "Content-Type: application/json" \
    -d '{"client_id":"你的 ADMIN_CLIENT_ID","client_secret":"你的 ADMIN_CLIENT_SECRET"}'
  # → {"access_token":"...", "token_type":"Bearer", "expires_in":3600}
  ```

  拿到的 `access_token` 放進後續請求的 `Authorization: Bearer <token>`，1 小時後過期要重新換。

## 管理自動化流程（真的會執行的那種，不是估算）

```bash
TOKEN=（上面拿到的 access_token）

# 建立一個流程：訪客填表單 → 立刻寄信 → 等 1 天 → 發簡訊 → 加標籤通知業務
curl -X POST http://localhost:3001/api/automation/flows \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"trigger":"form","steps":["email","wait1","sms","tag"]}'

# 列出目前的流程
curl http://localhost:3001/api/automation/flows -H "Authorization: Bearer $TOKEN"

# 停用一個流程
curl -X DELETE http://localhost:3001/api/automation/flows/1 -H "Authorization: Bearer $TOKEN"

# 查發送紀錄
curl "http://localhost:3001/api/automation/messages?flow_id=1" -H "Authorization: Bearer $TOKEN"
```

流程建立好、狀態是 `active` 之後，只要有一筆 CRM webhook 事件的 `event` 對應到這個流程的 `trigger`（對照表在 `src/data/automation.js` 的 `triggerMeta`），就會自動照 `steps` 排程執行——完全不用你手動呼叫任何東西。

想在本機快速看到整個流程跑完，把 `.env` 的 `FAST_DELAYS=true`，`wait1`／`wait3` 會從 1 天／3 天縮短成 2 秒／4 秒。**正式環境一定要拿掉這行**，不然使用者收到的等待步驟時間會整個是錯的。

## 接上真的 Email / 簡訊 / LINE / CRM 回寫

四個 provider 都在 `src/providers/`，邏輯一樣：**環境變數沒填 → 模擬並記錄；填了 → 真的打出去，失敗會記錄成 `failed` 而不是讓整個流程掛掉。**

| Provider | 檔案 | 需要的環境變數 | 說明 |
|---|---|---|---|
| Email | `providers/email.js` | `SMTP_HOST`、`SMTP_PORT`、`SMTP_USER`、`SMTP_PASS`、`EMAIL_FROM` | 用 nodemailer，填標準 SMTP 帳密即可，Gmail 應用程式密碼、SendGrid SMTP、Postmark 都適用 |
| 簡訊 | `providers/sms.js` | `TWILIO_ACCOUNT_SID`、`TWILIO_AUTH_TOKEN`、`TWILIO_FROM_NUMBER` | 直接打 Twilio REST API，沒有另外裝 SDK |
| LINE | `providers/line.js` | `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging API 的 push message，`contact.line_user_id` 要有值才會真的推 |
| CRM 標籤 | `providers/crmTag.js` | `CRM_API_BASE`、`CRM_API_TOKEN` | 打回你的 CRM，幫聯絡人加標籤／通知業務，端點格式要照你的 CRM 調整 |

## 接上真的 GA4 / 真的 CRM Webhook

跟上一版一樣，細節在 `martech-api-spec.md`：GA4 需要服務帳戶金鑰 + `GA4_PROPERTY_ID`；CRM 那邊要把 Webhook 指到 `/api/webhooks/crm`，共享密鑰對應 `CRM_WEBHOOK_SECRET`。

## 接上 `axisgrowth.html`

前端不用改：`API_CONFIG.apiKey` 就是填 `PUBLIC_API_KEY`，`demoMode: false`，`baseUrl` 指到這支服務。前端本來就只呼叫 `GET /api/analytics` 跟 `POST /api/automation/estimate` 這兩支公開端點，不會碰到管理端 JWT，這是刻意設計成這樣——公開頁面不該持有能建立/刪除自動化流程的權限。

## 部署到伺服器

`npm start` 現在會先跑一次 migration 再啟動（`DATABASE_URL` 沒設定時這步是安全的空操作），所以下面兩條路徑都不用額外處理這件事。

### 最簡單：Railway 或 Render（PaaS，推薦）

1. 把這個專案 push 到 GitHub（見前面的說明）
2. 到 [railway.app](https://railway.app)（或 [render.com](https://render.com)）用 GitHub 帳號登入，選 New Project → Deploy from GitHub repo → 選這個 repo，平台會自動認出是 Node.js 專案
3. **加 PostgreSQL**：在專案裡 New → Database → PostgreSQL，平台會自動產生一個 `DATABASE_URL` 並注入環境變數。**這步很重要**：這類平台的本機磁碟是暫時性的，重新部署就會清空，JSON 檔案模式的資料撐不過下一次部署，正式使用一定要接 Postgres
4. **加 Redis**（選用但建議）：同樣方式 New → Database → Redis，平台會產生 `REDIS_URL`。沒加也能動（退回記憶體佇列），只是服務重啟時還沒執行的自動化工作會遺失
5. 到專案的 Variables／Environment 分頁，把 `.env.example` 裡其他的變數都設定好：`PUBLIC_API_KEY`、`ADMIN_CLIENT_ID`、`ADMIN_CLIENT_SECRET`、`JWT_SECRET`、`CRM_WEBHOOK_SECRET`，之後要接真的 Email/簡訊/LINE 再補上對應那組
6. 部署完成後平台會給一個網域（例如 `https://xxx.up.railway.app`），這就是 `axisgrowth.html` 裡 `API_CONFIG.baseUrl` 要填的值
7. 想先塞一點示範資料，用平台的 Shell／Console 功能連進去執行一次 `npm run seed`（這步只影響 JSON 模式；接了 Postgres 的話直接呼叫 `/api/webhooks/crm` 累積真實資料即可，不需要 seed）

Railway／Render 都有免費或很便宜的方案可以先試，兩者操作方式幾乎一樣，選哪個都可以。

### 自己的 VPS（更多控制，但要自己維運）

適合你已經有一台 Linux 主機（DigitalOcean、Linode、自架機器都行）：

```bash
# 在伺服器上
sudo apt update && sudo apt install -y nodejs npm nginx
git clone https://github.com/你的帳號/axisgrowth-martech-backend.git
cd axisgrowth-martech-backend
npm install --omit=dev
cp .env.example .env
nano .env    # 填好所有變數

npm install -g pm2
pm2 start src/server.js --name martech-backend
pm2 startup   # 依照它印出的指令設定開機自動啟動
pm2 save
```

資料庫／佇列一樣建議用真的 Postgres／Redis（`apt install postgresql redis-server`，跟本專案開發時測試用的方式一樣，我在打包這份專案前就是這樣裝起來實際測過），而不是留在 JSON 檔案模式。

服務預設監聽 `PORT`（`.env` 設定，預設 3001），前面建議加一層 nginx 做反向代理＋ TLS：

```nginx
server {
    listen 443 ssl;
    server_name api.你的網域.tw;
    # ssl_certificate ... （用 certbot 申請）
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
    }
}
```

之後要更新版本，伺服器上 `git pull && npm install && pm2 restart martech-backend` 三行就好。



- **不是每個 CRM 的 webhook payload 都長一樣**：`src/routes/webhooks.js` 假設的事件格式是我在 `martech-api-spec.md` 定的通用格式。接你實際用的 CRM 時，這支要改成解析它真正送來的欄位。
- **沒有重試機制**：provider 呼叫失敗就記錄 `failed`，不會自動重試。要做重試的話，BullMQ 本身支援 `attempts` + `backoff` 設定，在 `src/queue/bullmqQueue.js` 的 `queue.add` 那行加參數即可；記憶體佇列版本目前沒有實作重試。
- **沒有管理介面**：目前建立/查詢流程只能用 curl 或你自己接的工具打 API，沒有網頁表單。
- **Rate limit 是整支服務共用同一組設定**：`express-rate-limit` 目前用記憶體存計數，多台機器水平擴展時每台會各自計數，要做到全域限流需要換成 Redis-backed 的 rate limiter（`rate-limit-redis` 這類套件，`REDIS_URL` 都已經有了，接上不難）。

## 專案結構

```
src/
  server.js                # 進入點
  config.js                # 讀環境變數
  middleware/
    requirePublicKey.js    # 保護公開端點
    requireAdmin.js         # 保護管理端點（JWT）
  db/
    index.js                # 依 DATABASE_URL 選 json 或 postgres
    jsonStore.js
    pgStore.js
    schema.sql
  queue/
    index.js                # 依 REDIS_URL 選 memory 或 bullmq
    memoryQueue.js
    bullmqQueue.js
  providers/
    email.js / sms.js / line.js / crmTag.js
  data/
    channels.js
    automation.js            # trigger／action 設定，估算引擎跟真實執行引擎共用
  services/
    ga4.js                   # GA4 真實 API + 模擬 fallback
    crmSignature.js
    automationEngine.js       # POST /api/automation/estimate 用的估算邏輯
    automationRunner.js       # 真正執行流程：排程 → provider → 寫入 messages
  routes/
    auth.js                   # POST /api/auth/token
    analytics.js
    automation.js              # estimate（公開）
    flows.js                   # 流程 CRUD（管理端）
    messages.js                 # 發送紀錄（管理端）
    webhooks.js
scripts/
  seed.js       # 產生示範歷史事件（JSON 模式用）
  migrate.js    # 套用 schema.sql（只在 DATABASE_URL 有設定時動作）
store/          # JSON 模式的資料檔（events / flows / messages）
```
