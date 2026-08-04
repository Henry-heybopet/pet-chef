const test = require('node:test');
const assert = require('node:assert/strict');
const { PROMPT_VERSION, isRecommendationCacheValid, cachedEnergyTarget, fallbackRanking, _test } = require('../src/services/ai_recommendation');

test('cache expires after ten days or ten newly added feedback records', () => {
  const now = Date.now();
  const cache = { cache_version: PROMPT_VERSION, context_hash: 'same', timestamp: now, feedback_count_at_analysis: 3 };
  assert.equal(isRecommendationCacheValid(cache, { contextHash: 'same', feedbackCount: 12, now }), true);
  assert.equal(isRecommendationCacheValid(cache, { contextHash: 'same', feedbackCount: 13, now }), false);
  assert.equal(isRecommendationCacheValid(cache, { contextHash: 'same', feedbackCount: 3, now: now + 10 * 86400000 + 1 }), false);
});

test('cached energy target shares the valid HeyboPet Agent target with Fresh Check', () => {
  const cache = { cache_version: PROMPT_VERSION, timestamp: Date.now(), pet_updated_at: 'v1', feedback_count_at_analysis: 0, response: { analysis: { daily_energy: { daily_kcal: 617 } } } };
  assert.equal(cachedEnergyTarget(cache, { petUpdatedAt: 'v1', feedbackCount: 9 }), 617);
  assert.equal(cachedEnergyTarget(cache, { petUpdatedAt: 'v1', feedbackCount: 10 }), null);
});

test('AI selects a safe top set and deterministic rules complete the remaining A candidates', () => {
  assert.throws(() => _test.validateAgentResult({ selected_daily_kcal: 600, ranked_recipes: [{ recipe_id: 'unknown', score: 90, eligible: true }] }, {
    candidateIds: ['a', 'b'], hardBlockedIds: new Set(), minKcal: 500, maxKcal: 700, allowedBPacks: new Set(),
  }), /unique candidate/);
  const completed = _test.completeAgentRanking({ ranked_recipes: [{ recipe_id: 'a', score: 90, eligible: true }] }, [
    { recipe_id: 'a', hard_blocked: false, rule_score: 70 },
    { recipe_id: 'b', hard_blocked: false, rule_score: 80 },
  ]);
  assert.deepEqual(completed.ranked_recipes.map(item => item.recipe_id), ['a', 'b']);
  const fallback = fallbackRanking([{ recipe_id: 'danger', hard_blocked: true, rule_score: 90 }, { recipe_id: 'safe', hard_blocked: false, rule_score: 80 }]);
  assert.equal(fallback[0].recipe_id, 'safe');
  assert.equal(fallback[1].eligible, false);
});
