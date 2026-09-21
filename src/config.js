require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3001,

  // storage / queue — leaving these empty keeps everything running on the
  // zero-config JSON file store + in-process queue
  databaseUrl: process.env.DATABASE_URL || '',
  redisUrl: process.env.REDIS_URL || '',

  // CRM webhook signature
  crmWebhookSecret: process.env.CRM_WEBHOOK_SECRET || '',

  // public, embed-safe key for the browser-facing endpoints
  // (GET /api/analytics, POST /api/automation/estimate) — low privilege,
  // rate-limited, fine to ship inside axisgrowth.html
  publicApiKey: process.env.PUBLIC_API_KEY || '',

  // admin credentials for POST /api/auth/token — NOT for the browser.
  // Used from your own scripts/tools/internal dashboard to manage flows.
  adminClientId: process.env.ADMIN_CLIENT_ID || '',
  adminClientSecret: process.env.ADMIN_CLIENT_SECRET || '',
  jwtSecret: process.env.JWT_SECRET || '',

  // dev-only: shrink wait1/wait3 automation delays to seconds so you can
  // watch a flow run end-to-end without waiting literal days. Leave unset
  // in production.
  fastDelays: process.env.FAST_DELAYS === 'true',

  ga4PropertyId: process.env.GA4_PROPERTY_ID || '',
  googleCredentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',

  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'noreply@example.com'
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_FROM_NUMBER || ''
  },
  line: {
    accessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || ''
  },
  crm: {
    apiBase: process.env.CRM_API_BASE || '',
    apiToken: process.env.CRM_API_TOKEN || ''
  }
};

