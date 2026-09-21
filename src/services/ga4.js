const config = require('../config');
const channelMeta = require('../data/channels');

const DAYS = 90;

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic per-run demo dataset, generated once and cached — same idea
// as the mock data the frontend used before it had a backend to call.
let demoCache = null;
function buildDemoDataset() {
  const dataset = {};
  Object.keys(channelMeta).forEach((ch, idx) => {
    const rnd = mulberry32(1000 + idx * 77);
    const meta = channelMeta[ch];
    const sessions = [];
    for (let d = 0; d < DAYS; d++) {
      const noise = (rnd() - 0.5) * meta.base * 0.5;
      sessions.push(Math.max(5, Math.round(meta.base + meta.trend * d + noise)));
    }
    dataset[ch] = sessions;
  });
  return dataset;
}

function demoSessions({ range, channels }) {
  if (!demoCache) demoCache = buildDemoDataset();
  const result = {};
  channels.forEach((ch) => {
    const full = demoCache[ch] || [];
    result[ch] = full.slice(DAYS - range);
  });
  return Promise.resolve({ bySessions: result, source: 'demo' });
}

async function realSessions({ range, channels }) {
  // Lazy require so the project still runs with `npm install` even if you
  // haven't set up googleapis auth yet.
  const { google } = require('googleapis');

  const auth = new google.auth.GoogleAuth({
    keyFile: config.googleCredentialsPath,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly']
  });
  const analyticsData = google.analyticsdata({ version: 'v1beta', auth });

  const endDate = 'today';
  const startDate = `${range - 1}daysAgo`;

  const res = await analyticsData.properties.runReport({
    property: `properties/${config.ga4PropertyId}`,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }, { name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }]
    }
  });

  // Build a reverse lookup from GA4's channel group label back to our keys.
  const groupToChannel = {};
  Object.entries(channelMeta).forEach(([key, meta]) => {
    groupToChannel[meta.ga4Group] = key;
  });

  const byChannel = {};
  channels.forEach((ch) => {
    byChannel[ch] = new Array(range).fill(0);
  });

  const rows = (res.data.rows || []);
  // GA4 returns dates as YYYYMMDD strings; map them to a 0-based day index
  // within the requested range so the shape matches the demo generator.
  const dateIndex = {};
  let cursor = 0;
  rows.forEach((row) => {
    const dateStr = row.dimensionValues[0].value;
    if (!(dateStr in dateIndex)) dateIndex[dateStr] = cursor++;
  });

  rows.forEach((row) => {
    const dateStr = row.dimensionValues[0].value;
    const group = row.dimensionValues[1].value;
    const sessions = parseInt(row.metricValues[0].value, 10) || 0;
    const ch = groupToChannel[group];
    const idx = dateIndex[dateStr];
    if (ch && channels.includes(ch) && idx !== undefined && idx < range) {
      byChannel[ch][idx] += sessions;
    }
  });

  return { bySessions: byChannel, source: 'ga4' };
}

async function fetchSessions({ range, channels }) {
  const hasRealConfig = Boolean(config.ga4PropertyId && config.googleCredentialsPath);
  if (!hasRealConfig) {
    return demoSessions({ range, channels });
  }
  try {
    return await realSessions({ range, channels });
  } catch (err) {
    console.warn('[ga4] 呼叫 GA4 Data API 失敗，改用模擬數據：', err.message);
    return demoSessions({ range, channels });
  }
}

module.exports = { fetchSessions };
