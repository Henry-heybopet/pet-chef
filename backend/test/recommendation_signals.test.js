const test = require('node:test');
const assert = require('node:assert/strict');
const { extractFeedingSignals } = require('../src/services/recommendation_signals');

test('uses real feeding feedback fields and does not boost good acceptance with abnormal stool', () => {
  const now = new Date('2026-08-03T00:00:00Z');
  const signals = extractFeedingSignals([
    { recipe_id: 'beef', fed_at: '2026-08-02T00:00:00Z', amount_g: 300, palatability: '光盘行动', stool_status: '大便干燥' },
    { recipe_id: 'chicken', fed_at: '2026-08-01T00:00:00Z', amount_g: 200, palatability: '光盘行动', stool_status: '大便正常' },
  ], { now });
  assert.equal(signals.avg_grams_14d, 250);
  const beef = signals.recipe_feedback.find(item => item.recipe_id === 'beef');
  const chicken = signals.recipe_feedback.find(item => item.recipe_id === 'chicken');
  assert.equal(beef.acceptance_positive, false);
  assert.equal(chicken.acceptance_positive, true);
  assert.ok(signals.caution_tags.includes('stool_watch'));
});
