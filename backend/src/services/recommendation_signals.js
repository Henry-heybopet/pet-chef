// recommendation_signals.js - Pure signal extraction helpers for recipe and store recommendations.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toTimestamp(value) {
  const time = Date.parse(value || '');
  return Number.isNaN(time) ? 0 : time;
}

function inWindow(record, windowDays, now = new Date()) {
  const at = toTimestamp(record.measured_at || record.meal_time || record.created_at || record.paid_at);
  if (!at) return false;
  return now.getTime() - at <= windowDays * MS_PER_DAY;
}

function average(values) {
  const nums = values.filter(value => typeof value === 'number' && !Number.isNaN(value));
  if (!nums.length) return null;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

function countBy(values) {
  return values.reduce((acc, value) => {
    if (!value) return acc;
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function extractHealthSignals(healthRecords = [], options = {}) {
  const now = options.now || new Date();
  const recent14 = healthRecords.filter(record => inWindow(record, 14, now));
  const recent30 = healthRecords.filter(record => inWindow(record, 30, now));
  const sorted = [...healthRecords].sort((a, b) => toTimestamp(a.measured_at || a.created_at) - toTimestamp(b.measured_at || b.created_at));
  const first = sorted[0] || {};
  const latest = sorted[sorted.length - 1] || {};
  const latestWeight = typeof latest.weight_kg === 'number' ? latest.weight_kg : null;
  const firstWeight = typeof first.weight_kg === 'number' ? first.weight_kg : null;
  const symptoms = healthRecords.flatMap(record => Array.isArray(record.symptoms) ? record.symptoms : []);
  const latestBcs = typeof latest.body_condition_score === 'number' ? latest.body_condition_score : null;

  return {
    health_record_count: healthRecords.length,
    latest_weight_kg: latestWeight,
    weight_delta_kg_long_term: latestWeight !== null && firstWeight !== null ? round(latestWeight - firstWeight, 2) : null,
    avg_weight_kg_14d: roundNullable(average(recent14.map(record => record.weight_kg)), 2),
    avg_weight_kg_30d: roundNullable(average(recent30.map(record => record.weight_kg)), 2),
    latest_body_condition_score: latestBcs,
    body_condition_signal: bodyConditionSignal(latestBcs),
    symptom_counts: countBy(symptoms),
    avoid_tags: deriveAvoidTags(symptoms),
    support_tags: deriveSupportTags(symptoms, latestBcs),
  };
}

function extractFeedingSignals(feedingRecords = [], options = {}) {
  const now = options.now || new Date();
  const recent14 = feedingRecords.filter(record => inWindow(record, 14, now));
  const recent30 = feedingRecords.filter(record => inWindow(record, 30, now));
  const recipeCounts = countBy(feedingRecords.map(record => record.recipe_id));

  return {
    feeding_record_count: feedingRecords.length,
    avg_grams_14d: roundNullable(average(recent14.map(record => record.grams)), 1),
    avg_grams_30d: roundNullable(average(recent30.map(record => record.grams)), 1),
    appetite_score_14d: roundNullable(average(recent14.map(record => record.appetite_score)), 2),
    stool_score_14d: roundNullable(average(recent14.map(record => record.stool_score)), 2),
    energy_score_14d: roundNullable(average(recent14.map(record => record.energy_score)), 2),
    allergy_observation_count_30d: recent30.filter(record => record.allergy_observed === true).length,
    preferred_recipe_ids: topKeys(recipeCounts, 5),
    preference_tags: derivePreferenceTags(recent30),
    caution_tags: deriveFeedingCautionTags(recent30),
  };
}

function extractPurchaseSignals(orders = []) {
  const paidOrders = orders.filter(order => !order.status || ['paid', 'fulfilled', 'completed'].includes(order.status));
  const productIds = paidOrders.flatMap(order => {
    if (Array.isArray(order.product_ids)) return order.product_ids;
    if (Array.isArray(order.items)) return order.items.map(item => item.product_id);
    if (Array.isArray(order.order_items)) return order.order_items.map(item => item.product_id);
    return [];
  });
  const categoryCounts = countBy(paidOrders.flatMap(order => {
    if (order.category) return [order.category];
    const items = order.items || order.order_items || [];
    return items.map(item => item.category);
  }));
  const targetTags = paidOrders.flatMap(order => {
    const ownTags = Array.isArray(order.target_tags) ? order.target_tags : [];
    const itemTags = (order.items || order.order_items || []).flatMap(item => Array.isArray(item.target_tags) ? item.target_tags : []);
    return ownTags.concat(itemTags);
  });

  return {
    order_count: paidOrders.length,
    purchased_product_ids: topKeys(countBy(productIds), 10),
    purchased_category_counts: categoryCounts,
    purchased_target_tag_counts: countBy(targetTags),
    repeat_product_ids: Object.entries(countBy(productIds))
      .filter(([, count]) => count > 1)
      .map(([productId]) => productId),
    last_order_at: paidOrders.map(order => order.paid_at || order.created_at).sort().pop() || null,
  };
}

function buildRecommendationSignals({ healthRecords = [], feedingRecords = [], orders = [] } = {}, options = {}) {
  const health = extractHealthSignals(healthRecords, options);
  const feeding = extractFeedingSignals(feedingRecords, options);
  const purchase = extractPurchaseSignals(orders);

  return {
    health,
    feeding,
    purchase,
    recommendation_tags: unique([
      ...health.support_tags,
      ...feeding.preference_tags,
      ...Object.keys(purchase.purchased_target_tag_counts || {}),
    ]),
    exclusion_tags: unique([
      ...health.avoid_tags,
      ...feeding.caution_tags,
    ]),
  };
}

function bodyConditionSignal(score) {
  if (score === null) return 'unknown';
  if (score <= 3) return 'under_condition';
  if (score >= 7) return 'over_condition';
  return 'ideal';
}

function deriveAvoidTags(symptoms = []) {
  const joined = symptoms.join(' ');
  const tags = [];
  if (/过敏|瘙痒|皮肤|红疹|allergy|itch/i.test(joined)) tags.push('possible_allergen');
  if (/腹泻|软便|呕吐|diarrhea|vomit/i.test(joined)) tags.push('digestive_irritant');
  return unique(tags);
}

function deriveSupportTags(symptoms = [], bcs = null) {
  const joined = symptoms.join(' ');
  const tags = [];
  if (/腹泻|软便|肠胃|digest/i.test(joined)) tags.push('digestive_support');
  if (/关节|跛|joint|limp/i.test(joined)) tags.push('joint_support');
  if (/皮肤|毛发|瘙痒|skin|coat|itch/i.test(joined)) tags.push('skin_coat_support');
  if (bcs !== null && bcs >= 7) tags.push('weight_control');
  if (bcs !== null && bcs <= 3) tags.push('high_energy');
  return unique(tags);
}

function derivePreferenceTags(records = []) {
  const tags = [];
  const appetite = average(records.map(record => record.appetite_score));
  const energy = average(records.map(record => record.energy_score));
  if (appetite !== null && appetite >= 4) tags.push('high_acceptance');
  if (energy !== null && energy >= 4) tags.push('energy_positive');
  return tags;
}

function deriveFeedingCautionTags(records = []) {
  const tags = [];
  const stool = average(records.map(record => record.stool_score));
  if (stool !== null && (stool <= 2 || stool >= 5)) tags.push('stool_watch');
  if (records.some(record => record.allergy_observed === true)) tags.push('possible_allergen');
  return unique(tags);
}

function topKeys(counts, limit) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function round(value, digits) {
  const scale = Math.pow(10, digits);
  return Math.round(value * scale) / scale;
}

function roundNullable(value, digits) {
  return value === null ? null : round(value, digits);
}

module.exports = {
  extractHealthSignals,
  extractFeedingSignals,
  extractPurchaseSignals,
  buildRecommendationSignals,
};
