const config = require('../config');

let transporter = null;
function getTransporter() {
  if (transporter) return transporter;
  const nodemailer = require('nodemailer');
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined
  });
  return transporter;
}

async function send({ contact, subject, body }) {
  const configured = Boolean(config.smtp.host && contact.email);
  if (!configured) {
    console.log(`[email:simulate] 寄給 ${contact.email || '(no email)'}：${subject}`);
    return { status: 'simulated', detail: `模擬寄信給 ${contact.email || '(未提供 email)'}` };
  }

  try {
    const t = getTransporter();
    const info = await t.sendMail({
      from: config.smtp.from,
      to: contact.email,
      subject,
      text: body
    });
    return { status: 'sent', detail: `messageId=${info.messageId}` };
  } catch (err) {
    console.warn('[email] 真實寄信失敗，記錄為 failed：', err.message);
    return { status: 'failed', detail: err.message };
  }
}

module.exports = { send };
