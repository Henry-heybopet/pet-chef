const test = require('node:test');
const assert = require('node:assert/strict');
const { ingredientsDb } = require('../src/data/ingredients_db');
const { _test } = require('../src/services/fresh_check');
const { _test: nutritionRepository } = require('../src/services/nutrition_repository');

const adult = { id: 'dog-1', name: '姐姐', species: 'dog', age_months: 24, current_weight_kg: 10, activity_level: 'medium', feeding_goal: 'maintenance' };
const analyze = (ingredients, selectedBPack = null, pet = adult) => _test.localCheck({ pet, ingredients, mealIntent: 'long_term', selectedBPack, ingredientMap: ingredientsDb });
const value = (report, key) => report.scores.find(item => item.key === key).value;
const codes = report => new Set(report.findings.map(item => item.code).filter(Boolean));

test('350g低肉高碳水配方会被确定性结构规则识别', () => {
  const report = analyze([{ name: '鸡胸肉', grams: 50 }, { name: '胡萝卜', grams: 100 }, { name: '南瓜', grams: 200 }]);
  assert.equal(report.macro_nutrition.ingredient_weight_ratios.animal_protein_pct, 14.3);
  assert.equal(report.macro_nutrition.ingredient_weight_ratios.carb_pct, 57.1);
  assert.equal(report.macro_nutrition.ingredient_weight_ratios.vegetable_pct, 28.6);
  assert.equal(report.macro_nutrition.estimated_grams.protein_g, 15.5);
  assert.equal(report.macro_nutrition.estimated_grams.fat_g, 2);
  assert.equal(report.macro_nutrition.estimated_grams.carb_g, 24);
  assert.ok(codes(report).has('LOW_ANIMAL_PROTEIN'));
  assert.ok(codes(report).has('HIGH_CARB'));
  assert.ok(codes(report).has('HIGH_VEGETABLE'));
  assert.ok(codes(report).has('LOW_FAT_SOURCE'));
  assert.ok(value(report, 'structure') <= 40);
});

test('每条提示都提供稳定语义字段，展示语言不得成为业务判断依据', () => {
  const report = analyze([{ name: '葡萄', grams: 20 }, { name: '鸡胸肉', grams: 50 }, { name: '南瓜', grams: 200 }]);
  report.findings.forEach(item => {
    assert.ok(item.risk_code);
    assert.equal(item.risk_code, item.code);
    assert.equal(item.risk_level, item.level);
    assert.ok(item.adjustment_code);
    assert.equal(typeof item.facts, 'object');
  });
  const grape = report.findings.find(item => item.risk_code === 'FORBIDDEN');
  assert.equal(grape.ingredient_id, 'grape');
  assert.equal(grape.facts.ingredient_name, '葡萄');
});

test('1g肉不能通过出现一个肉类名称刷高结构分', () => {
  const weak = analyze([{ name: '鸡胸肉', grams: 1 }, { name: '胡萝卜', grams: 100 }, { name: '南瓜', grams: 200 }]);
  const sample = analyze([{ name: '鸡胸肉', grams: 50 }, { name: '胡萝卜', grams: 100 }, { name: '南瓜', grams: 200 }]);
  assert.ok(weak.macro_nutrition.ingredient_weight_ratios.animal_protein_pct < 1);
  assert.ok(value(weak, 'structure') <= 25);
  assert.ok(value(weak, 'structure') < value(sample, 'structure'));
});

test('B包只补微量营养，不改变宏量结构或把长期适宜性设为100', () => {
  const recipe = [{ name: '鸡胸肉', grams: 50 }, { name: '胡萝卜', grams: 100 }, { name: '南瓜', grams: 200 }];
  const before = analyze(recipe);
  const after = analyze(recipe, { name: '成犬维护营养包B', description: '维矿预混料与钙源' });
  assert.equal(value(after, 'structure'), value(before, 'structure'));
  assert.equal(after.recipe.total_weight_g, before.recipe.total_weight_g);
  assert.deepEqual(after.macro_nutrition.estimated_grams, before.macro_nutrition.estimated_grams);
  assert.equal(after.daily_need.recipe_kcal, before.daily_need.recipe_kcal);
  assert.ok(after.findings.some(item => item.title === '必需脂肪酸待确认'));
  assert.ok(codes(after).has('LOW_ANIMAL_PROTEIN'));
  assert.ok(codes(after).has('HIGH_CARB'));
  assert.ok(value(after, 'long_term') < 100);
  assert.ok(value(after, 'long_term') <= value(after, 'structure'));
});

