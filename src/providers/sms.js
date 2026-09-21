const config = require('../config');

async function send({ contact, body }) {
  const configured = Boolean(config.twilio.accountSid && config.twilio.authToken && contact.phone);
  if (!configured) {
    console.log(`[sms:simulate] 發送給 ${contact.phone || '(no phone)'}：${body}`);
    return { status: 'simulated', detail: `模擬發送簡訊給 ${contact.phone || '(未提供電話)'}` };
  }

  try {
    // Plain REST call so we don't need the Twilio SDK as a dependency —
    // this is the exact same API their SDK wraps.
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.twilio.accountSid}/Messages.json`;
    const authHeader = 'Basic ' + Buffer.from(`${config.twilio.accountSid}:${config.twilio.authToken}`).toString('base64');
    const params = new URLSearchParams({ To: contact.phone, From: config.twilio.fromNumber, Body: body });

    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `Twilio 回應 ${res.status}`);
    return { status: 'sent', detail: `sid=${data.sid}` };
  } catch (err) {
    console.warn('[sms] 真實發送失敗，記錄為 failed：', err.message);
    return { status: 'failed', detail: err.message };
  }
}

module.exports = { send };
