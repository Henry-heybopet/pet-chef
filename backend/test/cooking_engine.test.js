const test = require('node:test');
const assert = require('node:assert/strict');
const { calcCookingParams } = require('../src/services/cooking_engine');

const recipe = {
  cooking_base: { water_ratio: 0.15, cook_minutes: 10, mode: 'diy', temperature: 85, power: 8, speed: 1 },
  ingredients: {},
  water_content_pct: 70,
};

test('烹饪时间按食材重量使用1.0、1.6、2.4倍率', () => {
  const small = calcCookingParams(recipe, 200);
  const medium = calcCookingParams(recipe, 400);
  const large = calcCookingParams(recipe, 600);

  assert.deepEqual([small.cook_time_multiplier, small.cook_minutes], [1, 10]);
  assert.deepEqual([medium.cook_time_multiplier, medium.cook_minutes], [1.6, 16]);
  assert.deepEqual([large.cook_time_multiplier, large.cook_minutes], [2.4, 24]);
  assert.equal(large.total_seconds, large.preheat_seconds + large.cook_seconds);
});
