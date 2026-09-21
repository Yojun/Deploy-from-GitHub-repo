const crypto = require('crypto');

// Expects a header like "sha256=<hex digest>", matching the common
// convention used by HubSpot, Stripe-style webhooks, etc. Adjust the
// header name / format to whatever your specific CRM actually sends.
function verifySignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const provided = signatureHeader.startsWith('sha256=') ? signatureHeader.slice(7) : signatureHeader;

  const expectedBuf = Buffer.from(expected, 'hex');
  const providedBuf = Buffer.from(provided, 'hex');
  if (expectedBuf.length !== providedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

module.exports = { verifySignature };
