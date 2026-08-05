const test = require('node:test');
const assert = require('node:assert/strict');
const { PROMPT_VERSION, isRecommendationCacheValid, cachedEnergyTarget, filterRecipesForLifeStage, fallbackRanking, applyRuleScoreCeilings, _test } = require('../src/services/ai_recommendation');
const { recipesDb } = require('../src/data/recipes_db');

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

test('AI must score every A candidate and the backend sorts the complete result', () => {
  assert.equal(PROMPT_VERSION, 'heybo-agent-ab-v5');
  assert.throws(() => _test.validateAgentResult({ selected_daily_kcal: 600, ranked_recipes: [{ recipe_id: 'a', score: 90, eligible: true }] }, {
    candidateIds: ['a', 'b'], hardBlockedIds: new Set(), minKcal: 500, maxKcal: 700, allowedBPacks: new Set(),
  }), /every candidate/);
  const validated = _test.validateAgentResult({ selected_daily_kcal: 600, ranked_recipes: [
    { recipe_id: 'a', score: 84, eligible: true },
    { recipe_id: 'b', score: 100, eligible: true },
    { recipe_id: 'c', score: 97, eligible: true },
    { recipe_id: 'blocked', score: 100, eligible: false },
  ] }, {
    candidateIds: ['a', 'b', 'c', 'blocked'], hardBlockedIds: new Set(['blocked']), minKcal: 500, maxKcal: 700, allowedBPacks: new Set(),
  });
  const completed = _test.completeAgentRanking(validated);
  assert.deepEqual(completed.ranked_recipes.map(item => item.recipe_id), ['b', 'c', 'a', 'blocked']);
  const fallback = fallbackRanking([{ recipe_id: 'danger', hard_blocked: true, rule_score: 90 }, { recipe_id: 'safe', hard_blocked: false, rule_score: 80 }]);
  assert.equal(fallback[0].recipe_id, 'safe');
  assert.equal(fallback[1].eligible, false);
});

test('every supplied life-stage candidate is required before selecting the top ten', () => {
  const candidateIds = Array.from({ length: 15 }, (_, index) => `recipe_${index + 1}`);
  const rankedRecipes = candidateIds.map((recipeId, index) => ({
    recipe_id: recipeId,
    score: (index * 23) % 101,
    eligible: true,
  }));
  assert.throws(() => _test.validateAgentResult({ selected_daily_kcal: 600, ranked_recipes: rankedRecipes.slice(0, 10) }, {
    candidateIds, hardBlockedIds: new Set(), minKcal: 500, maxKcal: 700, allowedBPacks: new Set(),
  }), /every candidate/);

  const validated = _test.validateAgentResult({ selected_daily_kcal: 600, ranked_recipes: rankedRecipes }, {
    candidateIds, hardBlockedIds: new Set(), minKcal: 500, maxKcal: 700, allowedBPacks: new Set(),
  });
  const sorted = _test.completeAgentRanking(validated).ranked_recipes;
  assert.equal(sorted.length, 15);
  assert.deepEqual(sorted.slice(0, 10).map(item => item.score), [...sorted].map(item => item.score).sort((a, b) => b - a).slice(0, 10));
});

test('life-stage candidate filtering is exact and never treats empty stages as universal', () => {
  const recipes = [
    { id: 'puppy-zh', life_stage: '幼犬' },
    { id: 'puppy-en', life_stage: 'PUPPY' },
    { id: 'adult', life_stage: '成年犬' },
    { id: 'senior', life_stage: '老年犬' },
    { id: 'empty', life_stage: null },
  ];
  assert.deepEqual(filterRecipesForLifeStage(recipes, 'puppy').map(recipe => recipe.id), ['puppy-zh', 'puppy-en']);
  assert.deepEqual(filterRecipesForLifeStage(recipes, 'adult').map(recipe => recipe.id), ['adult']);
  assert.deepEqual(filterRecipesForLifeStage(recipes, 'senior').map(recipe => recipe.id), ['senior']);
  assert.deepEqual(filterRecipesForLifeStage(recipes, 'unknown'), []);
});

test('canonical A recipes all have an explicit life stage and the fifteen functional recipes are adult', () => {
  assert.equal(recipesDb.length, 40);
  assert.equal(recipesDb.filter(recipe => !recipe.life_stage).length, 0);
  assert.deepEqual(
    recipesDb.filter(recipe => Number(recipe.id.slice(-3)) >= 11 && Number(recipe.id.slice(-3)) <= 25)
      .map(recipe => recipe.life_stage),
    Array(15).fill('成年犬')
  );
  assert.deepEqual(
    ['puppy', 'adult', 'senior'].map(stage => filterRecipesForLifeStage(recipesDb, stage).length),
    [15, 20, 5]
  );
});

test('displayed recommendation score always equals the Fresh Check weighted score', () => {
  const ranked = applyRuleScoreCeilings([
    { recipe_id: 'dog_recipe_009', score: 95, eligible: true, suitability: 'high' },
    { recipe_id: 'lower-ai', score: 78, eligible: true, suitability: 'medium' },
    { recipe_id: 'blocked', score: 90, eligible: false, suitability: 'blocked' },
  ], {
    dog_recipe_009: { recommendation_score: 83 },
    'lower-ai': { recommendation_score: 90 },
    blocked: { recommendation_score: 85 },
  });

  assert.deepEqual(ranked.map(item => item.score), [90, 83, 49]);
  assert.deepEqual(ranked.map(item => item.recipe_id), ['lower-ai', 'dog_recipe_009', 'blocked']);
  const capped = ranked.find(item => item.recipe_id === 'dog_recipe_009');
  const raised = ranked.find(item => item.recipe_id === 'lower-ai');
  assert.equal(capped.ai_score, 95);
  assert.equal(capped.rule_score, 83);
  assert.equal(capped.score, 83);
  assert.equal(capped.score_cap_applied, true);
  assert.equal(capped.score_rule_applied, true);
  assert.equal(capped.suitability, 'medium');
  assert.equal(raised.ai_score, 78);
  assert.equal(raised.score, 90);
  assert.equal(raised.score_rule_applied, true);
});
