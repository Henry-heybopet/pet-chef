const test = require('node:test');
const assert = require('node:assert/strict');
const { ingredientsDb } = require('../src/data/ingredients_db');
const { buildFreshCheckAnalysis, _test } = require('../src/services/fresh_check');
const { _test: nutritionRepository } = require('../src/services/nutrition_repository');
const { analyzeRecipeIngredients, matchIngredientRecord } = require('../src/services/recipe_ingredient_analysis');

const adult = { id: 'dog-1', name: '姐姐', species: 'dog', age_months: 24, current_weight_kg: 10, activity_level: 'medium', feeding_goal: 'maintenance' };
const analyze = (ingredients, selectedBPack = null, pet = adult) => _test.localCheck({ pet, ingredients, mealIntent: 'long_term', selectedBPack, ingredientMap: ingredientsDb });
const value = (report, key) => report.scores.find(item => item.key === key).value;
const codes = report => new Set(report.findings.map(item => item.code).filter(Boolean));

test('后台食谱按四大类分组、组内降序，内脏计入动物性原料', () => {
  const analysis = analyzeRecipeIngredients({
    南瓜: 20,
    鸡肝: 10,
    鸡小胸: 40,
    菠菜: 15,
    鱼油: 5,
  }, {
    ...ingredientsDb,
    鱼油: { category: 'addition', calories_per_100g: 884 },
  });
  assert.deepEqual(analysis.groups.map(group => group.label), [
    '动物性原料',
    '淀粉类碳水',
    '非淀粉类果蔬',
    '其它',
  ]);
  assert.deepEqual(analysis.groups[0].rows.map(row => row.name), ['鸡小胸', '鸡肝']);
  assert.deepEqual(analysis.groups[1].rows.map(row => row.name), ['南瓜']);
  assert.deepEqual(analysis.groups[2].rows.map(row => row.name), ['菠菜']);
  assert.deepEqual(analysis.groups[3].rows.map(row => row.name), ['鱼油']);
});

test('后台100克能量密度与鲜食验证使用相同食材数据和逐项计算规则', () => {
  const ingredients = [
    { name: '鸡小胸', grams: 50 },
    { name: '南瓜', grams: 30 },
    { name: '菠菜', grams: 20 },
  ];
  const analysis = analyzeRecipeIngredients(
    Object.fromEntries(ingredients.map(item => [item.name, item.grams])),
    ingredientsDb
  );
  const report = analyze(ingredients);
  assert.equal(analysis.energy.kcal_per_gram, report.daily_need.recipe_kcal_per_gram);
  assert.equal(analysis.energy.calories_per_100g, Number((report.daily_need.recipe_kcal_per_gram * 100).toFixed(1)));
  assert.equal(analysis.energy.complete, true);
});

test('未知食材不会按0千卡伪造后台能量密度', () => {
  const analysis = analyzeRecipeIngredients({ 鸡小胸: 50, 未建档食材: 50 }, ingredientsDb);
  assert.equal(analysis.energy.complete, false);
  assert.equal(analysis.energy.calories_per_100g, null);
  assert.deepEqual(analysis.energy.unknown_ingredients, ['未建档食材']);
});

test('350g低肉高碳水配方会被确定性结构规则识别', () => {
  const report = analyze([{ name: '鸡胸肉', grams: 50 }, { name: '胡萝卜', grams: 100 }, { name: '南瓜', grams: 200 }]);
  assert.equal(report.macro_nutrition.ingredient_weight_ratios.animal_protein_pct, 14.3);
  assert.equal(report.macro_nutrition.ingredient_weight_ratios.carb_pct, 57.1);
  assert.equal(report.macro_nutrition.ingredient_weight_ratios.vegetable_pct, 28.6);
  assert.equal(report.macro_nutrition.estimated_grams.protein_g, 15.5);
  assert.equal(report.macro_nutrition.estimated_grams.fat_g, 2);
  assert.equal(report.macro_nutrition.estimated_grams.carb_g, 24);
  assert.ok(codes(report).has('LOW_ANIMAL_PROTEIN'));
  assert.ok(codes(report).has('VERY_HIGH_CARB'));
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
  assert.ok(codes(after).has('VERY_HIGH_CARB'));
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
    fruit_pct: 0,
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
    { id: '兔里脊', name: '兔里脊', category: 'catalog', protein_pct: null, fat_pct: null, calories_per_100g: null },
    { id: '自定义食材', name: '自定义食材', category: 'veg', calories_per_100g: '25.5' },
  ]);
  assert.equal(merged['牛肉'].protein_pct, 26);
  assert.equal(merged['牛肉'].fat_pct, 12);
  assert.equal(merged['牛肉'].calories_per_100g, 213);
  assert.equal(merged['兔里脊'].category, 'protein');
  assert.equal(merged['兔里脊'].protein_pct, 22);
  assert.equal(merged['自定义食材'].calories_per_100g, '25.5');
});

