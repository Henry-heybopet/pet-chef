const test = require('node:test');
const assert = require('node:assert/strict');
const { calcCookingParams } = require('../src/services/cooking_engine');

const recipe = {
  cooking_base: { water_ratio: 0.15, cook_minutes: 10, mode: 'diy', temperature: 85, power: 8, speed: 1 },
  ingredients: {},
  water_content_pct: 70,
};

test('100克读取标准食谱烹饪时长，缺失时回退10分钟', () => {
  const configured = calcCookingParams(recipe, 100);
  const fallback = calcCookingParams({
    ...recipe,
    cooking_base: { ...recipe.cooking_base, cook_minutes: null },
  }, 100);

  assert.deepEqual(
    [configured.cook_minutes, configured.total_seconds, configured.duration_source],
    [10, 600, 'recipe_100g'],
  );
  assert.deepEqual(
    [fallback.cook_minutes, fallback.total_seconds, fallback.duration_source],
    [10, 600, 'fallback_100g'],
  );
});

test('标准食谱可以覆盖100克烹饪时长', () => {
  const configured = calcCookingParams({
    ...recipe,
    cooking_base: { ...recipe.cooking_base, cook_minutes: 12 },
  }, 100);
  assert.deepEqual(
    [configured.cook_minutes, configured.total_seconds, configured.duration_source],
    [12, 720, 'recipe_100g'],
  );
});

test('200至800克使用统一固定时长表且不再叠加预热', () => {
  const expected = new Map([
    [200, 15], [300, 18], [400, 21], [500, 25],
    [600, 29], [700, 34], [800, 39],
  ]);

  for (const [grams, minutes] of expected) {
    const params = calcCookingParams(recipe, grams);
    assert.deepEqual(
      [params.weight_bucket_grams, params.cook_minutes, params.total_seconds, params.duration_source],
      [grams, minutes, minutes * 60, 'standard_weight_table'],
    );
    assert.equal(params.total_seconds, params.cook_seconds);
    assert.deepEqual(params.stages.map(stage => stage.id), ['load', 'cook', 'done']);
    assert.equal('preheat_seconds' in params, false);
  }
});

test('只接受用户可选择的100至800克整百份数', () => {
  for (const invalidGrams of [99, 101, 801]) {
    assert.throws(
      () => calcCookingParams(recipe, invalidGrams),
      error => error.code === 'INVALID_COOK_WEIGHT',
    );
  }
});
