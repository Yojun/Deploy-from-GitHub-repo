// Populates store/events.json with synthetic CRM events spread over the
// last 90 days, so /api/analytics and /api/automation/estimate have
// something real to compute from immediately after `npm install`.
// Safe to re-run — it overwrites the store each time.
const fs = require('fs');
const path = require('path');

const channels = ['seo', 'paid', 'automation', 'social', 'direct'];
const eventTypes = [
  { event: 'form.submitted', weight: 5 },
  { event: 'cart.abandoned', weight: 3 },
  { event: 'contact.birthday', weight: 1 },
  { event: 'catalog.downloaded', weight: 3 },
  { event: 'deal.won', weight: 2 }
];

function pick(list) {
  const total = list.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const item of list) {
    r -= item.weight;
    if (r <= 0) return item.event;
  }
  return list[0].event;
}

function randomPastDate(withinDays) {
  const ms = Math.random() * withinDays * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - ms).toISOString();
}

const events = [];
const COUNT = 320;

for (let i = 0; i < COUNT; i++) {
  const event = pick(eventTypes);
  const occurred_at = randomPastDate(90);
  const contact = { id: 'c_seed_' + i, email: `seed${i}@example.com` };

  const properties = {};
  if (event === 'deal.won') {
    properties.channel = channels[Math.floor(Math.random() * channels.length)];
    properties.amount = Math.round(400 + Math.random() * 3000);
    properties.deal_id = 'd_seed_' + i;
  }

  events.push({ event, occurred_at, contact, properties });
}

events.sort((a, b) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at));

const storePath = path.join(__dirname, '..', 'store', 'events.json');
fs.mkdirSync(path.dirname(storePath), { recursive: true });
fs.writeFileSync(storePath, JSON.stringify(events, null, 2), 'utf-8');

console.log(`已寫入 ${events.length} 筆模擬事件到 ${storePath}`);
