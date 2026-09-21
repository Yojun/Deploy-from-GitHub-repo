const config = require('../config');

async function send({ contact, body }) {
  const configured = Boolean(config.line.accessToken && contact.line_user_id);
  if (!configured) {
    console.log(`[line:simulate] 推播給 ${contact.line_user_id || '(no LINE id)'}：${body}`);
    return { status: 'simulated', detail: `模擬 LINE 推播給 ${contact.line_user_id || '(未提供 LINE 使用者 ID)'}` };
  }

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.line.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to: contact.line_user_id, messages: [{ type: 'text', text: body }] })
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || `LINE API 回應 ${res.status}`);
    }
    return { status: 'sent', detail: 'pushed' };
  } catch (err) {
    console.warn('[line] 真實推播失敗，記錄為 failed：', err.message);
    return { status: 'failed', detail: err.message };
  }
}

module.exports = { send };