test('B包按食材总重10%计算且明确排除烹饪与营养计算', () => {
  const application = _test.bPackApplication(580);
  assert.equal(application.dose_grams, 58);
  assert.equal(application.basis_code, 'B_PACK_DOSE_10_PERCENT_POST_COOK');
  assert.deepEqual(application.facts, { grams_per_100g: 10, total_weight_g: 580 });
  assert.equal(application.timing, 'post_cook');
  assert.equal(application.excluded_from_recipe_weight, true);
  assert.equal(application.excluded_from_macros, true);
  assert.equal(application.excluded_from_energy, true);
  assert.equal(application.excluded_from_cooking, true);
});

test('B包同时接受稳定category code和旧APK中文分类', () => {
  const options = [{ category: '成犬通用', category_code: 'ADULT_GENERAL', enabled: true }];
  assert.equal(_test.selectBPackOption(options, 'ADULT_GENERAL'), options[0]);
  assert.equal(_test.selectBPackOption(options, '成犬通用'), options[0]);
  assert.equal(_test.selectBPackOption(options, 'UNKNOWN'), null);
});

test('动态展示区提供稳定code和facts且不改变评分数值', () => {
  const report = analyze([{ name: '鸡胸肉', grams: 220 }, { name: '鸡肝', grams: 15 }, { name: '米饭', grams: 55 }, { name: '胡萝卜', grams: 40 }, { name: '西兰花', grams: 20 }, { name: '鱼油', grams: 5 }]);
  assert.equal(report.daily_need.stage_code, 'adult');
  assert.ok(report.daily_need.note_code);
  assert.ok(report.daily_need.intake_feasibility.volume_advice_code);
  report.suitability_detail.components.forEach(item => {
    assert.ok(item.label_code);
    assert.ok(item.reason_code);
    assert.ok(item.adjustment_code);
    assert.equal(typeof item.facts, 'object');
  });
  assert.ok(report.long_term_detail.explanation_code);
  assert.equal(report.long_term_detail.adjustment_codes.length, report.long_term_detail.adjustments.length);
  report.scores.forEach(item => assert.ok(item.label_code));
  if (report.cooking_plan) assert.equal(report.cooking_plan.note_code, 'COOKING_PLAN_AWAITING_CONFIRMATION_NOT_SENT');
});

test('合理结构配方不会触发四个比例问题', () => {
  const report = analyze([{ name: '鸡胸肉', grams: 220 }, { name: '鸡肝', grams: 15 }, { name: '米饭', grams: 55 }, { name: '胡萝卜', grams: 40 }, { name: '西兰花', grams: 20 }, { name: '鱼油', grams: 5 }]);
  ['LOW_ANIMAL_PROTEIN', 'HIGH_CARB', 'HIGH_VEGETABLE', 'LOW_FAT_SOURCE'].forEach(code => assert.ok(!codes(report).has(code), code));
  assert.ok(value(report, 'structure') >= 80);
});

test('530g牛肉牛肝配方识别动物蛋白、内脏和三文鱼油', () => {
  const recipe = [
    { name: '牛肉', grams: 250 },
    { name: '土豆', grams: 150 },
    { name: '葫芦', grams: 20 },
    { name: '西兰花', grams: 40 },
    { name: '三文鱼油', grams: 20 },
    { name: '牛肝', grams: 50 },
  ];
  const report = analyze(recipe);
  assert.deepEqual(report.macro_nutrition.ingredient_weight_ratios, {
    animal_protein_pct: 56.6,
    organ_pct: 9.4,
    carb_pct: 28.3,
    vegetable_pct: 11.3,
    fat_containing_ingredient_pct: 60.4,
    fat_source_pct: 3.8,
  });
  assert.deepEqual(report.macro_nutrition.estimated_grams, {
    protein_g: 75,
    fat_g: 52,
    carb_g: 28.9,
    water_g: 369.4,
  });
  assert.equal(report.macro_nutrition.coverage.weight_pct, 100);
  assert.equal(report.macro_nutrition.details.find(item => item.name === '三文鱼油').matched_name, '三文鱼油');
});

