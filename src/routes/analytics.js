const express = require('express');
const requirePublicKey = require('../middleware/requirePublicKey');
const channelMeta = require('../data/channels');
const ga4 = require('../services/ga4');
const db = require('../db');

const router = express.Router();
const VALID_RANGES = [7, 30, 90];

router.get('/analytics', requirePublicKey, async (req, res) => {
  const range = parseInt(req.query.range, 10);
  if (!VALID_RANGES.includes(range)) {
    return res.status(400).json({ error: { code: 'invalid_range', message: 'range 必須是 7、30 或 90' } });
  }

  const channels = String(req.query.channels || '')
    .split(',')
    .map((c) => c.trim())
    .filter((c) => channelMeta[c]);

  if (channels.length === 0) {
    return res.status(400).json({ error: { code: 'invalid_channels', message: 'channels 不可為空，且必須是已知管道' } });
  }

  try {
    const { bySessions } = await ga4.fetchSessions({ range, channels });

    const recentEvents = await db.eventsInRangeDays(range);
    const dealEvents = recentEvents.filter((e) => e.event === 'deal.won');

    let totalSessions = 0;
    let totalConversions = 0;
    let totalRevenue = 0;

    const byChannel = channels.map((ch) => {
      const sessions = (bySessions[ch] || []).reduce((a, b) => a + b, 0);
      const channelDeals = dealEvents.filter((e) => e.properties && e.properties.channel === ch);
      const conversions = channelDeals.length;
      const revenue = channelDeals.reduce((sum, e) => sum + (Number(e.properties.amount) || 0), 0);

      totalSessions += sessions;
      totalConversions += conversions;
      totalRevenue += revenue;

      return { channel: ch, label: channelMeta[ch].label, sessions, conversions, revenue };
    });

    const trend = new Array(range).fill(0).map((_, i) => {
      const sessions = channels.reduce((sum, ch) => sum + ((bySessions[ch] || [])[i] || 0), 0);
      return { index: i, sessions };
    });

    res.json({
      range,
      generated_at: new Date().toISOString(),
      totals: {
        sessions: totalSessions,
        conversions: totalConversions,
        conversion_rate: totalSessions > 0 ? (totalConversions / totalSessions) * 100 : 0,
        revenue: totalRevenue
      },
      trend,
      by_channel: byChannel
    });
  } catch (err) {
    console.error('[analytics] 發生錯誤：', err);
    res.status(500).json({ error: { code: 'internal_error', message: '取得分析數據時發生錯誤' } });
  }
});

module.exports = router;