test('规范食谱不会被PostgreSQL的空值或“无”覆盖必配全价营养包', () => {
  const canonical = nutritionRepository.normalizeRecipe({
    id: 'dog_recipe_002',
    name: '鸡肉燕麦经典',
    health_tags: [],
    ingredients: {},
    cooking_profile: {},
    nutrition_snapshot: {},
    b_pack: '无',
  });
  assert.match(canonical.b_pack, /维矿预混料/);
  assert.match(canonical.b_pack, /钙磷/);

  const snapshot = nutritionRepository.normalizeRecipe({
    id: 'dog_recipe_002',
    health_tags: [],
    ingredients: {},
    cooking_profile: {},
    nutrition_snapshot: { b_pack: '数据库营养包B：维矿预混料、钙源' },
    b_pack: '无',
  });
  assert.equal(snapshot.b_pack, '数据库营养包B：维矿预混料、钙源');

  const structured = nutritionRepository.normalizeRecipe({
    id: 'dog_recipe_002',
    health_tags: [],
    ingredients: {},
    cooking_profile: {},
    nutrition_snapshot: {
      b_pack: {
        '成犬维矿预混料（含维生素、矿物质和铁铜锌锰碘硒等微量元素）': 5.7,
        '成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）': 3,
        'Omega-3鱼油或藻油（EPA+DHA必需脂肪酸来源）': 1.3,
      },
    },
  });
  assert.match(structured.b_pack, /成犬钙磷维护矿物粉/);

  const custom = nutritionRepository.normalizeRecipe({
    id: 'custom_recipe_001',
    health_tags: [],
    ingredients: {},
    cooking_profile: {},
    nutrition_snapshot: {},
    b_pack: '无',
  });
  assert.equal(custom.b_pack, '无');

  const report = analyze(
    [
      ['鸡小胸', 202], ['鸡心', 85], ['鸡肝', 63],
      ['红薯', 63], ['南瓜', 57], ['山药', 41],
      ['全熟燕麦片', 25], ['苹果', 57], ['豌豆', 38],
    ].map(([name, grams]) => ({ name, grams })),
    { name: structured.b_pack.split('：')[0], description: structured.b_pack },
    { ...adult, age_months: 3, life_stage: 'puppy', current_weight_kg: 6 }
  );
  assert.equal(report.score_details.nutrition.score, 100);
  assert.equal(report.score_details.nutrition.components.micronutrients, 100);
  assert.equal(report.score_details.nutrition.deductions.some(item => item.code === 'NUTRITION_MICRONUTRIENT_INCOMPLETE'), false);
});

test('B包对象必须明确覆盖钙磷、微量元素和必需脂肪酸', () => {
  assert.match(
    nutritionRepository.validateBPackObject({ 钙粉: 3, 成犬维矿预混料: 5.7, 'Omega-3鱼油或藻油': 1.3 }),
    /磷/
  );
  assert.equal(nutritionRepository.validateBPackObject({
    '成犬维矿预混料（含维生素、矿物质和铁铜锌锰碘硒等微量元素）': 5.7,
    '成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）': 3,
    'Omega-3鱼油或藻油（EPA+DHA必需脂肪酸来源）': 1.3,
  }), '');
});