test('不完整PostgreSQL食材行不会覆盖静态基础营养数据', () => {
  const merged = nutritionRepository.mergeIngredientRows(ingredientsDb, [
    { id: '牛肉', name: '牛肉', category: 'protein', protein_pct: null, fat_pct: null, calories_per_100g: null },
    { id: '自定义食材', name: '自定义食材', category: 'veg', calories_per_100g: '25.5' },
  ]);
  assert.equal(merged['牛肉'].protein_pct, 26);
  assert.equal(merged['牛肉'].fat_pct, 12);
  assert.equal(merged['牛肉'].calories_per_100g, 213);
  assert.equal(merged['自定义食材'].calories_per_100g, '25.5');
});

test('名称分类不依赖营养覆盖，但缺失营养仍明确标记为不完整', () => {
  const report = _test.localCheck({
    pet: adult,
    ingredients: [{ name: '牛肉', grams: 250 }, { name: '牛肝', grams: 50 }],
    mealIntent: 'long_term',
    ingredientMap: {},
  });
  assert.equal(report.macro_nutrition.ingredient_weight_ratios.animal_protein_pct, 100);
  assert.equal(report.macro_nutrition.ingredient_weight_ratios.organ_pct, 16.7);
  assert.equal(report.macro_nutrition.coverage.weight_pct, 0);
  assert.ok(codes(report).has('MACRO_DATA_INCOMPLETE'));
});

test('幼犬采用更高的FEDIAF蛋白质和脂肪阶段最低值', () => {
  const recipe = [{ name: '鸡胸肉', grams: 100 }, { name: '米饭', grams: 40 }, { name: '胡萝卜', grams: 20 }, { name: '鱼油', grams: 2 }];
  const adultReport = analyze(recipe);
  const puppyReport = analyze(recipe, null, { ...adult, age_months: 2, life_stage: 'puppy' });
  assert.equal(adultReport.macro_nutrition.standards.protein_min_g_per_1000kcal, 52.1);
  assert.equal(puppyReport.macro_nutrition.standards.protein_min_g_per_1000kcal, 62.5);
  assert.equal(puppyReport.macro_nutrition.standards.fat_min_g_per_1000kcal, 21.25);
});

test('幼犬专业确认不会再把长期适宜性固定锁定为60分', () => {
  const puppy = { ...adult, age_months: 2, life_stage: 'puppy', current_weight_kg: 2.5 };
  const report = analyze([{ name: '鸡胸肉', grams: 220 }, { name: '鸡肝', grams: 15 }, { name: '米饭', grams: 55 }, { name: '胡萝卜', grams: 40 }, { name: '西兰花', grams: 20 }, { name: '鱼油', grams: 5 }], { name: '幼犬成长营养包B', description: '维矿预混料、钙源与鱼油' }, puppy);
  const factors = ['nutrition', 'structure', 'energy', 'suitability'].map(key => value(report, key));
  assert.equal(value(report, 'long_term'), Math.min(...factors));
  assert.notEqual(value(report, 'long_term'), 60);
  assert.equal(report.long_term_detail.professional_confirmation_required, true);
  assert.ok(report.long_term_detail.explanation.includes('限制'));
  assert.equal(report.suitability_detail.components.length, 7);
  assert.equal(report.suitability_detail.value, Math.round(report.suitability_detail.components.reduce((sum, item) => sum + item.earned, 0)));
});

test('肉类自身脂肪与额外油脂分开显示', () => {
  const report = analyze([{ name: '羊肉', grams: 200 }, { name: '米饭', grams: 50 }, { name: '胡萝卜', grams: 40 }]);
  assert.equal(report.macro_nutrition.ingredient_weight_ratios.fat_containing_ingredient_pct, 69);
  assert.equal(report.macro_nutrition.ingredient_weight_ratios.fat_source_pct, 0);
  assert.ok(report.macro_nutrition.estimated_grams.fat_g > 0);
});

