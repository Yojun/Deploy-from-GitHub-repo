// Mirrors the channel set used by the frontend dashboard (axisgrowth.html).
// `ga4Group` is a best-effort mapping to GA4's default channel grouping —
// adjust it to match how your own GA4 property buckets traffic before you
// switch GA4_PROPERTY_ID on.
module.exports = {
  seo: { label: '自然搜尋 SEO', ga4Group: 'Organic Search', base: 180, trend: 2.6, convRate: 0.045, aov: 1450 },
  paid: { label: '付費廣告', ga4Group: 'Paid Search', base: 140, trend: 0.4, convRate: 0.028, aov: 1200 },
  automation: { label: '行銷自動化', ga4Group: 'Email', base: 90, trend: 1.1, convRate: 0.061, aov: 1600 },
  social: { label: '社群媒體', ga4Group: 'Organic Social', base: 70, trend: 0.6, convRate: 0.021, aov: 980 },
  direct: { label: '直接流量', ga4Group: 'Direct', base: 60, trend: 0.2, convRate: 0.033, aov: 1100 }
};
