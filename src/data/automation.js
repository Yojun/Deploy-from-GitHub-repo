// `eventType` is the CRM webhook `event` value that counts as this trigger
// firing. `fallbackAudience` is used when there isn't enough real event
// history yet (cold start) — same numbers the frontend demo used.
const triggerMeta = {
  form: { label: '訪客填寫表單', eventType: 'form.submitted', fallbackAudience: 1200 },
  cart: { label: '購物車未結帳', eventType: 'cart.abandoned', fallbackAudience: 480 },
  birthday: { label: '會員生日', eventType: 'contact.birthday', fallbackAudience: 260 },
  catalog: { label: '下載型錄 / 白皮書', eventType: 'catalog.downloaded', fallbackAudience: 640 }
};

// Placeholder response rates. Replace with real numbers once you're pulling
// open/click/delivery rates back from your Email/SMS/LINE provider's own
// webhooks or reporting API — this file is the one place to change them.
const actionMeta = {
  email: { label: '發送 Email', rate: 0.42, isDelay: false },
  sms: { label: '發送簡訊', rate: 0.55, isDelay: false },
  line: { label: '發送 LINE 訊息', rate: 0.60, isDelay: false },
  tag: { label: '加上標籤並通知業務', rate: 0.90, isDelay: false },
  wait1: { label: '等待 1 天', rate: 1.00, isDelay: true },
  wait3: { label: '等待 3 天', rate: 1.00, isDelay: true }
};

module.exports = { triggerMeta, actionMeta };
