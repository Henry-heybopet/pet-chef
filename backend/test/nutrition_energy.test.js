const test = require('node:test');
const assert = require('node:assert/strict');
const { recipesDb } = require('../src/data/recipes_db');
const { calcIngredientGrams } = require('../src/services/cooking_engine');
const { dailyEnergyNeed, feedingPlanForRecipe, recommendationScoreFromValidation } = require('../src/services/nutrition_energy');
const { _test: freshCheck } = require('../src/services/fresh_check');

const tunaPuppyRecipe = recipesDb.find(recipe => recipe.id === 'dog_recipe_035');

test('3.6个月5.3kg史宾格幼犬与Fresh Check共用3倍RER且不重复叠加活动系数', () => {
  const pet = {
    breed: '史宾格犬',
    age_months: 3.6,
    current_weight_kg: 5.3,
    target_weight_kg: 5.5,
    life_stage: 'puppy',
    activity_level: 'high',
    feeding_goal: 'maintenance',
    neutered: false,
  };
  const shared = dailyEnergyNeed(pet);
  const check = freshCheck.dailyEnergyNeed(pet);

  assert.deepEqual(check, shared);
  assert.equal(shared.rer_kcal, 245);
  assert.equal(shared.daily_kcal, 735);
  assert.deepEqual([shared.min_kcal, shared.max_kcal], [625, 845]);
  assert.equal(shared.meals_per_day, 4);
  assert.equal(shared.activity_factor, 1);
  assert.equal(shared.recorded_activity_factor, 1.15);
});

test('金枪鱼南瓜脑发育按实际能量密度反推610g而不是旧算法239g，并触发食量护栏', () => {
  const pet = {
    age_months: 3.6,
    current_weight_kg: 5.3,
    target_weight_kg: 5.5,
    life_stage: 'puppy',
    activity_level: 'high',
    feeding_goal: 'maintenance',
    neutered: false,
  };
  const plan = feedingPlanForRecipe(pet, tunaPuppyRecipe);

  assert.equal(plan.kcal_per_gram, 1.205);
  assert.equal(plan.daily_grams, 610);
  assert.equal(plan.per_meal_grams, 153);
  assert.equal(plan.daily_food_weight_pct_body_weight, 11.5);
  assert.equal(plan.reference_max_daily_grams, 424);
  assert.equal(plan.minimum_density_for_reference_volume, 1.73);
  assert.equal(plan.excessive_volume, true);
  assert.equal(plan.feasible, false);
  assert.equal(plan.warning_code, 'EXCESSIVE_DAILY_FOOD_VOLUME');
  assert.ok(plan.feasibility_score < 50);
});

test('A包百分比不足100时按比例归一，单餐食材克数仍与单餐总量守恒', () => {
  const ingredientList = calcIngredientGrams(tunaPuppyRecipe.ingredients, 153);
  assert.equal(ingredientList.reduce((sum, item) => sum + (item.grams || 0), 0), 153);
});

test('17个月33.5kg已绝育拉布拉多回归图七能量结果', () => {
  const need = dailyEnergyNeed({
    breed: '拉布拉多',
    age_months: 17,
    current_weight_kg: 33.5,
    target_weight_kg: 33.5,
    life_stage: 'adult',
    activity_level: 'medium',
    feeding_goal: 'maintenance',
    neutered: true,
  });

  assert.equal(need.rer_kcal, 975);
  assert.equal(need.daily_kcal, 1404);
  assert.deepEqual([need.min_kcal, need.max_kcal], [1193, 1615]);
  assert.equal(need.meals_per_day, 2);
});

test('食材热量覆盖不足时不得把候选食谱标为可执行', () => {
  const recipe = { id: 'unknown', name: '未知配方', ingredients: { '未知食材': 100 } };
  const plan = feedingPlanForRecipe({ age_months: 24, current_weight_kg: 10, life_stage: 'adult' }, recipe);

  assert.equal(plan.daily_grams, null);
  assert.equal(plan.energy_coverage_pct, 0);
  assert.equal(plan.feasible, false);
  assert.equal(plan.warning_code, 'ENERGY_DENSITY_INCOMPLETE');
});

test('AI推荐分按Fresh Check六维加权，长期限制项不再直接替代综合分', () => {
  const scores = { safety: 100, suitability: 100, structure: 62, nutrition: 100, long_term: 62, energy: 100 };
  assert.equal(recommendationScoreFromValidation(scores), 89);
  assert.equal(recommendationScoreFromValidation(scores, { hasDanger: true }), 49);
});