test('兔里脊通用目录行仍计入动物蛋白结构和蛋白质营养', () => {
  const ingredientMap = nutritionRepository.mergeIngredientRows(ingredientsDb, [
    { id: '兔里脊', name: '兔里脊', category: 'catalog', protein_pct: null, fat_pct: null, calories_per_100g: null },
  ]);
  const report = _test.localCheck({
    pet: { ...adult, age_months: 3, life_stage: 'puppy', current_weight_kg: 5.3 },
    ingredients: [{ name: '兔里脊', grams: 205 }, { name: '南瓜', grams: 117 }, { name: '全熟燕麦片', grams: 117 }, { name: '胡萝卜', grams: 58 }, { name: '菠菜', grams: 47 }, { name: '苹果', grams: 12 }],
    mealIntent: 'long_term',
    selectedBPack: { name: '幼犬成长营养包B', description: '维矿预混料、钙磷矿物粉、Omega-3鱼油或藻油' },
    ingredientMap,
  });
  const rabbit = report.macro_nutrition.details.find(item => item.name === '兔里脊');
  assert.equal(rabbit.category, 'protein');
  assert.equal(rabbit.protein_g, 45.1);
  assert.equal(report.macro_nutrition.ingredient_weight_ratios.animal_protein_pct, 36.9);
  assert.equal(report.macro_nutrition.ingredient_weight_ratios.fruit_pct, 2.2);
  assert.ok(value(report, 'structure') > 20);
});

test('动物性食材按40、45、65、75百分比分段且提示与扣分分离', () => {
  const at39 = analyze([{ name: '鸡胸肉', grams: 39 }, { name: '米饭', grams: 35 }, { name: '胡萝卜', grams: 26 }]);
  const at42 = analyze([{ name: '鸡胸肉', grams: 42 }, { name: '米饭', grams: 33 }, { name: '胡萝卜', grams: 25 }]);
  const at55 = analyze([{ name: '鸡胸肉', grams: 55 }, { name: '米饭', grams: 30 }, { name: '胡萝卜', grams: 15 }]);
  const at70 = analyze([{ name: '鸡胸肉', grams: 70 }, { name: '米饭', grams: 20 }, { name: '胡萝卜', grams: 10 }]);
  const at76 = analyze([{ name: '鸡胸肉', grams: 76 }, { name: '米饭', grams: 14 }, { name: '胡萝卜', grams: 10 }]);

  assert.ok(codes(at39).has('LOW_ANIMAL_PROTEIN'));
  assert.ok(codes(at42).has('ANIMAL_PROTEIN_ACCEPTABLE_REVIEW'));
  assert.ok(!at42.score_details.structure.deductions.some(item => item.code.startsWith('STRUCTURE_ANIMAL_PROTEIN')));
  assert.ok(![...codes(at55)].some(code => code.includes('ANIMAL_PROTEIN')));
  assert.ok(codes(at70).has('HIGH_ANIMAL_PROTEIN_REVIEW'));
  assert.ok(!at70.score_details.structure.deductions.some(item => item.code.startsWith('STRUCTURE_ANIMAL_PROTEIN')));
  assert.ok(codes(at76).has('EXCESSIVE_ANIMAL_PROTEIN'));
  assert.ok(at76.score_details.structure.deductions.some(item => item.code === 'STRUCTURE_ANIMAL_PROTEIN_HIGH'));
});

test('淀粉类碳水按10、15、35、45百分比分段', () => {
  const at5 = analyze([{ name: '鸡胸肉', grams: 70 }, { name: '米饭', grams: 5 }, { name: '胡萝卜', grams: 25 }]);
  const at12 = analyze([{ name: '鸡胸肉', grams: 65 }, { name: '米饭', grams: 12 }, { name: '胡萝卜', grams: 23 }]);
  const at25 = analyze([{ name: '鸡胸肉', grams: 60 }, { name: '米饭', grams: 25 }, { name: '胡萝卜', grams: 15 }]);
  const at40 = analyze([{ name: '鸡胸肉', grams: 50 }, { name: '米饭', grams: 40 }, { name: '胡萝卜', grams: 10 }]);
  const at50 = analyze([{ name: '鸡胸肉', grams: 40 }, { name: '米饭', grams: 50 }, { name: '胡萝卜', grams: 10 }]);

  assert.ok(codes(at5).has('LOW_CARB_FORMULA'));
  assert.ok(codes(at12).has('LOW_CARB'));
  assert.ok(![...codes(at25)].some(code => code.includes('CARB')));
  assert.ok(codes(at40).has('HIGH_CARB'));
  assert.ok(at40.score_details.structure.deductions.some(item => item.code === 'STRUCTURE_CARB_HIGH'));
  assert.ok(codes(at50).has('VERY_HIGH_CARB'));
  assert.ok(at50.score_details.structure.deductions.some(item => item.code === 'STRUCTURE_CARB_VERY_HIGH'));
});