test('健康记录按配方指标平滑降低宠物适配性', () => {
  const recipe = [{ name: '羊肉', grams: 150 }, { name: '鸡肝', grams: 50 }, { name: '米饭', grams: 50 }, { name: '胡萝卜', grams: 30 }];
  const healthy = analyze(recipe, null, adult);
  const healthCase = analyze(recipe, null, { ...adult, health_tags: ['肝脏疾病'] });
  assert.ok(healthy.suitability_detail.value > healthCase.suitability_detail.value);
  assert.ok(healthCase.suitability_detail.components.find(item => item.key === 'health').earned < 20);
});

test('能量接近目标时体重能量子项连续提高，超过后再平滑下降', () => {
  const pet = { ...adult, age_months: 2, life_stage: 'puppy', current_weight_kg: 2.5, target_weight_kg: 3, body_size: 'small', neutered: false };
  const make = oilGrams => analyze([{ name: '鸡胸肉', grams: 80 }, { name: '米饭', grams: 40 }, { name: '胡萝卜', grams: 20 }, { name: '鱼油', grams: oilGrams }], null, pet);
  const low = make(10); const matched = make(26); const high = make(40);
  assert.ok(value(low, 'suitability') < value(matched, 'suitability'));
  assert.ok(value(high, 'suitability') < value(matched, 'suitability'));
  assert.ok(value(low, 'suitability') > 0 && value(high, 'suitability') > 0);
});

test('食物不耐受命中为红线且过敏子项归零', () => {
  const report = analyze([{ name: '鸡胸肉', grams: 150 }, { name: '米饭', grams: 50 }], null, { ...adult, food_restrictions: ['鸡肉'] });
  assert.ok(codes(report).has('PET_FOOD_CONFLICT'));
  assert.equal(report.suitability_detail.components.find(item => item.key === 'allergy').earned, 0);
});

test('孕哺与恢复状态单独进入适配性子项', () => {
  const recipe = [{ name: '鸡胸肉', grams: 150 }, { name: '米饭', grams: 50 }, { name: '胡萝卜', grams: 30 }];
  const normal = analyze(recipe);
  const pregnancy = analyze(recipe, null, { ...adult, special_period: 'pregnancy' });
  assert.equal(normal.suitability_detail.components.find(item => item.key === 'physiology').earned, 10);
  assert.equal(pregnancy.suitability_detail.components.find(item => item.key === 'physiology').earned, 2);
  assert.ok(value(pregnancy, 'suitability') < value(normal, 'suitability'));
});

test('2个月5.8kg幼犬的750g食谱会识别目标冲突和不可执行食量', () => {
  const pet = { ...adult, breed: '史宾格犬', age_months: 2, life_stage: 'puppy', current_weight_kg: 5.8, target_weight_kg: 3.25, activity_level: 'high', neutered: false };
  const report = analyze([{ name: '鸡胸肉', grams: 500 }, { name: '胡萝卜', grams: 100 }, { name: '南瓜', grams: 150 }], null, pet);
  const intake = report.daily_need.intake_feasibility;
  assert.equal(report.daily_need.rer_kcal, 262);
  assert.equal(report.daily_need.daily_kcal, 786);
  assert.equal(report.daily_need.activity_factor, 1);
  assert.equal(report.daily_need.recorded_activity_factor, 1.15);
  assert.equal(report.daily_need.target_adjustment, 1);
  assert.equal(report.daily_need.target_weight_conflict, true);
  assert.equal(intake.daily_food_weight_pct_body_weight, 12.9);
  assert.equal(intake.grams_per_meal, 187.5);
  assert.equal(intake.excessive_volume, true);
  assert.equal(intake.low_energy_density, true);
  assert.ok(intake.estimated_water_pct >= 70);
  assert.ok(codes(report).has('PUPPY_TARGET_WEIGHT_CONFLICT'));
  assert.ok(codes(report).has('EXCESSIVE_DAILY_FOOD_VOLUME'));
  assert.equal(value(report, 'energy'), 0);
  assert.ok(report.daily_need.calorie_match_score > value(report, 'energy'));
});

