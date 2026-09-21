const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const config = require('./config');

const webhooksRouter = require('./routes/webhooks');
const analyticsRouter = require('./routes/analytics');
const automationRouter = require('./routes/automation');
const flowsRouter = require('./routes/flows');
const messagesRouter = require('./routes/messages');
const authRouter = require('./routes/auth');
const automationRunner = require('./services/automationRunner');

const app = express();
app.use(cors());

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Public, embed-safe endpoints — rate limited since the key that guards
// them ships inside axisgrowth.html and is visible to anyone.
const publicLimiter = rateLimit({ windowMs: 5 * 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false });

// The CRM webhook needs the raw request bytes to verify the HMAC
// signature, so only that exact path gets the raw parser — everything
// else falls through to the normal express.json() below.
app.use('/api/webhooks/crm', express.raw({ type: '*/*' }));
app.use('/api', webhooksRouter);

app.use(express.json());
app.use('/api', authRouter);
app.use('/api', publicLimiter, analyticsRouter);
app.use('/api', publicLimiter, automationRouter);
app.use('/api', flowsRouter);
app.use('/api', messagesRouter);

app.use((req, res) => {
  res.status(404).json({ error: { code: 'not_found', message: '找不到這個路徑' } });
});

// Start listening for automation.send jobs (from CRM events matching an
// active flow's trigger) — this is what actually calls the Email/SMS/LINE
// providers and logs the result.
automationRunner.registerWorker();

app.listen(config.port, () => {
  console.log(`AxisGrowth MarTech backend listening on http://localhost:${config.port}`);
  if (!config.publicApiKey) {
    console.warn('[warn] PUBLIC_API_KEY 尚未設定，/api/analytics 與 /api/automation/estimate 會全部回 401');
  }
  if (!config.adminClientId || !config.adminClientSecret || !config.jwtSecret) {
    console.warn('[warn] ADMIN_CLIENT_ID / ADMIN_CLIENT_SECRET / JWT_SECRET 未完整設定，/api/auth/token 會回 500');
  }
  if (!config.crmWebhookSecret) {
    console.warn('[warn] CRM_WEBHOOK_SECRET 尚未設定，/api/webhooks/crm 會全部回 401');
  }
});
