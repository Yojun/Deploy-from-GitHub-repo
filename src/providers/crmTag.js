const config = require('../config');

async function send({ contact }) {
  const configured = Boolean(config.crm.apiBase && config.crm.apiToken && contact.id);
  if (!configured) {
    console.log(`[crm-tag:simulate] 幫 ${contact.id || '(no contact id)'} 加標籤並通知業務`);
    return { status: 'simulated', detail: `模擬幫聯絡人 ${contact.id || '(未知)'} 加標籤` };
  }

  try {
    const res = await fetch(`${config.crm.apiBase}/contacts/${encodeURIComponent(contact.id)}/tags`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.crm.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tag: 'hot-lead-from-automation' })
    });
    if (!res.ok) throw new Error(`CRM API 回應 ${res.status}`);
    return { status: 'sent', detail: 'tag applied' };
  } catch (err) {
    console.warn('[crm-tag] 真實呼叫失敗，記錄為 failed：', err.message);
    return { status: 'failed', detail: err.message };
  }
}

module.exports = { send };