test('4个月以下幼犬活动量只作观察提示，不重复乘到3倍RER', () => {
  const base = { ...adult, age_months: 3, life_stage: 'puppy', current_weight_kg: 5, target_weight_kg: 7, neutered: false };
  const low = _test.dailyEnergyNeed({ ...base, activity_level: 'low' });
  const high = _test.dailyEnergyNeed({ ...base, activity_level: 'high' });
  assert.equal(low.daily_kcal, high.daily_kcal);
  assert.equal(low.activity_factor, 1);
  assert.equal(high.activity_factor, 1);
  assert.notEqual(low.recorded_activity_factor, high.recorded_activity_factor);
});

test('仅比建议食量多1克不会提示过大，超过20%后才提示', () => {
  const pet = { ...adult, current_weight_kg: 2.5, target_weight_kg: 2.5, neutered: true };
  const need = _test.dailyEnergyNeed(pet);
  const near = _test.intakeFeasibility({ pet, totalWeight: 126, energy: { kcal_per_gram: 1.71 }, need, waterPct: null });
  const boundary = _test.intakeFeasibility({ pet, totalWeight: 150, energy: { kcal_per_gram: 1.71 }, need, waterPct: null });
  const over = _test.intakeFeasibility({ pet, totalWeight: 151, energy: { kcal_per_gram: 1.71 }, need, waterPct: null });
  assert.equal(near.reference_max_daily_grams, 125);
  assert.equal(near.exceeds_reference_by_pct, 0.8);
  assert.equal(near.excessive_volume, false);
  assert.equal(near.score, 100);
  assert.equal(boundary.exceeds_reference_by_pct, 20);
  assert.equal(boundary.excessive_volume, false);
  assert.equal(over.exceeds_reference_by_pct, 20.8);
  assert.equal(over.excessive_volume, true);
});

test('2.5kg成犬126g且能量密度约1.7时完整报告不提示食量过大', () => {
  const pet = { ...adult, current_weight_kg: 2.5, target_weight_kg: 2.5, neutered: true };
  const report = analyze([{ name: '羊肉', grams: 85 }, { name: '胡萝卜', grams: 15 }, { name: '南瓜', grams: 26 }], null, pet);
  assert.equal(report.recipe.total_weight_g, 126);
  assert.ok(report.daily_need.recipe_kcal_per_gram >= 1.7);
  assert.equal(report.daily_need.intake_feasibility.excessive_volume, false);
  assert.ok(!codes(report).has('EXCESSIVE_DAILY_FOOD_VOLUME'));
});

test('当前能量密度已经高于目标时不会继续建议提高密度', () => {
  const pet = { ...adult, current_weight_kg: 2.5, target_weight_kg: 2.5, neutered: true };
  const need = _test.dailyEnergyNeed(pet);
  const result = _test.intakeFeasibility({ pet, totalWeight: 151, energy: { kcal_per_gram: 1.71 }, need, waterPct: null });
  assert.equal(result.needs_higher_density, false);
  assert.ok(result.volume_advice.includes('无需继续提高'));
  assert.ok(!result.volume_advice.includes('将能量密度提高'));
});

test('含水率数据覆盖不足时不输出估算值', () => {
  const macros = _test.calculateMacroNutrition({ pet: adult, ingredients: [{ name: '未知鲜食', grams: 100 }], ingredientMap: {} });
  assert.equal(macros.water_coverage_pct, 0);
  assert.equal(macros.estimated_water_pct, null);
});

test('DeepSeek的null营养值保持缺失状态，不会被Number(null)转成0', () => {
  const [fact] = _test.normalizeIngredientFacts([{
    name: '陌生可食材', is_food: true, dog_safety: 'safe', category: 'unknown',
    kcal_per_100g: null, protein_pct: null, fat_pct: null, carb_pct: null,
  }], ['陌生可食材']);
  assert.equal(fact.kcal_per_100g, null);
  assert.equal(fact.protein_pct, null);
  assert.equal(_test.hasNutritionValues(fact), false);
  const macros = _test.calculateMacroNutrition({ pet: adult, ingredients: [{ name: '陌生可食材', grams: 100 }], ingredientMap: {}, ingredientFacts: [fact] });
  assert.equal(macros.coverage.weight_pct, 0);
  assert.deepEqual(macros.coverage.unknown_ingredients, ['陌生可食材']);
});

