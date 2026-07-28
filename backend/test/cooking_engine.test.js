const test = require('node:test');
const assert = require('node:assert/strict');
const { calcCookingParams } = require('../src/services/cooking_engine');

const recipe = {
  cooking_base: { water_ratio: 0.15, cook_minutes: 10, mode: 'diy', temperature: 85, power: 8, speed: 1 },
  ingredients: {},
  water_content_pct: 70,
};

test('烹饪时间按食材重量使用1.0、1.6、2.4倍率并合并为单一低温烹饪阶段', () => {
  const small = calcCookingParams(recipe, 200);
  const medium = calcCookingParams(recipe, 400);
  const large = calcCookingParams(recipe, 600);

  assert.deepEqual([small.cook_time_multiplier, small.cook_minutes], [1, 13]);
  assert.deepEqual([medium.cook_time_multiplier, medium.cook_minutes], [1.6, 20]);
  assert.deepEqual([large.cook_time_multiplier, large.cook_minutes], [2.4, 28]);
  assert.equal(large.total_seconds, large.cook_seconds);
  assert.deepEqual(large.stages.map(stage => stage.id), ['load', 'cook', 'done']);
  assert.equal('preheat_seconds' in large, false);
});