test('非淀粉果蔬和水果按独立区间计算', () => {
  const at4 = analyze([{ name: '鸡胸肉', grams: 65 }, { name: '米饭', grams: 31 }, { name: '胡萝卜', grams: 4 }]);
  const at7 = analyze([{ name: '鸡胸肉', grams: 63 }, { name: '米饭', grams: 30 }, { name: '胡萝卜', grams: 7 }]);
  const at20 = analyze([{ name: '鸡胸肉', grams: 50 }, { name: '米饭', grams: 30 }, { name: '胡萝卜', grams: 15 }, { name: '苹果', grams: 5 }]);
  const at28 = analyze([{ name: '鸡胸肉', grams: 42 }, { name: '米饭', grams: 30 }, { name: '胡萝卜', grams: 25 }, { name: '苹果', grams: 3 }]);
  const at35 = analyze([{ name: '鸡胸肉', grams: 40 }, { name: '米饭', grams: 25 }, { name: '胡萝卜', grams: 30 }, { name: '苹果', grams: 5 }]);
  const fruit10 = analyze([{ name: '鸡胸肉', grams: 55 }, { name: '米饭', grams: 30 }, { name: '胡萝卜', grams: 5 }, { name: '苹果', grams: 10 }]);

  assert.ok(codes(at4).has('LOW_NON_STARCHY_PRODUCE'));
  assert.ok(codes(at7).has('LOW_NON_STARCHY_PRODUCE'));
  assert.equal(at20.macro_nutrition.ingredient_weight_ratios.vegetable_pct, 20);
  assert.equal(at20.macro_nutrition.ingredient_weight_ratios.fruit_pct, 5);
  assert.ok(![...codes(at20)].some(code => ['HIGH_VEGETABLE', 'VERY_HIGH_VEGETABLE', 'HIGH_FRUIT'].includes(code)));
  assert.ok(codes(at28).has('HIGH_VEGETABLE'));
  assert.ok(codes(at35).has('VERY_HIGH_VEGETABLE'));
  assert.equal(fruit10.macro_nutrition.ingredient_weight_ratios.fruit_pct, 10);
  assert.ok(codes(fruit10).has('HIGH_FRUIT'));
  assert.ok(fruit10.score_details.structure.deductions.some(item => item.code === 'STRUCTURE_FRUIT_HIGH'));
});