test('未知食材第一次无营养值时只复核一次，第二次成功后采用结果', async () => {
  let calls = 0;
  const lookup = async ({ retry }) => {
    calls += 1;
    return { ingredients: [{
      name: '鹿肉粒', is_food: true, dog_safety: 'safe', category: 'protein',
      kcal_per_100g: retry ? 158 : null, protein_pct: retry ? 22 : null,
      fat_pct: retry ? 7 : null, carb_pct: retry ? 0 : null,
      confidence: 'medium', basis: retry ? '复核常见生鹿肉可食部' : '首次未确认',
    }] };
  };
  const result = await _test.lookupIngredientFactsWithRetry([{ name: '鹿肉粒', grams: 100 }], lookup);
  assert.equal(calls, 2);
  assert.deepEqual(result.retried_ingredients, ['鹿肉粒']);
  assert.deepEqual(result.unresolved_ingredients, []);
  assert.equal(result.facts[0].kcal_per_100g, 158);
  assert.equal(result.facts[0].lookup_attempts, 2);
});

test('DeepSeek查询异常也只重试一次并保持未解析，不启用营养兜底', async () => {
  let calls = 0;
  const result = await _test.lookupIngredientFactsWithRetry([{ name: '无法联网食材', grams: 100 }], async () => {
    calls += 1;
    throw new Error('network unavailable');
  });
  assert.equal(calls, 2);
  assert.deepEqual(result.unresolved_ingredients, ['无法联网食材']);
  assert.equal(result.facts[0].nutrition_unresolved, true);
});

test('未知食材两次均为null时提示未计入营养计算且不使用分类兜底', async () => {
  let calls = 0;
  const lookup = async () => {
    calls += 1;
    return { ingredients: [{ name: '神秘鸡肉块', is_food: true, dog_safety: 'safe', category: 'protein', kcal_per_100g: null, protein_pct: null, fat_pct: null, carb_pct: null, confidence: 'low' }] };
  };
  const result = await _test.lookupIngredientFactsWithRetry([{ name: '神秘鸡肉块', grams: 100 }], lookup);
  const report = _test.localCheck({ pet: adult, ingredients: [{ name: '神秘鸡肉块', grams: 100 }], mealIntent: 'long_term', ingredientFacts: result.facts, ingredientMap: {} });
  assert.equal(calls, 2);
  assert.deepEqual(result.unresolved_ingredients, ['神秘鸡肉块']);
  assert.equal(report.daily_need.recipe_kcal, 0);
  assert.equal(report.macro_nutrition.coverage.weight_pct, 0);
  assert.ok(codes(report).has('INGREDIENT_NUTRITION_UNAVAILABLE'));
  assert.ok(report.findings.some(item => item.reason.includes('未计入食品营养值计算')));
});

test('AI确认非食物或犬类不安全食材时直接标红并且不复核营养值', async () => {
  let calls = 0;
  const lookup = async () => {
    calls += 1;
    return { ingredients: [{ name: '彩色聚合颗粒', is_food: false, dog_safety: 'unsafe', category: 'unknown', kcal_per_100g: null, protein_pct: null, fat_pct: null, carb_pct: null, confidence: 'high', basis: '聚合物颗粒不是食物' }] };
  };
  const result = await _test.lookupIngredientFactsWithRetry([{ name: '彩色聚合颗粒', grams: 10 }], lookup);
  const report = _test.localCheck({ pet: adult, ingredients: [{ name: '彩色聚合颗粒', grams: 10 }], ingredientFacts: result.facts, ingredientMap: {} });
  assert.equal(calls, 1);
  assert.ok(codes(report).has('AI_UNSAFE_INGREDIENT'));
  assert.equal(report.daily_need.recipe_kcal, 0);
});

test('疾病适配提示明确建议听从专业医师建议', () => {
  const report = analyze([{ name: '鸡胸肉', grams: 150 }, { name: '米饭', grams: 50 }], null, { ...adult, health_tags: ['肾脏疾病'] });
  const health = report.suitability_detail.components.find(item => item.key === 'health');
  assert.ok(health.adjustment.includes('建议听从专业医师建议'));
  assert.ok(report.findings.some(item => item.title === '需要专业确认' && item.adjustment.includes('建议听从专业医师建议')));
});