test('结构分段边界按下一区间起点执行且不发生一克误判', () => {
  const animal = pct => analyze([{ name: '鸡胸肉', grams: pct }, { name: '米饭', grams: (100 - pct) / 2 }, { name: '胡萝卜', grams: (100 - pct) / 2 }]);
  assert.ok(codes(animal(40)).has('ANIMAL_PROTEIN_ACCEPTABLE_REVIEW'));
  assert.ok(![...codes(animal(45))].some(code => code.includes('ANIMAL_PROTEIN')));
  assert.ok(![...codes(animal(65))].some(code => code.includes('ANIMAL_PROTEIN')));
  assert.ok(codes(animal(75)).has('HIGH_ANIMAL_PROTEIN_REVIEW'));

  const carb = pct => analyze([{ name: '鸡胸肉', grams: 50 }, { name: '米饭', grams: pct }, { name: '胡萝卜', grams: 50 - pct }]);
  assert.ok(codes(carb(10)).has('LOW_CARB'));
  assert.ok(![...codes(carb(15))].some(code => ['LOW_CARB_FORMULA', 'LOW_CARB', 'HIGH_CARB', 'VERY_HIGH_CARB'].includes(code)));
  assert.ok(![...codes(carb(35))].some(code => ['LOW_CARB_FORMULA', 'LOW_CARB', 'HIGH_CARB', 'VERY_HIGH_CARB'].includes(code)));
  assert.ok(codes(carb(45)).has('HIGH_CARB'));

  const produce = pct => analyze([{ name: '鸡胸肉', grams: 50 }, { name: '米饭', grams: 50 - pct }, { name: '胡萝卜', grams: pct }]);
  assert.ok(codes(produce(5)).has('LOW_NON_STARCHY_PRODUCE'));
  assert.ok(!codes(produce(10)).has('LOW_NON_STARCHY_PRODUCE'));
  assert.ok(![...codes(produce(25))].some(code => ['HIGH_VEGETABLE', 'VERY_HIGH_VEGETABLE'].includes(code)));
  assert.ok(codes(produce(30)).has('HIGH_VEGETABLE'));

  const fruit5 = analyze([{ name: '鸡胸肉', grams: 50 }, { name: '米饭', grams: 30 }, { name: '胡萝卜', grams: 15 }, { name: '苹果', grams: 5 }]);
  assert.ok(!codes(fruit5).has('HIGH_FRUIT'));
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

test('明确含Omega-3鱼油或藻油的必配全价营养包覆盖必需脂肪酸来源', () => {
  const report = analyze(
    [{ name: '鸡胸肉', grams: 220 }, { name: '米饭', grams: 55 }, { name: '胡萝卜', grams: 40 }],
    { name: '成犬维护营养包B', description: '维矿预混料、钙磷矿物粉、Omega-3鱼油或藻油' }
  );
  assert.equal(codes(report).has('ESSENTIAL_FATTY_ACID_SOURCE_MISSING'), false);
  const applied = report.findings.find(item => item.code === 'B_PACK_APPLIED');
  assert.ok(applied.facts.coverage_codes.includes('fatty_acids'));
});

test('雷达低分解释与当前食谱分项计算使用同一份确定性数据', () => {
  const puppy = { ...adult, age_months: 3.6, life_stage: 'puppy', current_weight_kg: 5.3, activity_level: 'high', neutered: false };
  const report = analyze(
    [{ name: '鸡小胸', grams: 35 }, { name: '鸡心', grams: 10 }, { name: '全熟燕麦片', grams: 20 }, { name: '红薯', grams: 15 }, { name: '西兰花', grams: 10 }, { name: '蓝莓', grams: 5 }],
    { name: '幼犬成长营养包B', description: '维矿预混料、钙磷矿物粉、Omega-3鱼油或藻油' },
    puppy
  );
  assert.equal(report.score_details.nutrition.score, value(report, 'nutrition'));
  assert.equal(report.score_details.structure.score, value(report, 'structure'));
  assert.equal(report.score_details.long_term.score, value(report, 'long_term'));
  assert.equal(report.score_details.nutrition.components.protein, 100);
  assert.ok(report.score_details.nutrition.components.fat < 100);
  assert.equal(report.score_details.nutrition.components.micronutrients, 100);
  assert.ok(report.score_details.nutrition.deductions.some(item => item.code === 'NUTRITION_FAT_BELOW_STAGE'));
  assert.ok(report.score_details.structure.deductions.length > 0);
  assert.ok(report.score_details.long_term.limiting_factors.length > 0);
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

test('未知语言食材有营养但安全结论不确定时只复核一次', async () => {
  let calls = 0;
  const lookup = async ({ ingredients, retry }) => {
    calls += 1;
    return { ingredients: [{
      input_id: ingredients[0].input_id,
      name: retry ? '蜂蜜' : 'honey',
      is_food: true,
      dog_safety: retry ? 'safe' : 'uncertain',
      category: 'carb',
      kcal_per_100g: 304,
      protein_pct: 0.3,
      fat_pct: 0,
      carb_pct: 82.4,
      confidence: 'high',
      basis: retry ? '复核常见蜂蜜' : '首次安全结论不确定',
    }] };
  };
  const result = await _test.lookupIngredientFactsWithRetry([{ name: 'honey', grams: 56 }], lookup);
  assert.equal(calls, 2);
  assert.deepEqual(result.retried_ingredients, ['honey']);
  assert.equal(result.facts[0].name, 'honey');
  assert.equal(result.facts[0].is_food, true);
  assert.equal(result.facts[0].dog_safety, 'safe');
  assert.equal(result.facts[0].kcal_per_100g, 304);
  assert.equal(result.facts[0].nutrition_unresolved, false);
});

test('两次AI核验冲突时保留更保守的食物与犬类安全结论', async () => {
  let calls = 0;
  const lookup = async ({ ingredients, retry }) => {
    calls += 1;
    return { ingredients: [{
      input_id: ingredients[0].input_id,
      name: 'translated ingredient',
      is_food: retry ? false : true,
      dog_safety: retry ? 'unsafe' : 'safe',
      category: 'unknown',
      kcal_per_100g: null,
      protein_pct: null,
      fat_pct: null,
      carb_pct: null,
      confidence: 'medium',
      basis: retry ? '复核判定不可食用' : '首次结论',
    }] };
  };
  const result = await _test.lookupIngredientFactsWithRetry([{ name: 'unknown item', grams: 10 }], lookup);
  assert.equal(calls, 2);
  assert.equal(result.facts[0].is_food, false);
  assert.equal(result.facts[0].dog_safety, 'unsafe');
  assert.equal(result.facts[0].nutrition_unresolved, false);
});

test('安全与营养结论均完整时不产生额外AI调用', async () => {
  let calls = 0;
  const lookup = async ({ ingredients }) => {
    calls += 1;
    return { ingredients: [{
      input_id: ingredients[0].input_id,
      name: 'known food',
      is_food: true,
      dog_safety: 'safe',
      category: 'carb',
      kcal_per_100g: 100,
      protein_pct: 1,
      fat_pct: 1,
      carb_pct: 20,
      confidence: 'high',
      basis: '完整数据',
    }] };
  };
  const result = await _test.lookupIngredientFactsWithRetry([{ name: 'known food', grams: 20 }], lookup);
  assert.equal(calls, 1);
  assert.deepEqual(result.retried_ingredients, []);
  assert.equal(result.facts[0].dog_safety, 'safe');
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
  assert.equal(result.status, 'service_unavailable');
});

test('AI食材结果按稳定input_id对齐并保留用户输入的原始语言名称', async () => {
  const lookup = async ({ ingredients }) => ({
    ingredients: ingredients.map(item => ({
      input_id: item.input_id,
      name: '胡萝卜',
      is_food: true,
      dog_safety: 'safe',
      category: 'vegetable',
      kcal_per_100g: 41,
      protein_pct: 0.9,
      fat_pct: 0.2,
      carb_pct: 9.6,
      confidence: 'high',
      basis: '生胡萝卜可食部',
    })),
  });
  const result = await _test.lookupIngredientFactsWithRetry([{ name: 'Carrots', grams: 100 }], lookup);
  assert.equal(result.status, 'available');
  assert.equal(result.facts[0].input_id, 'ingredient_1');
  assert.equal(result.facts[0].name, 'Carrots');
  assert.equal(result.facts[0].category, 'vegetable');
});

test('AI食材服务失败只显示一次服务异常，不把每种食材伪装成安全性不确定', async () => {
  const ingredients = [{ name: 'Carrots', grams: 50 }, { name: 'Foie de bœuf', grams: 50 }];
  const lookup = await _test.lookupIngredientFactsWithRetry(ingredients, async () => {
    const error = new Error('timeout');
    error.code = 'ECONNABORTED';
    throw error;
  });
  const report = _test.localCheck({
    pet: adult,
    ingredients,
    ingredientFacts: lookup.facts,
    ingredientMap: {},
    ingredientLookupStatus: lookup.status,
  });
  assert.equal(codes(report).has('INGREDIENT_LOOKUP_SERVICE_UNAVAILABLE'), true);
  assert.equal(report.findings.filter(item => item.code === 'INGREDIENT_LOOKUP_SERVICE_UNAVAILABLE').length, 1);
  assert.equal(report.findings.some(item => item.code === 'INGREDIENT_SAFETY_UNCERTAIN'), false);
  assert.equal(report.findings.some(item => item.code === 'INGREDIENT_NUTRITION_UNAVAILABLE'), false);
});

test('审核后的英法食材别名优先命中本地确定性食材记录', () => {
  const canonical = {
    胡萝卜: { category: 'veg', calories_per_100g: 41, protein_pct: 0.9, fat_pct: 0.2, carb_pct: 9.6 },
    牛肝: { category: 'organ', calories_per_100g: 135, protein_pct: 20, fat_pct: 3.6, carb_pct: 5 },
    鱼油: { category: 'addition', calories_per_100g: 884, protein_pct: 0, fat_pct: 100, carb_pct: 0 },
    米饭: { category: 'carb', calories_per_100g: 130, protein_pct: 2.7, fat_pct: 0.3, carb_pct: 28 },
    鸡蛋: { category: 'protein', calories_per_100g: 155, protein_pct: 13, fat_pct: 11, carb_pct: 1.1 },
    鸡肉: { category: 'protein', calories_per_100g: 165, protein_pct: 31, fat_pct: 3.6, carb_pct: 0 },
  };
  const aliases = nutritionRepository.mergeIngredientAliases(canonical, [
    { canonical_name: '胡萝卜', locale: 'en', alias_name: 'Carrot' },
    { canonical_name: '胡萝卜', locale: 'fr', alias_name: 'Carotte' },
    { canonical_name: '牛肝', locale: 'en', alias_name: 'Beef Liver' },
    { canonical_name: '牛肝', locale: 'fr', alias_name: 'Foie de bœuf' },
    { canonical_name: '鱼油', locale: 'en', alias_name: 'Fish Oil' },
    { canonical_name: '米饭', locale: 'en', alias_name: 'Rice' },
    { canonical_name: '鸡蛋', locale: 'en', alias_name: 'Egg' },
    { canonical_name: '鸡肉', locale: 'en', alias_name: 'Chicken' },
  ]);
  assert.equal(matchIngredientRecord('Carrots', aliases).record.canonical_name, '胡萝卜');
  assert.equal(matchIngredientRecord('carottes', aliases).record.canonical_name, '胡萝卜');
  assert.equal(matchIngredientRecord('Uncooked Beef Liver', aliases).record.canonical_name, '牛肝');
  assert.equal(matchIngredientRecord('Foie de bœuf cru', aliases).record.canonical_name, '牛肝');
  assert.equal(matchIngredientRecord('Fish Oil', aliases).record.canonical_name, '鱼油');
  assert.equal(matchIngredientRecord('Raw Basmati White Rice (from India)', aliases).record.canonical_name, '米饭');
  assert.equal(matchIngredientRecord('Chicken Eggs', aliases).record.canonical_name, '鸡蛋');
  assert.equal(matchIngredientRecord('Scarotte powder', aliases), null);

  const fatReport = _test.localCheck({
    pet: adult,
    ingredients: [{ name: 'Fish Oil', grams: 5 }],
    ingredientFacts: [],
    ingredientMap: aliases,
  });
  assert.equal(fatReport.macro_nutrition.ingredient_weight_ratios.fat_source_pct, 100);

  const ambiguous = nutritionRepository.mergeIngredientAliases(canonical, [
    { canonical_name: '胡萝卜', locale: 'en', alias_name: 'Shared Food' },
    { canonical_name: '牛肝', locale: 'en', alias_name: 'shared food' },
  ]);
  assert.equal(matchIngredientRecord('Shared Food', ambiguous), null);
});

test('非中文内脏和脂肪采用标准category参与食谱结构计算', () => {
  const ingredients = [{ name: 'Foie de bœuf', grams: 30 }, { name: 'Fish Oil', grams: 5 }];
  const facts = [
    { name: 'Foie de bœuf', is_food: true, dog_safety: 'safe', category: 'organ', kcal_per_100g: 135, protein_pct: 20, fat_pct: 3.6, carb_pct: 5 },
    { name: 'Fish Oil', is_food: true, dog_safety: 'safe', category: 'fat', kcal_per_100g: 884, protein_pct: 0, fat_pct: 100, carb_pct: 0 },
  ];
  const report = _test.localCheck({ pet: adult, ingredients, ingredientFacts: facts, ingredientMap: {} });
  assert.equal(report.macro_nutrition.ingredient_weight_ratios.organ_pct, 85.7);
  assert.equal(report.macro_nutrition.ingredient_weight_ratios.fat_source_pct, 14.3);
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

test('饮用水使用确定性安全事实且不会触发AI不可用红线', () => {
  for (const name of ['水', '清水', '饮用水', '纯净水', '矿泉水', 'Water', ' WATER ']) {
    const fact = _test.deterministicIngredientFact({ name });
    assert.equal(fact.is_food, true, name);
    assert.equal(fact.dog_safety, 'safe', name);
    assert.equal(fact.category, 'addition', name);
    assert.equal(fact.kcal_per_100g, 0, name);
    assert.equal(fact.water_pct, 100, name);

    const report = _test.localCheck({
      pet: adult,
      ingredients: [{ name: name.trim(), grams: 100 }],
      ingredientFacts: [{ ...fact, name: name.trim() }],
      ingredientMap: {},
    });
    assert.equal(codes(report).has('AI_UNSAFE_INGREDIENT'), false, name);
    assert.notEqual(report.macro_nutrition.details[0].source, 'excluded', name);
    assert.equal(report.macro_nutrition.coverage.weight_pct, 100, name);
    assert.equal(report.daily_need.recipe_kcal, 0, name);
  }
});

test('饮用水规则使用全词匹配，不会把水牛肉当作水', () => {
  assert.equal(_test.deterministicIngredientFact({ name: '水牛肉' }), null);
});

test('饮用水在完整分析链路中不会提交给AI食材核验', async () => {
  let lookupCalls = 0;
  const report = await buildFreshCheckAnalysis({
    pet: adult,
    ingredients: [{ name: 'Water', grams: 100 }],
    meal_intent: 'long_term',
  }, {
    lookupFreshCheckIngredientFacts: async () => {
      lookupCalls += 1;
      return { ingredients: [] };
    },
  });

  assert.equal(lookupCalls, 0);
  assert.deepEqual(report.energy_lookup.queried_ingredients, []);
  assert.equal(codes(report).has('AI_UNSAFE_INGREDIENT'), false);
  assert.equal(report.macro_nutrition.coverage.weight_pct, 100);
});

test('疾病适配提示明确建议听从专业医师建议', () => {
  const report = analyze([{ name: '鸡胸肉', grams: 150 }, { name: '米饭', grams: 50 }], null, { ...adult, health_tags: ['肾脏疾病'] });
  const health = report.suitability_detail.components.find(item => item.key === 'health');
  assert.ok(health.adjustment.includes('建议听从专业医师建议'));
  assert.ok(report.findings.some(item => item.title === '需要专业确认' && item.adjustment.includes('建议听从专业医师建议')));
});

test('宠物适配性扣分提供分项得分、宏量适配和健康标签事实', () => {
  const report = analyze(
    [{ name: '金枪鱼白肉', grams: 100 }, { name: '米饭', grams: 100 }],
    null,
    {
      ...adult,
      current_weight_kg: 7.5,
      target_weight_kg: 7,
      health_tags: ['obesity', 'kidney'],
      feeding_goal: 'weight_loss',
      activity_level: 'low',
      neutered: true,
    }
  );
  const deductions = report.score_details.suitability.deductions;
  const stage = deductions.find(item => item.code === 'LIFE_STAGE_MACRO_CHECK');
  const health = deductions.find(item => item.code === 'HEALTH_CONSTRAINTS_REVIEWED');

  assert.equal(stage.facts.component_max, 20);
  assert.ok(Number.isFinite(stage.facts.component_earned));
  assert.ok(Number.isFinite(stage.facts.protein_score));
  assert.ok(Number.isFinite(stage.facts.fat_score));
  assert.deepEqual(health.facts.health_tags, ['obesity', 'kidney']);
  assert.equal(health.facts.component_earned, 12);
  assert.equal(health.facts.component_max, 20);
});
