const { analyzeFreshCheck, lookupFreshCheckIngredientFacts, recognizeFreshCheckRecipe } = require('./deepseek');
const { listBPackOptions, getIngredientMap } = require('./nutrition_repository');
const { breedsDb } = require('../data/breeds_db');
const { dailyEnergyNeed } = require('./nutrition_energy');
const { matchIngredientRecord } = require('./recipe_ingredient_analysis');

const FORBIDDEN = ['木糖醇', '巧克力', '可可', '咖啡', '咖啡因', '酒精', '葡萄', '葡萄干', '洋葱', '大蒜', '韭菜', '葱', '夏威夷果', '牛油果', '熟骨', '骨头', '尖锐骨'];
const INEDIBLE = ['石头', '石块', '铁钉', '钉子', '玻璃', '塑料', '金属', '电池', '硬币', '磁铁', '木头', '水泥', '清洁剂', '洗衣液', '漂白剂', '玩具', '纸巾', '衣服'];
const SEASONINGS = ['盐', '酱油', '蚝油', '辣椒', '火锅底料', '调味料', '腌料'];
const PROTEIN = ['鸡', '牛', '羊', '猪', '鱼', '虾', '蛋', '肉'];
const ORGAN = ['肝', '肾', '心', '肚', '胗'];
const CARB = ['米', '饭', '薯', '土豆', '南瓜', '燕麦', '藜麦', '玉米'];
const VEGETABLE = ['菜', '萝卜', '西兰花', '菠菜', '蓝莓', '苹果', '黄瓜', '西葫芦'];
const FRUIT = ['苹果', '蓝莓', '草莓', '蔓越莓', '覆盆子', '黑莓', '梨', '香蕉', '西瓜', '哈密瓜', '桃', '芒果', '木瓜'];
const FAT = ['鱼油', '橄榄油', '亚麻籽油'];
const CALCIUM = ['钙', '蛋壳粉', '骨粉', '营养包'];
const B_PACK_CATEGORIES = ['幼犬通用', '控钙幼犬（大型幼犬）', '成犬通用', '老年犬通用', '美毛护肤', '低敏单一蛋白', '护肝'];
const PLAIN_WATER_NAMES = new Set(['水', '清水', '饮用水', '纯净水', '矿泉水', 'water']);
const B_PACK_CATEGORY_CODES = {
  幼犬通用: 'PUPPY_GENERAL', '控钙幼犬（大型幼犬）': 'LARGE_PUPPY_CONTROLLED_CALCIUM',
  成犬通用: 'ADULT_GENERAL', 老年犬通用: 'SENIOR_GENERAL', 美毛护肤: 'COAT_CARE',
  低敏单一蛋白: 'HYPOALLERGENIC_SINGLE_PROTEIN', 护肝: 'LIVER_SUPPORT',
};
const INGREDIENT_IDS = {
  '木糖醇': 'xylitol', '巧克力': 'chocolate', '可可': 'cocoa', '咖啡': 'coffee', '咖啡因': 'caffeine',
  '酒精': 'alcohol', '葡萄': 'grape', '葡萄干': 'raisin', '洋葱': 'onion', '大蒜': 'garlic',
  '韭菜': 'chive', '葱': 'scallion', '夏威夷果': 'macadamia', '牛油果': 'avocado',
};
const ADJUSTMENT_CODES = {
  INEDIBLE: 'REMOVE_INGREDIENT',
  FORBIDDEN: 'REMOVE_INGREDIENT',
  AI_UNSAFE_INGREDIENT: 'REMOVE_INGREDIENT',
  INGREDIENT_SAFETY_UNCERTAIN: 'VERIFY_INGREDIENT',
  INGREDIENT_LOOKUP_SERVICE_UNAVAILABLE: 'RETRY_ANALYSIS',
  PET_FOOD_CONFLICT: 'REMOVE_INGREDIENT',
  SEASONING_RISK: 'REPLACE_UNSEASONED_INGREDIENT',
  PROFESSIONAL_CONFIRMATION_REQUIRED: 'CONSULT_PROFESSIONAL',
};

const clean = value => String(value || '').trim();
const has = (name, terms) => terms.some(term => name.includes(term));
const score = (value) => Math.max(0, Math.min(100, Math.round(value)));
const isDeterministicDanger = name => has(name, FORBIDDEN) || has(name, INEDIBLE);
const isPlainWater = name => PLAIN_WATER_NAMES.has(clean(name).toLowerCase());

function deterministicIngredientFact(item) {
  if (!isPlainWater(item?.name)) return null;
  return {
    name: clean(item.name),
    is_food: true,
    dog_safety: 'safe',
    category: 'addition',
    kcal_per_100g: 0,
    protein_pct: 0,
    fat_pct: 0,
    carb_pct: 0,
    water_pct: 100,
    confidence: 'high',
    basis: '饮用水是安全的烹饪添加用水',
    lookup_attempts: 0,
    nutrition_unresolved: false,
  };
}

function nullableNumber(value, min, max) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function hasNutritionValues(fact) {
  return fact?.kcal_per_100g !== null
    && [fact?.protein_pct, fact?.fat_pct, fact?.carb_pct].some(value => value !== null);
}

function bPackCoverage(description) {
  const text = clean(description);
  return {
    vitamins: /维生素|维矿|预混/.test(text),
    minerals: /矿物|维矿|预混|钙磷/.test(text),
    calcium: /钙/.test(text),
    phosphorus: /磷|ca\s*:\s*p/i.test(text),
    trace_minerals: /微量元素|维矿|预混|铁|铜|锌|锰|碘|硒/.test(text),
    fatty_acids: /omega[-\s]?3|鱼油|藻油|dha|epa|脂肪酸/i.test(text),
  };
}

function bPackApplication(totalWeight) {
  return {
    dose_grams: Number((totalWeight * 0.1).toFixed(1)),
    basis: '每100克食材配10克全价营养包',
    basis_code: 'B_PACK_DOSE_10_PERCENT_POST_COOK',
    facts: { grams_per_100g: 10, total_weight_g: totalWeight },
    timing: 'post_cook',
    excluded_from_recipe_weight: true,
    excluded_from_macros: true,
    excluded_from_energy: true,
    excluded_from_cooking: true,
  };
}

function selectBPackOption(options, requestedCategory) {
  const requested = clean(requestedCategory);
  if (!requested) return null;
  return options.find(option => option.category_code === requested || option.category === requested) || null;
}

function normalizeIngredients(items = []) {
  return items.map(item => ({ name: clean(item?.name), grams: Number(item?.grams || item?.weight_g || 0) }))
    .filter(item => item.name && Number.isFinite(item.grams) && item.grams > 0 && item.grams <= 5000);
}

function ingredientId(name) {
  const match = Object.entries(INGREDIENT_IDS).find(([label]) => clean(name).includes(label));
  return match?.[1] || null;
}

function finding(level, title, reason, adjustment, code, domain = 'nutrition', facts = {}) {
  if (!code) throw new Error(`Fresh Check finding code is required: ${title}`);
  return {
    level,
    title,
    reason,
    adjustment,
    code,
    domain,
    risk_code: code,
    risk_level: level,
    ingredient_id: facts.ingredient_id || null,
    adjustment_code: ADJUSTMENT_CODES[code] || `REVIEW_${code}`,
    facts,
  };
}

function petLifeStage(pet) {
  const months = Number(pet.age_months || 0);
  if (pet.life_stage === 'puppy' || (months > 0 && months < 12)) return 'puppy';
  if (pet.life_stage === 'senior' || months >= 96) return 'senior';
  return 'adult';
}

function petBodySize(pet) {
  if (pet.body_size) return pet.body_size;
  const breed = clean(pet.breed).toLowerCase();
  if (!breed) return null;
  const match = breedsDb.find(item => [item.id, item.name, item.name_en].filter(Boolean).some(value => {
    const candidate = clean(value).toLowerCase();
    return candidate === breed || candidate.includes(breed) || breed.includes(candidate);
  }));
  return match?.size || null;
}

function includesAny(value, terms) {
  const text = clean(value).toLowerCase();
  return terms.some(term => text.includes(term));
}

function recommendedBPackCategory(pet) {
  const stage = petLifeStage(pet);
  if (stage === 'puppy') return ['large', 'giant'].includes(petBodySize(pet)) ? '控钙幼犬（大型幼犬）' : '幼犬通用';
  if (stage === 'senior') return '老年犬通用';
  const healthText = (pet.health_tags || []).join('、');
  if (includesAny(healthText, ['liver', '肝脏', '护肝'])) return '护肝';
  if ((pet.allergens || []).length || (pet.food_restrictions || []).length || (pet.allergy_symptoms || []).length || pet.allergy_severity || includesAny(healthText, ['allergy', '过敏', '低敏'])) return '低敏单一蛋白';
  if (pet.feeding_goal === 'coat_care' || includesAny(healthText, ['coat', '皮毛', '皮肤', '美毛', 'dermatological'])) return '美毛护肤';
  return '成犬通用';
}

function bPackEligibility(pet, category) {
  const stage = petLifeStage(pet);
  const healthText = (pet.health_tags || []).join('、');
  const largePuppy = ['large', 'giant'].includes(petBodySize(pet));
  const hasAllergyNeed = (pet.allergens || []).length > 0 || (pet.food_restrictions || []).length > 0 || (pet.allergy_symptoms || []).length > 0 || Boolean(pet.allergy_severity) || includesAny(healthText, ['allergy', '过敏', '低敏']);
  const hasLiverNeed = includesAny(healthText, ['liver', '肝脏', '护肝']);
  const hasCoatNeed = includesAny(healthText, ['coat', '皮毛', '皮肤', '美毛', 'dermatological']) || pet.feeding_goal === 'coat_care';

  const facts = { stage_code: stage, body_size_code: petBodySize(pet), category_code: B_PACK_CATEGORY_CODES[category] || 'UNKNOWN' };
  const eligibility = (enabled, reason, reason_code) => ({ enabled, recommended: false, reason, reason_code, facts });
  if (pet.species && pet.species !== 'dog') return eligibility(false, '当前B全价营养包仅适用于犬类。', 'B_PACK_DOG_ONLY');
  if (['pregnancy', 'lactation'].includes(pet.special_period)) return eligibility(false, '妊娠或哺乳期需要专用方案，当前7个营养包均不可选。', 'B_PACK_PREGNANCY_LACTATION_UNAVAILABLE');

  if (stage === 'puppy') {
    const allowed = largePuppy ? '控钙幼犬（大型幼犬）' : '幼犬通用';
    return category === allowed
      ? eligibility(true, largePuppy ? '符合大型/巨型幼犬成长阶段。' : '符合当前幼犬成长阶段。', largePuppy ? 'B_PACK_LARGE_PUPPY_ELIGIBLE' : 'B_PACK_PUPPY_ELIGIBLE')
      : eligibility(false, category.includes('幼犬') ? '该营养包不符合当前幼犬体型。' : '幼犬不能使用成犬、老年犬或成犬功能型营养包。', category.includes('幼犬') ? 'B_PACK_PUPPY_SIZE_MISMATCH' : 'B_PACK_PUPPY_STAGE_MISMATCH');
  }

  if (stage === 'senior') {
    return category === '老年犬通用'
      ? eligibility(true, '符合当前老年犬生命阶段。', 'B_PACK_SENIOR_ELIGIBLE')
      : eligibility(false, '当前为老年犬，仅可选择老年犬专用全价营养包。', 'B_PACK_SENIOR_ONLY');
  }

  if (category === '成犬通用') return eligibility(true, '适用于成年犬日常维持。', 'B_PACK_ADULT_ELIGIBLE');
  if (category === '美毛护肤') return eligibility(hasCoatNeed, hasCoatNeed ? '符合美毛或皮肤护理需求。' : '宠物档案没有美毛或皮肤护理需求。', hasCoatNeed ? 'B_PACK_COAT_ELIGIBLE' : 'B_PACK_COAT_NOT_ELIGIBLE');
  if (category === '低敏单一蛋白') return eligibility(hasAllergyNeed, hasAllergyNeed ? '符合过敏或低敏记录。' : '宠物档案没有过敏或低敏记录。', hasAllergyNeed ? 'B_PACK_ALLERGY_ELIGIBLE' : 'B_PACK_ALLERGY_NOT_ELIGIBLE');
  if (category === '护肝') return eligibility(hasLiverNeed, hasLiverNeed ? '符合肝脏健康记录。' : '宠物档案没有肝脏健康记录。', hasLiverNeed ? 'B_PACK_LIVER_ELIGIBLE' : 'B_PACK_LIVER_NOT_ELIGIBLE');
  return eligibility(false, '该营养包不符合当前成年犬生命阶段。', 'B_PACK_ADULT_STAGE_MISMATCH');
}

async function getFreshCheckBPackOptions(pet) {
  const { options, source } = await listBPackOptions();
  const recommendation = recommendedBPackCategory(pet);
  const byCategory = new Map(options.filter(option => B_PACK_CATEGORIES.includes(option.category)).map(option => {
    const eligibility = bPackEligibility(pet, option.category);
    const dataConflict = option.data_conflict;
    return [option.category, {
      category: option.category,
      category_code: B_PACK_CATEGORY_CODES[option.category] || 'UNKNOWN',
      name: clean(option.b_pack).split('：')[0],
      description: clean(option.b_pack),
      coverage: bPackCoverage(option.b_pack),
      ...eligibility,
      enabled: dataConflict ? false : eligibility.enabled,
      recommended: !dataConflict && eligibility.enabled && option.category === recommendation,
      reason: dataConflict ? '数据库中该分类存在多个不同营养包，请管理员先确认。' : eligibility.reason,
      reason_code: dataConflict ? 'B_PACK_DATA_CONFLICT' : eligibility.reason_code,
      facts: eligibility.facts,
    }];
  }));
  return { source, options: B_PACK_CATEGORIES.map(category => byCategory.get(category)).filter(Boolean) };
}

function classifyRecipe(items, ingredientMap = {}, ingredientFacts = []) {
  const categories = { protein: [], organ: [], carb: [], vegetable: [], fruit: [], fat: [], calcium: [] };
  const facts = new Map(ingredientFacts.map(item => [item.name, item]));
  items.forEach(item => {
    const local = matchIngredientRecord(item.name, ingredientMap);
    const record = local?.record || facts.get(item.name) || {};
    const category = canonicalCategory(item.name, record);
    const semanticName = record.canonical_name || item.name;
    if (category === 'organ') categories.organ.push(item);
    else if (category === 'protein') categories.protein.push(item);
    else if (category === 'carb') categories.carb.push(item);
    else if (category === 'fruit') {
      categories.fruit.push(item);
      categories.vegetable.push(item);
    } else if (category === 'vegetable') categories.vegetable.push(item);
    if (category === 'fat') categories.fat.push(item);
    if (has(semanticName, CALCIUM)) categories.calcium.push(item);
  });
  return categories;
}

function canonicalCategory(name, record = {}) {
  const semanticName = record.canonical_name || name;
  if (record.category === 'organ' || has(semanticName, ORGAN)) return 'organ';
  if (record.category === 'fat' || has(semanticName, FAT)) return 'fat';
  if (record.category === 'protein' || has(semanticName, PROTEIN)) return 'protein';
  if (record.category === 'carb' || has(semanticName, CARB)) return 'carb';
  if (record.category === 'fruit' || has(semanticName, FRUIT)) return 'fruit';
  if (['veg', 'vegetable'].includes(record.category) || has(semanticName, VEGETABLE)) return 'vegetable';
  return 'other';
}

function macroStandard(pet) {
  const months = Number(pet.age_months || 0);
  const stage = petLifeStage(pet);
  if (stage === 'puppy') return { stage: months > 0 && months < 3.5 ? 'early_growth' : 'late_growth', protein_min_g_per_1000kcal: months > 0 && months < 3.5 ? 62.5 : 50, fat_min_g_per_1000kcal: 21.25 };
  return { stage: stage === 'senior' ? 'senior_adult_baseline' : 'adult', protein_min_g_per_1000kcal: 52.1, fat_min_g_per_1000kcal: 13.75 };
}

function calculateMacroNutrition({ pet, ingredients, ingredientMap = {}, ingredientFacts = [] }) {
  const facts = new Map(ingredientFacts.map(item => [item.name, item]));
  const total = ingredients.reduce((sum, item) => sum + item.grams, 0);
  const totals = { animal_protein_g: 0, organ_g: 0, carb_ingredient_g: 0, vegetable_g: 0, fruit_g: 0, fat_source_g: 0, fat_containing_g: 0, protein_g: 0, fat_g: 0, carb_g: 0, water_g: 0, kcal: 0, covered_g: 0, water_covered_g: 0 };
  const details = ingredients.map(item => {
    const local = matchIngredientRecord(item.name, ingredientMap);
    const ai = facts.get(item.name);
    const record = local?.record || ai || {};
    const category = canonicalCategory(item.name, record);
    const kcalPer100 = nullableNumber(record.calories_per_100g ?? record.kcal_per_100g, 0, 900);
    const proteinPct = nullableNumber(record.protein_pct, 0, 100);
    const fatPct = nullableNumber(record.fat_pct ?? (category === 'fat' ? 100 : null), 0, 100);
    const carbPct = nullableNumber(record.carb_pct, 0, 100);
    const rawWaterPct = nullableNumber(record.water_pct, 0, 100);
    const waterFraction = rawWaterPct === null ? null : (rawWaterPct <= 1 ? rawWaterPct : rawWaterPct / 100);
    const unsafe = isDeterministicDanger(item.name) || ai?.is_food === false || ai?.dog_safety === 'unsafe' || ai?.dog_safety === 'uncertain';
    const categoryKnown = !unsafe && category !== 'other';
    const known = !unsafe && !ai?.nutrition_unresolved && kcalPer100 !== null && [proteinPct, fatPct, carbPct].some(value => value !== null);
    const nutrient = {
      protein_g: known && proteinPct !== null ? item.grams * proteinPct / 100 : 0,
      fat_g: known && fatPct !== null ? item.grams * fatPct / 100 : 0,
      carb_g: known && carbPct !== null ? item.grams * carbPct / 100 : 0,
      kcal: known ? item.grams * kcalPer100 / 100 : 0,
    };
    if (categoryKnown && ['protein', 'organ'].includes(category)) totals.animal_protein_g += item.grams;
    if (categoryKnown && category === 'organ') totals.organ_g += item.grams;
    if (categoryKnown && category === 'carb') totals.carb_ingredient_g += item.grams;
    if (categoryKnown && ['vegetable', 'fruit'].includes(category)) totals.vegetable_g += item.grams;
    if (categoryKnown && category === 'fruit') totals.fruit_g += item.grams;
    if (categoryKnown && category === 'fat') totals.fat_source_g += item.grams;
    if (known && fatPct > 0) totals.fat_containing_g += item.grams;
    totals.protein_g += nutrient.protein_g; totals.fat_g += nutrient.fat_g; totals.carb_g += nutrient.carb_g; totals.kcal += nutrient.kcal;
    if (known && waterFraction !== null) { totals.water_g += item.grams * waterFraction; totals.water_covered_g += item.grams; }
    if (known) totals.covered_g += item.grams;
    return { name: item.name, grams: item.grams, matched_name: local?.key || null, category, source: known ? (local ? 'ingredient_database' : 'deepseek') : unsafe ? 'excluded' : 'unresolved', ...nutrient };
  });
  const pct = value => total ? Number((value / total * 100).toFixed(1)) : 0;
  const per1000 = value => totals.kcal ? Number((value / totals.kcal * 1000).toFixed(1)) : null;
  const standard = macroStandard(pet);
  const coveragePct = pct(totals.covered_g);
  const waterCoveragePct = pct(totals.water_covered_g);
  return {
    ingredient_weight_ratios: { animal_protein_pct: pct(totals.animal_protein_g), organ_pct: pct(totals.organ_g), carb_pct: pct(totals.carb_ingredient_g), vegetable_pct: pct(totals.vegetable_g), fruit_pct: pct(totals.fruit_g), fat_containing_ingredient_pct: pct(totals.fat_containing_g), fat_source_pct: pct(totals.fat_source_g) },
    estimated_grams: { protein_g: Number(totals.protein_g.toFixed(1)), fat_g: Number(totals.fat_g.toFixed(1)), carb_g: Number(totals.carb_g.toFixed(1)), water_g: Number(totals.water_g.toFixed(1)) },
    estimated_water_pct: waterCoveragePct >= 80 ? Number((totals.water_g / totals.water_covered_g * 100).toFixed(1)) : null,
    water_coverage_pct: waterCoveragePct,
    per_1000_kcal: { protein_g: per1000(totals.protein_g), fat_g: per1000(totals.fat_g), carb_g: per1000(totals.carb_g) },
    coverage: { weight_pct: coveragePct, unknown_ingredients: details.filter(item => item.source === 'unresolved').map(item => item.name), status: coveragePct >= 80 ? 'sufficient' : 'uncertain' },
    standards: { ...standard, source: 'FEDIAF 2025' }, details,
  };
}

function structureAssessment(macros, mealIntent) {
  const r = macros.ingredient_weight_ratios;
  let penalty = 0;
  const deductions = [];
  const deduct = (code, points, facts) => {
    penalty += points;
    deductions.push({ code, points, facts });
  };
  if (r.animal_protein_pct === 0) deduct('STRUCTURE_ANIMAL_PROTEIN_MISSING', 50, { actual_pct: r.animal_protein_pct, minimum_pct: 40 });
  else if (r.animal_protein_pct < 5) deduct('STRUCTURE_ANIMAL_PROTEIN_VERY_LOW', 40, { actual_pct: r.animal_protein_pct, minimum_pct: 40 });
  else if (r.animal_protein_pct < 20) deduct('STRUCTURE_ANIMAL_PROTEIN_LOW', 30, { actual_pct: r.animal_protein_pct, minimum_pct: 40 });
  else if (r.animal_protein_pct < 40) deduct('STRUCTURE_ANIMAL_PROTEIN_LOW', 25, { actual_pct: r.animal_protein_pct, minimum_pct: 40 });
  else if (r.animal_protein_pct > 75) deduct('STRUCTURE_ANIMAL_PROTEIN_HIGH', 10, { actual_pct: r.animal_protein_pct, maximum_pct: 75 });
  if (r.carb_pct > 45) deduct('STRUCTURE_CARB_VERY_HIGH', 20, { actual_pct: r.carb_pct, maximum_pct: 45 });
  else if (r.carb_pct > 35) deduct('STRUCTURE_CARB_HIGH', 15, { actual_pct: r.carb_pct, maximum_pct: 35 });
  if (r.vegetable_pct > 30) deduct('STRUCTURE_VEGETABLE_VERY_HIGH', 15, { actual_pct: r.vegetable_pct, maximum_pct: 30 });
  else if (r.vegetable_pct > 25) deduct('STRUCTURE_VEGETABLE_HIGH', 8, { actual_pct: r.vegetable_pct, maximum_pct: 25 });
  if (r.fruit_pct > 10) deduct('STRUCTURE_FRUIT_HIGH', 10, { actual_pct: r.fruit_pct, maximum_pct: 5 });
  else if (r.fruit_pct > 5) deduct('STRUCTURE_FRUIT_HIGH', 5, { actual_pct: r.fruit_pct, maximum_pct: 5 });
  if (r.organ_pct > 15) deduct('STRUCTURE_ORGAN_HIGH', 10, { actual_pct: r.organ_pct, maximum_pct: 15 });
  else if (mealIntent === 'long_term' && r.organ_pct === 0) deduct('STRUCTURE_ORGAN_MISSING', 5, { actual_pct: 0 });
  const fatLow = macros.per_1000_kcal.fat_g !== null && macros.per_1000_kcal.fat_g < macros.standards.fat_min_g_per_1000kcal;
  if (fatLow && r.fat_source_pct === 0) deduct('STRUCTURE_FAT_SOURCE_MISSING', 10, { actual_pct: 0 });
  return { score: score(100 - penalty), fatLow, deductions };
}

function profileNotice(pet, items) {
  const issues = [];
  const health = (pet.health_tags || []).join('、');
  const allergens = [...(pet.allergens || []), ...(pet.food_restrictions || [])];
  items.forEach(item => {
    if (allergens.some(allergen => {
      const value = clean(allergen);
      const stem = value.replace(/[肉类]/g, '');
      return item.name.includes(value) || value.includes(item.name) || (stem.length > 0 && item.name.includes(stem));
    })) {
      issues.push(finding('danger', '过敏或不耐受食材冲突', `${item.name} 命中该宠物档案中的过敏或食物限制记录。`, '删除该食材，并由兽医确认替代蛋白或补充方案。', 'PET_FOOD_CONFLICT', 'profile', { ingredient_name: item.name, ingredient_id: ingredientId(item.name) }));
    }
  });
  if (health || pet.special_period || petLifeStage(pet) === 'puppy') {
    issues.push(finding('warning', '需要专业确认', `当前宠物${health ? `存在 ${health} 健康记录` : '处于幼龄或特殊生理阶段'}，不能仅凭通用配方判断长期适宜性。`, '本次仅作结构检查；长期喂养前建议听从专业医师建议，并由执业兽医或宠物营养专业人员确认。', 'PROFESSIONAL_CONFIRMATION_REQUIRED', 'profile', { health_recorded: Boolean(health), life_stage: petLifeStage(pet), special_period: pet.special_period || null }));
  }
  return issues;
}

function petSuitability({ pet, findings, macros, energyScore, selectedBPack }) {
  const component = (key, label, max, earned, reason, adjustment, reason_code, facts = {}) => {
    const normalizedEarned = Number(Math.max(0, Math.min(max, earned)).toFixed(1));
    return {
      key, label, max, earned: normalizedEarned, reason, adjustment,
      label_code: `SUITABILITY_${key.toUpperCase()}_LABEL`, reason_code,
      adjustment_code: `SUITABILITY_${key.toUpperCase()}_ADJUSTMENT`,
      facts: {
        ...facts,
        component_key: key,
        component_earned: normalizedEarned,
        component_max: max,
      },
    };
  };
  const ratio = (value, minimum) => value === null || !minimum ? 0.5 : Math.max(0, Math.min(1, value / minimum));
  const stage = petLifeStage(pet);
  const size = petBodySize(pet);
  const proteinFit = ratio(macros.per_1000_kcal.protein_g, macros.standards.protein_min_g_per_1000kcal);
  const fatFit = ratio(macros.per_1000_kcal.fat_g, macros.standards.fat_min_g_per_1000kcal);
  const stageEarned = macros.coverage.status === 'uncertain' ? 10 : 20 * (proteinFit * 0.6 + fatFit * 0.4);

  let sizeEarned = size ? 10 : 7;
  let sizeReason = size ? `已按${size}体型检查成长约束。` : '宠物档案和犬种库均未能确认体型。';
  if (stage === 'puppy' && ['large', 'giant'].includes(size)) {
    const controlled = selectedBPack?.category === '控钙幼犬（大型幼犬）';
    sizeEarned = controlled ? 10 : 6;
    sizeReason = controlled ? '大型幼犬已选择适配的控钙成长营养包。' : '大型幼犬尚未确认控钙成长方案。';
  }

  const weight = Number(pet.current_weight_kg || pet.weight || 0);
  const targetWeight = Number(pet.target_weight_kg || pet.targetWeight || 0);
  const targetWeightConflict = stage === 'puppy' && weight && targetWeight && targetWeight < weight;
  const profileCompleteness = weight && (stage === 'puppy' || targetWeight) ? 1 : weight ? 0.75 : 0.35;
  const weightEarned = 15 * (energyScore / 100 * 0.75 + profileCompleteness * 0.25) * (targetWeightConflict ? 0.7 : 1);

  const activityKnown = ['low', 'medium', 'high', 'working'].includes(pet.activity_level);
  const goalKnown = Boolean(pet.feeding_goal);
  const activityEarned = (activityKnown ? 6 : 3) + (typeof pet.neutered === 'boolean' ? 2 : 0) + (goalKnown ? 2 : 1);

  let physiologyEarned = 10;
  let physiologyReason = `${pet.neutered ? '已绝育' : '未绝育'}；无孕哺或恢复期记录。`;
  if (['pregnancy', 'lactation'].includes(pet.special_period)) {
    physiologyEarned = 2;
    physiologyReason = '处于孕期或哺乳期，普通长期配方不能视为完全适配。';
  } else if (['post_op_rest', 'illness_recovery'].includes(pet.special_period)) {
    const goalAligned = pet.feeding_goal === 'post_surgery_recovery';
    physiologyEarned = goalAligned ? 8 : 5;
    physiologyReason = goalAligned ? '恢复期档案与术后恢复喂养目标一致。' : '处于恢复期，但喂养目标尚未设置为术后恢复。';
  }

  const health = (pet.health_tags || []).filter(Boolean);
  const fatPer1000 = macros.per_1000_kcal.fat_g;
  const carbPct = macros.ingredient_weight_ratios.carb_pct;
  const vegetablePct = macros.ingredient_weight_ratios.vegetable_pct;
  const organPct = macros.ingredient_weight_ratios.organ_pct;
  const conditionScore = tag => {
    const value = clean(tag).toLowerCase();
    if (includesAny(value, ['pancreatitis', '胰腺'])) return fatPer1000 === null ? 10 : Math.max(0, 20 - Math.max(0, fatPer1000 - 20) * 0.8);
    if (includesAny(value, ['obesity', '肥胖'])) return 20 * energyScore / 100;
    if (includesAny(value, ['diabetes', '糖尿病'])) return Math.max(0, 20 - Math.max(0, carbPct - 20) * 0.7);
    if (includesAny(value, ['gastrointestinal', 'digest', '肠胃', '消化'])) return Math.max(0, 20 - Math.max(0, (fatPer1000 ?? 28) - 28) * 0.45 - Math.max(0, vegetablePct - 25) * 0.3);
    if (includesAny(value, ['liver', '肝脏', '胆囊'])) return Math.max(0, 20 - Math.max(0, organPct - 5) * 1.2 - Math.max(0, (fatPer1000 ?? 30) - 30) * 0.35);
    if (includesAny(value, ['kidney', 'renal', '肾脏', 'cardiac', '心脏', 'urinary', '泌尿'])) return 12;
    return 14;
  };
  const healthEarned = health.length ? Math.min(...health.map(conditionScore)) : 20;
  const healthReason = !health.length ? '未登记基础疾病。' : `已按${health.join('、')}约束检查；肾脏、心脏或泌尿问题仍需磷、钠等专业数据确认。`;

  const foodConflict = findings.some(item => item.code === 'PET_FOOD_CONFLICT');
  const hasFoodRecords = (pet.allergens || []).length || (pet.food_restrictions || []).length || (pet.allergy_symptoms || []).length;
  const allergyEarned = foodConflict ? 0 : macros.coverage.status === 'uncertain' && hasFoodRecords ? 10 : 15;
  const components = [
    component('life_stage', '年龄与生命阶段', 20, stageEarned, `按${macros.standards.stage}阶段核对蛋白质与脂肪最低值。`, '调整蛋白质和脂肪密度，使其达到当前年龄阶段要求。', 'LIFE_STAGE_MACRO_CHECK', {
      stage_standard: macros.standards.stage,
      protein_score: score(proteinFit * 100),
      fat_score: score(fatFit * 100),
    }),
    component('body_size', '体型与成长约束', 10, sizeEarned, sizeReason, '大型或巨型幼犬需要确认控钙成长方案。', !size ? 'BODY_SIZE_UNKNOWN' : stage === 'puppy' && ['large', 'giant'].includes(size) ? (selectedBPack?.category === '控钙幼犬（大型幼犬）' ? 'LARGE_PUPPY_PACK_APPLIED' : 'LARGE_PUPPY_PACK_UNCONFIRMED') : 'BODY_SIZE_CHECKED', { body_size_code: size }),
    component('weight_energy', '体重、目标与能量', 15, weightEarned, targetWeightConflict ? `当前食谱能量与食量可执行性得分${energyScore}分；幼犬目标${targetWeight}kg低于当前${weight}kg，档案冲突。` : `当前食谱能量与食量可执行性得分${energyScore}分；当前${weight || '未填'}kg，目标${targetWeight || '未填'}kg。`, targetWeightConflict ? '暂停使用该目标体重推导减重；复核BCS、生长曲线，并降低不可执行的每日食物体积。' : '调整食谱总量或能量密度，并补全当前及目标体重。', targetWeightConflict ? 'WEIGHT_ENERGY_PUPPY_TARGET_CONFLICT' : 'WEIGHT_ENERGY_PROFILE', { energy_score: energyScore, current_weight_kg: weight || null, target_weight_kg: targetWeight || null }),
    component('activity_neuter', '活动、绝育与喂养目标', 10, activityEarned, `活动水平${pet.activity_level || '未填'}、${pet.neutered ? '已绝育' : '未绝育'}、目标${pet.feeding_goal || '未填'}。`, '补全活动水平、绝育状态和喂养目标。', 'ACTIVITY_NEUTER_GOAL_PROFILE', { activity_level: pet.activity_level || null, neutered: Boolean(pet.neutered), feeding_goal: pet.feeding_goal || null }),
    component('physiology', '孕哺与恢复状态', 10, physiologyEarned, physiologyReason, '孕哺或恢复期应使用对应的专用长期方案。', ['pregnancy', 'lactation'].includes(pet.special_period) ? 'PHYSIOLOGY_PREGNANCY_LACTATION' : ['post_op_rest', 'illness_recovery'].includes(pet.special_period) ? (pet.feeding_goal === 'post_surgery_recovery' ? 'PHYSIOLOGY_RECOVERY_ALIGNED' : 'PHYSIOLOGY_RECOVERY_NOT_ALIGNED') : 'PHYSIOLOGY_NORMAL', { special_period: pet.special_period || null, neutered: Boolean(pet.neutered) }),
    component('health', '基础疾病约束', 20, healthEarned, healthReason, '存在基础疾病时，请补充专业营养指标并按疾病约束调整；建议听从专业医师建议。', health.length ? 'HEALTH_CONSTRAINTS_REVIEWED' : 'HEALTH_NONE', {
      health_record_count: health.length,
      health_tags: health,
    }),
    component('allergy', '过敏与不耐受', 15, allergyEarned, foodConflict ? '当前食谱命中过敏或食物限制记录。' : '未发现当前食材与已登记过敏或不耐受记录冲突。', '删除冲突食材并选择安全替代来源。', foodConflict ? 'ALLERGY_CONFLICT' : 'ALLERGY_NONE', { food_conflict: foodConflict }),
  ];
  const value = pet.species && pet.species !== 'dog' ? 0 : score(components.reduce((sum, item) => sum + item.earned, 0));
  const deductions = components.filter(item => item.earned < item.max).map(item => ({ component_key: item.key, points: Number((item.max - item.earned).toFixed(1)), reason: item.reason }));
  return { value, model: 'profile_weighted_v1', components, deductions, explanation_code: deductions.length ? 'SUITABILITY_DEDUCTIONS_PRESENT' : 'SUITABILITY_DEDUCTIONS_NONE', explanation_facts: { component_count: components.length, deduction_keys: deductions.map(item => item.component_key) }, explanation: deductions.length ? `共${components.length}项检查，主要扣分来自${components.filter(item => item.earned < item.max).map(item => item.label).join('、')}。` : '七项宠物档案适配检查均未发现扣分。' };
}

const KCAL_PER_100G = [
  [['鸡肉', '鸡胸'], 165], [['牛肉'], 250], [['猪肉'], 242], [['羊肉'], 294], [['三文鱼'], 208], [['鱼'], 150], [['虾'], 99], [['鸡蛋'], 143],
  [['米饭', '糙米'], 116], [['红薯'], 86], [['土豆'], 77], [['南瓜'], 26], [['燕麦'], 71], [['藜麦'], 120],
  [['胡萝卜'], 41], [['西兰花'], 34], [['菠菜'], 23], [['苹果'], 52], [['蓝莓'], 57], [['鱼油', '橄榄油', '亚麻籽油'], 884],
  [['钙粉', '蛋壳粉', '骨粉', '营养包', '水'], 0],
];

function kcalFor(item) {
  const match = KCAL_PER_100G.find(([terms]) => has(item.name, terms));
  return match ? Math.round(item.grams * match[1] / 100) : null;
}

function withIngredientInputIds(items = []) {
  return items.map((item, index) => ({ ...item, input_id: clean(item?.input_id) || `ingredient_${index + 1}` }));
}

function normalizeIngredientFacts(items = [], allowedInputs = []) {
  const inputs = withIngredientInputIds(allowedInputs.map(item => typeof item === 'string' ? { name: item } : item));
  const byId = new Map(inputs.map(item => [item.input_id, item]));
  const byName = new Map(inputs.map(item => [clean(item.name), item]));
  return items.map(item => {
    const input = byId.get(clean(item?.input_id)) || byName.get(clean(item?.name));
    if (!input) return null;
    return {
      input_id: input.input_id,
      name: clean(input.name),
      is_food: item?.is_food === true ? true : item?.is_food === false ? false : null,
      dog_safety: ['safe', 'unsafe', 'uncertain'].includes(item?.dog_safety) ? item.dog_safety : null,
      kcal_per_100g: nullableNumber(item?.kcal_per_100g, 0, 900),
      category: ['protein', 'organ', 'carb', 'vegetable', 'fruit', 'fat', 'addition', 'unknown'].includes(item?.category) ? item.category : 'unknown',
      protein_pct: nullableNumber(item?.protein_pct, 0, 100),
      fat_pct: nullableNumber(item?.fat_pct, 0, 100),
      carb_pct: nullableNumber(item?.carb_pct, 0, 100),
      confidence: ['high', 'medium', 'low'].includes(item?.confidence) ? item.confidence : 'low',
      basis: clean(item?.basis),
    };
  }).filter(Boolean);
}

function mergeIngredientFact(first = {}, second = {}) {
  const value = (key) => second[key] !== null && second[key] !== undefined && second[key] !== '' ? second[key] : first[key] ?? null;
  const isFoodValues = [first.is_food, second.is_food];
  const safetyValues = [first.dog_safety, second.dog_safety];
  return {
    input_id: second.input_id || first.input_id,
    name: second.name || first.name,
    is_food: isFoodValues.includes(false) ? false : (isFoodValues.includes(true) ? true : null),
    dog_safety: safetyValues.includes('unsafe') ? 'unsafe' : (safetyValues.includes('safe') ? 'safe' : (safetyValues.includes('uncertain') ? 'uncertain' : null)),
    kcal_per_100g: value('kcal_per_100g'),
    category: second.category && second.category !== 'unknown' ? second.category : first.category || 'unknown',
    protein_pct: value('protein_pct'),
    fat_pct: value('fat_pct'),
    carb_pct: value('carb_pct'),
    confidence: second.confidence || first.confidence || 'low',
    basis: second.basis || first.basis || '',
  };
}

async function lookupIngredientFactsWithRetry(ingredients, lookup = lookupFreshCheckIngredientFacts) {
  const inputs = withIngredientInputIds(ingredients);
  const errors = [];
  let firstResult = {};
  try { firstResult = await lookup({ ingredients: inputs }); } catch (error) { errors.push(error); }
  const firstFacts = normalizeIngredientFacts(firstResult?.ingredients, inputs);
  const firstById = new Map(firstFacts.map(item => [item.input_id, item]));
  const retryIngredients = inputs.filter(item => {
    const fact = firstById.get(item.input_id);
    if (fact?.is_food === false || fact?.dog_safety === 'unsafe') return false;
    return fact?.is_food !== true || fact?.dog_safety !== 'safe' || !hasNutritionValues(fact);
  });
  let secondById = new Map();
  if (retryIngredients.length) {
    let secondResult = {};
    try { secondResult = await lookup({ ingredients: retryIngredients, retry: true }); } catch (error) { errors.push(error); }
    const secondFacts = normalizeIngredientFacts(secondResult?.ingredients, retryIngredients);
    secondById = new Map(secondFacts.map(item => [item.input_id, item]));
  }
  const retried = new Set(retryIngredients.map(item => item.input_id));
  const facts = inputs.map(item => {
    const fact = mergeIngredientFact(firstById.get(item.input_id), secondById.get(item.input_id));
    const unsafe = fact.is_food === false || fact.dog_safety === 'unsafe';
    return { ...fact, input_id: item.input_id, name: item.name, lookup_attempts: retried.has(item.input_id) ? 2 : 1, nutrition_unresolved: !unsafe && !hasNutritionValues(fact) };
  });
  const validCount = facts.filter(fact => fact.is_food !== null || fact.dog_safety !== null || hasNutritionValues(fact)).length;
  const lookupStatus = validCount === 0 ? 'service_unavailable' : validCount < facts.length ? 'partial' : 'available';
  if (errors.length || lookupStatus === 'service_unavailable') {
    console.warn('[FreshCheck] ingredient lookup degraded', {
      status: lookupStatus,
      attempts_failed: errors.length,
      error_codes: errors.length
        ? errors.map(error => error?.response?.status || error?.code || error?.name || 'UNKNOWN')
        : ['INVALID_RESPONSE'],
    });
  }
  return {
    facts,
    status: lookupStatus,
    retried_ingredients: retryIngredients.map(item => item.name),
    unresolved_ingredients: facts.filter(item => item.nutrition_unresolved).map(item => item.name),
  };
}

function fallbackKcalPer100(item) {
  if (isDeterministicDanger(item.name)) return null;
  if (has(item.name, ORGAN)) return 145;
  if (has(item.name, PROTEIN)) return 180;
  if (has(item.name, CARB)) return 100;
  if (has(item.name, VEGETABLE)) return 35;
  return null;
}

function energyFor(item, ingredientFacts = new Map(), ingredientMap = {}) {
  if (isDeterministicDanger(item.name)) return { kcal: null, kcal_per_100g: null, source: 'excluded_unsafe', confidence: 'high' };
  const matched = matchIngredientRecord(item.name, ingredientMap);
  const databaseKcal = nullableNumber(matched?.record?.calories_per_100g ?? matched?.record?.kcal_per_100g, 0, 900);
  if (databaseKcal !== null) return { kcal: Math.round(item.grams * databaseKcal / 100), kcal_per_100g: databaseKcal, source: 'ingredient_database', confidence: 'high' };
  const ai = ingredientFacts.get(item.name);
  if (ai?.is_food === false || ai?.dog_safety === 'unsafe') return { kcal: null, kcal_per_100g: null, source: 'excluded_unsafe', confidence: ai.confidence };
  if (ai?.dog_safety === 'uncertain' || ai?.dog_safety === null || ai?.nutrition_unresolved) return { kcal: null, kcal_per_100g: null, source: 'unresolved', confidence: ai?.confidence || 'low' };
  if (ai?.is_food && ai.dog_safety === 'safe' && ai.kcal_per_100g !== null) {
    return { kcal: Math.round(item.grams * ai.kcal_per_100g / 100), kcal_per_100g: ai.kcal_per_100g, source: 'deepseek', confidence: ai.confidence, basis: ai.basis };
  }
  if (ai) return { kcal: null, kcal_per_100g: null, source: 'unresolved', confidence: ai.confidence || 'low' };
  const localKcal = kcalFor(item);
  if (localKcal !== null) {
    const per100 = KCAL_PER_100G.find(([terms]) => has(item.name, terms))?.[1] ?? 0;
    return { kcal: localKcal, kcal_per_100g: per100, source: 'local_database', confidence: 'high' };
  }
  const fallback = fallbackKcalPer100(item);
  if (fallback !== null) return { kcal: Math.round(item.grams * fallback / 100), kcal_per_100g: fallback, source: 'category_fallback', confidence: 'low' };
  return { kcal: null, kcal_per_100g: null, source: 'unresolved', confidence: 'low' };
}

function intakeFeasibility({ pet, totalWeight, energy, need, waterPct }) {
  const weight = Number(pet.current_weight_kg || pet.weight || 0);
  const stage = petLifeStage(pet);
  const softRatioPct = stage === 'puppy' ? 8 : stage === 'senior' ? 4.5 : 5;
  const hardRatioPct = stage === 'puppy' ? 12 : stage === 'senior' ? 7 : 8;
  const warningRatioPct = softRatioPct * 1.2;
  const dailyRatioPct = weight ? totalWeight / (weight * 1000) * 100 : null;
  const meals = need.meals_per_day || 2;
  const maxDailyGrams = weight ? weight * 1000 * softRatioPct / 100 : null;
  const excessPct = maxDailyGrams ? Math.max(0, (totalWeight - maxDailyGrams) / maxDailyGrams * 100) : null;
  const kcalPerGram = energy.kcal_per_gram || 0;
  const requiredDensity = maxDailyGrams && need.daily_kcal ? need.daily_kcal / maxDailyGrams : null;
  const needsHigherDensity = requiredDensity !== null && kcalPerGram > 0 && kcalPerGram + 0.01 < requiredDensity;
  let volumeScore = dailyRatioPct === null ? 50 : 100;
  if (dailyRatioPct > warningRatioPct) volumeScore = score(100 - (dailyRatioPct - warningRatioPct) / (hardRatioPct - warningRatioPct) * 100);
  const requiredDensityRounded = requiredDensity === null ? null : Number(requiredDensity.toFixed(2));
  const volumeAdvice = needsHigherDensity
    ? `在营养平衡前提下，将能量密度提高至约 ${requiredDensityRounded} kcal/g，并把每日总量控制在约 ${Math.round(maxDailyGrams)}g。`
    : `当前能量密度 ${kcalPerGram ? Number(kcalPerGram.toFixed(2)) : '-'} kcal/g 已达到参考食量所需的约 ${requiredDensityRounded ?? '-'} kcal/g，无需继续提高；请在保持营养比例的前提下将每日总量控制在约 ${maxDailyGrams === null ? '-' : Math.round(maxDailyGrams)}g。`;
  return {
    stage_label: stage === 'puppy' ? '幼犬' : stage === 'senior' ? '老年犬' : '成犬',
    stage_code: stage,
    daily_food_weight_g: totalWeight,
    daily_food_weight_pct_body_weight: dailyRatioPct === null ? null : Number(dailyRatioPct.toFixed(1)),
    grams_per_meal: Number((totalWeight / meals).toFixed(1)),
    kcal_per_gram: kcalPerGram ? Number(kcalPerGram.toFixed(2)) : null,
    estimated_water_pct: waterPct,
    reference_max_pct_body_weight: softRatioPct,
    reference_max_daily_grams: maxDailyGrams === null ? null : Math.round(maxDailyGrams),
    warning_threshold_pct_over_reference: 20,
    warning_threshold_daily_grams: maxDailyGrams === null ? null : Math.round(maxDailyGrams * 1.2),
    exceeds_reference_by_pct: excessPct === null ? null : Number(excessPct.toFixed(1)),
    reference_max_grams_per_meal: maxDailyGrams === null ? null : Math.round(maxDailyGrams / meals),
    minimum_density_for_reference_volume: requiredDensityRounded,
    needs_higher_density: needsHigherDensity,
    volume_advice: volumeAdvice,
    volume_advice_code: needsHigherDensity ? 'INCREASE_ENERGY_DENSITY_AND_LIMIT_VOLUME' : 'KEEP_DENSITY_AND_LIMIT_VOLUME',
    volume_advice_facts: { minimum_density_for_reference_volume: requiredDensityRounded, kcal_per_gram: kcalPerGram ? Number(kcalPerGram.toFixed(2)) : null, reference_max_daily_grams: maxDailyGrams === null ? null : Math.round(maxDailyGrams) },
    excessive_volume: excessPct !== null && excessPct > 20,
    severe_excessive_volume: dailyRatioPct !== null && dailyRatioPct > hardRatioPct,
    low_energy_density: kcalPerGram > 0 && kcalPerGram < 1.3,
    high_water: Number.isFinite(waterPct) && waterPct >= 75,
    score: volumeScore,
    note: 'AI营养建议基于犬类能量需求模型（RER/MER）、体重、年龄及活动水平综合计算，为日常喂养提供科学参考。建议根据体况评分（BCS）和实际变化持续调整。如存在疾病、特殊生理阶段或特殊营养需求，请咨询兽医。',
    note_code: 'DAILY_NEED_NOT_VETERINARY_PRESCRIPTION',
  };
}

function energyFinding({ energy, need, categories, feasibility }) {
  if (!need.daily_kcal) return finding('notice', '缺少体重数据', '宠物档案缺少当前体重，无法计算个体化每日能量需求。', '请补全当前体重、月龄、活动量和喂养目标后重新验证。', 'MISSING_WEIGHT', 'energy');
  if (!energy.kcal_per_gram) return finding('warning', '食谱缺少可计算能量来源', '当前已识别食材未提供有效能量，无法满足每日能量需求。', '加入适配的动物蛋白和主食能量来源，并重新验证总量、钙源与必需脂肪酸。', 'MISSING_ENERGY_SOURCE', 'energy');
  const suggestedGrams = Math.round(need.daily_kcal / energy.kcal_per_gram);
  if (feasibility?.excessive_volume) {
    const causes = [feasibility.low_energy_density && '能量密度偏低', feasibility.high_water && '含水率较高'].filter(Boolean).join('且');
    return finding('warning', '每日食量过大，当前方案难以执行', `当前食谱 ${feasibility.daily_food_weight_g}g，占体重 ${feasibility.daily_food_weight_pct_body_weight}%（每餐约 ${feasibility.grams_per_meal}g），比本产品${feasibility.stage_label}建议食量约 ${feasibility.reference_max_daily_grams}g 超出 ${feasibility.exceeds_reference_by_pct}%${causes ? `；${causes}` : ''}。超过建议量20%以上才触发本提示；即使总热量接近目标，也不能视为能量需求已合理满足。`, feasibility.volume_advice, 'EXCESSIVE_DAILY_FOOD_VOLUME', 'energy', {
      daily_food_weight_g: feasibility.daily_food_weight_g, daily_food_weight_pct_body_weight: feasibility.daily_food_weight_pct_body_weight,
      grams_per_meal: feasibility.grams_per_meal, stage_code: feasibility.stage_code, reference_max_daily_grams: feasibility.reference_max_daily_grams,
      exceeds_reference_by_pct: feasibility.exceeds_reference_by_pct, low_energy_density: feasibility.low_energy_density, high_water: feasibility.high_water,
    });
  }
  if (energy.total_kcal > need.max_kcal) return finding('warning', '每日能量偏高', `当前食谱约 ${energy.total_kcal} kcal，超过该宠物建议每日 ${need.min_kcal}-${need.max_kcal} kcal；按当前配方密度，建议总量约 ${suggestedGrams}g。`, `减少约 ${Math.round((energy.total_kcal - need.daily_kcal) / energy.kcal_per_gram)}g；优先等比例缩减主蛋白和碳水，不要仅删除钙源或必需脂肪酸。`, 'DAILY_ENERGY_HIGH', 'energy', { total_kcal: energy.total_kcal, min_kcal: need.min_kcal, max_kcal: need.max_kcal, suggested_grams: suggestedGrams });
  if (energy.total_kcal < need.min_kcal) {
    const gap = need.daily_kcal - energy.total_kcal;
    const structure = !categories.carb.length ? '以适配的熟红薯、南瓜或米饭补足一部分能量' : !categories.fat.length ? '在专业建议下用少量鱼油等脂肪酸来源替换等量低能量食材' : '按原有结构等比例增加主蛋白与碳水';
    return finding('warning', '每日能量偏低', `当前食谱约 ${energy.total_kcal} kcal，低于该宠物建议每日 ${need.min_kcal}-${need.max_kcal} kcal；按当前配方密度，建议总量约 ${suggestedGrams}g。`, `还需约 ${gap} kcal；${structure}，并重新验证总量与营养平衡。`, 'DAILY_ENERGY_LOW', 'energy', { total_kcal: energy.total_kcal, min_kcal: need.min_kcal, max_kcal: need.max_kcal, gap_kcal: gap, suggested_grams: suggestedGrams });
  }
  return finding('safe', '每日能量在建议范围内', `当前食谱约 ${energy.total_kcal} kcal，处于该宠物建议每日 ${need.min_kcal}-${need.max_kcal} kcal 的范围。`, `按当前配方密度，建议每日总量约 ${suggestedGrams}g，分 ${need.meals_per_day} 餐喂养。`, 'DAILY_ENERGY_ADEQUATE', 'energy', { total_kcal: energy.total_kcal, min_kcal: need.min_kcal, max_kcal: need.max_kcal, suggested_grams: suggestedGrams, meals_per_day: need.meals_per_day });
}

function localCheck({ pet, ingredients, mealIntent = 'long_term', selectedBPack = null, ingredientFacts = [], ingredientMap = {}, ingredientLookupStatus = 'available' }) {
  const total = ingredients.reduce((sum, item) => sum + item.grams, 0);
  const categories = classifyRecipe(ingredients, ingredientMap, ingredientFacts);
  const daily_need = dailyEnergyNeed(pet);
  const factsByName = new Map(ingredientFacts.map(item => [item.name, item]));
  const withEnergy = ingredients.map(item => ({ ...item, energy: energyFor(item, factsByName, ingredientMap) }));
  const totalKcal = withEnergy.reduce((sum, item) => sum + (item.energy.kcal || 0), 0);
  const energy = {
    total_kcal: totalKcal,
    kcal_per_gram: total ? totalKcal / total : 0,
    unknown: withEnergy.filter(item => item.energy.source === 'unresolved').map(item => item.name),
    excluded: withEnergy.filter(item => item.energy.source === 'excluded_unsafe').map(item => item.name),
    estimates: withEnergy.filter(item => item.energy.kcal !== null).map(item => ({ name: item.name, kcal_per_100g: item.energy.kcal_per_100g, source: item.energy.source, confidence: item.energy.confidence, basis: item.energy.basis || null })),
  };
  const macro_nutrition = calculateMacroNutrition({ pet, ingredients, ingredientMap, ingredientFacts });
  const intake_feasibility = intakeFeasibility({ pet, totalWeight: total, energy, need: daily_need, waterPct: macro_nutrition.estimated_water_pct });
  const structureResult = structureAssessment(macro_nutrition, mealIntent);
  const findings = [];
  ingredients.forEach(item => {
    const aiFact = factsByName.get(item.name);
    const facts = { ingredient_name: item.name, ingredient_id: ingredientId(item.name) };
    if (has(item.name, INEDIBLE)) findings.push(finding('danger', '安全红线：非食物不可使用', `${item.name} 不是犬类可食用原料，吞食可能造成中毒、异物阻塞或机械损伤。`, '立即移除该项；如宠物已经吞食，请尽快联系执业兽医。', 'INEDIBLE', 'safety', facts));
    else if (has(item.name, FORBIDDEN)) findings.push(finding('danger', '安全红线：不可使用', `${item.name} 对犬类存在明确禁食或伤害风险。`, '立即移除该食材后重新验证。', 'FORBIDDEN', 'safety', facts));
    else if (aiFact && (aiFact.is_food === false || aiFact.dog_safety === 'unsafe')) findings.push(finding('danger', '安全红线：AI识别为不可用', `${item.name} ${aiFact.is_food === false ? '不是可食用原料' : '不适合犬类食用'}${aiFact.basis ? `：${aiFact.basis}` : '。'}`, '立即移除该项；不确定时请由执业兽医确认。', 'AI_UNSAFE_INGREDIENT', 'safety', { ...facts, basis: aiFact.basis || null, is_food: aiFact.is_food }));
    else if (ingredientLookupStatus !== 'service_unavailable' && aiFact && (aiFact.dog_safety === 'uncertain' || aiFact.dog_safety === null)) findings.push(finding('warning', '食材安全性待确认', `暂不能确认 ${item.name} 是否适合犬类食用。`, '提供更准确的部位、生熟状态或产品配料表后重新验证。', 'INGREDIENT_SAFETY_UNCERTAIN', 'safety', facts));
    else if (has(item.name, SEASONINGS)) findings.push(finding('warning', '高盐或复合调味风险', `${item.name} 可能含盐分或成分不明的调味物。`, '改为无盐、未调味的原料，并确认完整配料表。', 'SEASONING_RISK', 'safety', facts));
  });
  if (ingredientLookupStatus === 'service_unavailable') {
    findings.push(finding('warning', '食材核验服务暂时不可用', '本次无法连接食材核验服务，不能据此判断这些食材本身不安全。', '请稍后重新验证；系统恢复前不要将本次结果用于长期喂养决策。', 'INGREDIENT_LOOKUP_SERVICE_UNAVAILABLE', 'safety', { ingredient_count: ingredientFacts.filter(item => item.nutrition_unresolved).length }));
  }
  findings.push(...profileNotice(pet, ingredients));
  if (daily_need.target_weight_conflict) findings.push(finding('warning', '幼犬目标体重档案冲突', `当前体重 ${daily_need.current_weight_kg}kg，但目标体重 ${daily_need.target_weight_kg}kg 更低；幼犬仍在生长，不能据此得出减重结论。`, '暂停使用该目标体重做减重计算；请结合BCS、犬种生长曲线和连续称重，由兽医复核目标。', 'PUPPY_TARGET_WEIGHT_CONFLICT', 'profile', { current_weight_kg: daily_need.current_weight_kg, target_weight_kg: daily_need.target_weight_kg }));
  const ratios = macro_nutrition.ingredient_weight_ratios;
  if (ratios.animal_protein_pct < 40) {
    findings.push(finding('warning', '动物性食材占比较低', `动物性食材占配方 ${ratios.animal_protein_pct}%，低于 40%。`, '重点检查蛋白质、脂肪、必需氨基酸和能量密度，并提高适配的动物性食材占比。', 'LOW_ANIMAL_PROTEIN', 'structure', { actual_pct: ratios.animal_protein_pct, minimum_pct: 40 }));
  } else if (ratios.animal_protein_pct < 45) {
    findings.push(finding('notice', '动物性食材处于可接受区间', `动物性食材占配方 ${ratios.animal_protein_pct}%，位于 40%–45% 可接受区间。`, '通过营养计算确认蛋白质、脂肪和必需氨基酸，并重点检查能量密度能否满足当前宠物需求。', 'ANIMAL_PROTEIN_ACCEPTABLE_REVIEW', 'structure', { actual_pct: ratios.animal_protein_pct, minimum_pct: 40, recommended_minimum_pct: 45 }));
  } else if (ratios.animal_protein_pct > 65 && ratios.animal_protein_pct <= 75) {
    findings.push(finding('notice', '高动物性食材结构', `动物性食材占配方 ${ratios.animal_protein_pct}%，属于 65%–75% 高动物性食材结构。`, '这不一定有问题，但应检查脂肪、钙磷、内脏比例和总能量是否超标。', 'HIGH_ANIMAL_PROTEIN_REVIEW', 'structure', { actual_pct: ratios.animal_protein_pct, high_range_minimum_pct: 65, maximum_pct: 75 }));
  } else if (ratios.animal_protein_pct > 75) {
    findings.push(finding('warning', '动物性食材占比超过75%', `动物性食材占配方 ${ratios.animal_protein_pct}%，不能据此自动判定健康。`, '检查纤维和其他食材空间是否被挤压，并复核脂肪、磷、铜、维生素A及总能量。', 'EXCESSIVE_ANIMAL_PROTEIN', 'structure', { actual_pct: ratios.animal_protein_pct, maximum_pct: 75 }));
  }
  if (ratios.carb_pct < 10) {
    findings.push(finding('notice', '低碳水配方', `淀粉类碳水食材占配方 ${ratios.carb_pct}%，低于 10%。`, '标记为低碳水配方，并确认脂肪、蛋白质和总能量能够满足需求。', 'LOW_CARB_FORMULA', 'structure', { actual_pct: ratios.carb_pct, low_threshold_pct: 10 }));
  } else if (ratios.carb_pct < 15) {
    findings.push(finding('notice', '碳水比例偏低', `淀粉类碳水食材占配方 ${ratios.carb_pct}%，位于 10%–15% 偏低区间。`, '结合活动量、脂肪来源和总能量确认长期适用性。', 'LOW_CARB', 'structure', { actual_pct: ratios.carb_pct, recommended_minimum_pct: 15 }));
  } else if (ratios.carb_pct > 45) {
    findings.push(finding('warning', '碳水比例超过45%', `淀粉类碳水食材占配方 ${ratios.carb_pct}%，不建议作为常规犬鲜食结构。`, '减少淀粉类碳水，避免稀释动物性营养，并重新核算蛋白质密度和总能量。', 'VERY_HIGH_CARB', 'structure', { actual_pct: ratios.carb_pct, maximum_pct: 45 }));
  } else if (ratios.carb_pct > 35) {
    findings.push(finding('notice', '碳水比例偏高', `淀粉类碳水食材占配方 ${ratios.carb_pct}%，位于 35%–45% 偏高区间。`, '检查蛋白质密度和总能量，并在需要时减少淀粉类碳水。', 'HIGH_CARB', 'structure', { actual_pct: ratios.carb_pct, maximum_pct: 35 }));
  }
  if (ratios.vegetable_pct < 5) {
    findings.push(finding('notice', '非淀粉果蔬比例较低', `非淀粉果蔬占配方 ${ratios.vegetable_pct}%，低于 5%。`, '检查实际纤维含量和食材多样性，不仅凭食材重量下结论。', 'LOW_NON_STARCHY_PRODUCE', 'structure', { actual_pct: ratios.vegetable_pct, low_threshold_pct: 5 }));
  } else if (ratios.vegetable_pct < 10) {
    findings.push(finding('notice', '非淀粉果蔬比例偏低', `非淀粉果蔬占配方 ${ratios.vegetable_pct}%，位于 5%–10% 偏低区间。`, '结合实际纤维含量和粪便情况确认是否需要增加低淀粉蔬菜。', 'LOW_NON_STARCHY_PRODUCE', 'structure', { actual_pct: ratios.vegetable_pct, recommended_minimum_pct: 10 }));
  } else if (ratios.vegetable_pct > 30) {
    findings.push(finding('warning', '非淀粉果蔬比例超过30%', `非淀粉果蔬占配方 ${ratios.vegetable_pct}%，通常不建议。`, '减少果蔬总量，避免日粮体积过大、能量密度下降和纤维过多。', 'VERY_HIGH_VEGETABLE', 'structure', { actual_pct: ratios.vegetable_pct, maximum_pct: 30 }));
  } else if (ratios.vegetable_pct > 25) {
    findings.push(finding('notice', '非淀粉果蔬比例偏高', `非淀粉果蔬占配方 ${ratios.vegetable_pct}%，位于 25%–30% 偏高区间。`, '检查能量密度和粪便情况，并避免挤占动物性营养来源。', 'HIGH_VEGETABLE', 'structure', { actual_pct: ratios.vegetable_pct, maximum_pct: 25 }));
  }
  if (ratios.fruit_pct > 5) {
    findings.push(finding(ratios.fruit_pct > 10 ? 'warning' : 'notice', '水果比例偏高', `水果占配方 ${ratios.fruit_pct}%，超过建议的 0%–5%。`, '减少高糖水果，使主要果蔬来源回到低淀粉蔬菜。', 'HIGH_FRUIT', 'structure', { actual_pct: ratios.fruit_pct, maximum_pct: 5 }));
  }
  if (structureResult.fatLow && ratios.fat_source_pct === 0) findings.push(finding('warning', '脂肪来源不足', `估算脂肪为 ${macro_nutrition.per_1000_kcal.fat_g}g/1000kcal，低于当前阶段参考最低值 ${macro_nutrition.standards.fat_min_g_per_1000kcal}g/1000kcal，且没有明确脂肪来源。`, '在专业建议下加入适配的脂肪来源，重新核算总能量与必需脂肪酸。', 'LOW_FAT_SOURCE', 'nutrition', { actual_g_per_1000kcal: macro_nutrition.per_1000_kcal.fat_g, minimum_g_per_1000kcal: macro_nutrition.standards.fat_min_g_per_1000kcal }));
  if (macro_nutrition.coverage.status === 'uncertain') findings.push(finding('warning', '宏量营养估算不完整', `仅覆盖 ${macro_nutrition.coverage.weight_pct}% 食材重量，无法可靠判断蛋白质、脂肪和碳水是否达标。`, '补充未识别食材的生熟状态或营养标签后重新验证。', 'MACRO_DATA_INCOMPLETE', 'nutrition', { coverage_weight_pct: macro_nutrition.coverage.weight_pct }));
  const unresolvedNutrition = ingredientLookupStatus === 'service_unavailable' ? [] : ingredientFacts.filter(item => item.nutrition_unresolved);
  unresolvedNutrition.forEach(item => findings.push(finding('notice', `未查询到${item.name}食材的营养值`, `${item.name} 经两次查询仍未返回有效营养值，未计入食品营养值计算。`, '请补充准确食材名称、部位、生熟状态或包装营养标签后重新验证。', 'INGREDIENT_NUTRITION_UNAVAILABLE', 'nutrition', { ingredient_name: item.name, ingredient_id: ingredientId(item.name), lookup_attempts: item.lookup_attempts || 2 })));
  const packCoverage = selectedBPack ? (selectedBPack.coverage || bPackCoverage(selectedBPack.description)) : {};
  const bPackNeeded = mealIntent === 'long_term' && !categories.calcium.length;
  if (!selectedBPack && !categories.calcium.length && mealIntent === 'long_term') findings.push(finding('warning', '长期主食缺少维生素和矿物质', '未识别到钙源或完整营养平衡包，长期可能造成钙磷、维生素及微量营养失衡。', '按专业方案加入明确剂量的维生素和矿物质，或者添加王牌全价营养包。', 'MICRONUTRIENT_SOURCE_MISSING', 'nutrition'));
  if (!categories.fat.length && !packCoverage.fatty_acids && mealIntent === 'long_term') findings.push(finding('notice', '必需脂肪酸待确认', '未识别到明确的必需脂肪酸来源，且当前全价营养包说明中未标明 Omega-3、鱼油或藻油。', '选择明确包含必需脂肪酸的全价营养包，或在专业建议下补充适配来源。', 'ESSENTIAL_FATTY_ACID_SOURCE_MISSING', 'nutrition'));
  if (selectedBPack) {
    const covered = [['vitamins', '维生素'], ['minerals', '矿物质'], ['calcium', '钙源'], ['fatty_acids', '必需脂肪酸']].filter(([key]) => packCoverage[key]).map(([, label]) => label);
    findings.push(finding('safe', '已识别必配全价营养包覆盖项目', `${selectedBPack.name} 按数据库说明覆盖：${covered.join('、') || '暂无可确认项目'}；按每100克食材配10克、烹饪完成后拌入，不计入食材总重、宏量营养、能量、食材比例或烹饪参数。`, '请严格按标注剂量在烹饪完成后拌入，并继续处理仍存在的食谱结构和能量问题。', 'B_PACK_APPLIED', 'nutrition', { category_code: selectedBPack.category_code || B_PACK_CATEGORY_CODES[selectedBPack.category] || 'UNKNOWN', coverage_codes: covered.length ? Object.keys(packCoverage).filter(key => packCoverage[key]) : [], grams_per_100g: 10 }));
  }
  findings.push(energyFinding({ energy, need: daily_need, categories, feasibility: intake_feasibility }));
  const otherUnknownEnergy = energy.unknown.filter(name => !unresolvedNutrition.some(item => item.name === name));
  if (otherUnknownEnergy.length) findings.push(finding('notice', '部分能量密度仍待确认', `${otherUnknownEnergy.join('、')} 暂无可靠能量数值；系统已基于其余食材继续评分，当前总能量为保守下限。`, '补充生熟状态或包装营养标签后重新验证，可提高评估精度。', 'ENERGY_DENSITY_INCOMPLETE', 'energy', { ingredient_names: otherUnknownEnergy }));
  if (total > 1000) findings.push(finding('warning', '单次总量超过鲜食机建议上限', `当前总重量为 ${total}g。`, '拆分为不超过 1000g 的批次后再转换烹饪方案。', 'MACHINE_BATCH_LIMIT_EXCEEDED', 'cooking', { total_weight_g: total, maximum_weight_g: 1000 }));
  if (total < 30) findings.push(finding('notice', '食谱总量很低', `当前总重量仅 ${total}g，可能更接近零食或试吃。`, '确认食谱用途与每日总热量占比。', 'RECIPE_WEIGHT_TOO_LOW', 'nutrition', { total_weight_g: total, minimum_weight_g: 30 }));

  const danger = findings.filter(item => item.level === 'danger').length;
  const warning = findings.filter(item => item.level === 'warning').length;
  const safetyWarnings = findings.filter(item => item.domain === 'safety' && item.level === 'warning').length;
  const safety = score(100 - danger * 70 - safetyWarnings * 18);
  const structure = structureResult.score;
  const proteinAdequacy = macro_nutrition.per_1000_kcal.protein_g === null ? 0 : Math.min(100, macro_nutrition.per_1000_kcal.protein_g / macro_nutrition.standards.protein_min_g_per_1000kcal * 100);
  const fatAdequacy = macro_nutrition.per_1000_kcal.fat_g === null ? 0 : Math.min(100, macro_nutrition.per_1000_kcal.fat_g / macro_nutrition.standards.fat_min_g_per_1000kcal * 100);
  const macroAdequacy = (proteinAdequacy + fatAdequacy) / 2;
  const microCovered = categories.calcium.length || (
    packCoverage.vitamins
    && packCoverage.minerals
    && packCoverage.calcium
    && packCoverage.phosphorus
    && packCoverage.trace_minerals
    && packCoverage.fatty_acids
  );
  const microScore = microCovered ? 100 : mealIntent === 'long_term' ? 35 : 65;
  let completeness = score(macroAdequacy * 0.6 + microScore * 0.4);
  if (macro_nutrition.coverage.status === 'uncertain') completeness = Math.min(completeness, 60);
  const nutritionDeductions = [];
  if (proteinAdequacy < 100) nutritionDeductions.push({
    code: 'NUTRITION_PROTEIN_BELOW_STAGE',
    facts: {
      actual_g_per_1000kcal: macro_nutrition.per_1000_kcal.protein_g,
      minimum_g_per_1000kcal: macro_nutrition.standards.protein_min_g_per_1000kcal,
      stage_code: daily_need.stage_code,
    },
  });
  if (fatAdequacy < 100) nutritionDeductions.push({
    code: 'NUTRITION_FAT_BELOW_STAGE',
    facts: {
      actual_g_per_1000kcal: macro_nutrition.per_1000_kcal.fat_g,
      minimum_g_per_1000kcal: macro_nutrition.standards.fat_min_g_per_1000kcal,
      stage_code: daily_need.stage_code,
    },
  });
  if (microScore < 100) nutritionDeductions.push({ code: 'NUTRITION_MICRONUTRIENT_INCOMPLETE', facts: {} });
  if (macro_nutrition.coverage.status === 'uncertain') nutritionDeductions.push({
    code: 'NUTRITION_DATA_COVERAGE_INCOMPLETE',
    facts: { coverage_weight_pct: macro_nutrition.coverage.weight_pct },
  });
  const calorieScore = !daily_need.daily_kcal ? 50 : score(100 - Math.abs(energy.total_kcal - daily_need.daily_kcal) / daily_need.daily_kcal * 100);
  const energyScore = Math.min(calorieScore, intake_feasibility.score);
  const suitabilityDetail = petSuitability({ pet, findings, macros: macro_nutrition, energyScore, selectedBPack });
  const suitability = suitabilityDetail.value;
  let longTerm = Math.min(completeness, structure, energyScore, suitability);
  if (macro_nutrition.coverage.status === 'uncertain') longTerm = Math.min(longTerm, 60);
  const longTermFactors = [
    { key: 'nutrition', label_code: 'SCORE_NUTRITION_LABEL', adjustment_code: 'LONG_TERM_NUTRITION_ADJUSTMENT', label: '营养完整性', value: completeness, adjustment: '补齐当前阶段所需的宏量和微量营养。' },
    { key: 'structure', label_code: 'SCORE_STRUCTURE_LABEL', adjustment_code: 'LONG_TERM_STRUCTURE_ADJUSTMENT', label: '食谱结构平衡性', value: structure, adjustment: '按页面建议调整动物蛋白、内脏、碳水、果蔬和脂肪来源比例。' },
    { key: 'energy', label_code: 'SCORE_ENERGY_LABEL', adjustment_code: 'LONG_TERM_ENERGY_ADJUSTMENT', label: '能量需求满足度', value: energyScore, adjustment: '调整食谱总量或能量密度，使每日热量进入建议范围。' },
    { key: 'suitability', label_code: 'SCORE_SUITABILITY_LABEL', adjustment_code: 'LONG_TERM_SUITABILITY_ADJUSTMENT', label: '宠物适配性', value: suitability, adjustment: '幼犬或特殊阶段需随体重和月龄复核，并由专业人员确认长期方案。' },
  ];
  const limitingFactors = longTermFactors.filter(item => item.value === Math.min(...longTermFactors.map(factor => factor.value)));
  const isBlocked = danger > 0;
  const verdictCode = isBlocked ? 'SAFETY_RISK_BLOCKED' : warning ? 'ADJUSTMENT_REQUIRED' : 'NO_OBVIOUS_SAFETY_CONFLICT';
  return {
    pet: { id: pet.id, name: pet.name, weight_kg: Number(pet.current_weight_kg || pet.weight || 0), breed: pet.breed || '', life_stage: pet.life_stage || '', age_months: Number(pet.age_months || 0) },
    recipe: { ingredients, total_weight_g: total, meal_intent: mealIntent },
    b_pack_needed: bPackNeeded,
    daily_need: { ...daily_need, recipe_kcal: energy.total_kcal, recipe_kcal_per_gram: energy.kcal_per_gram ? Number(energy.kcal_per_gram.toFixed(2)) : null, calorie_match_score: calorieScore, intake_feasibility, unknown_ingredients: energy.unknown, energy_estimates: energy.estimates },
    macro_nutrition,
    score_details: {
      nutrition: {
        score: completeness,
        components: {
          protein: score(proteinAdequacy),
          fat: score(fatAdequacy),
          micronutrients: microScore,
        },
        deductions: nutritionDeductions,
      },
      structure: {
        score: structure,
        ratios: macro_nutrition.ingredient_weight_ratios,
        deductions: structureResult.deductions,
      },
      suitability: {
        score: suitability,
        deductions: suitabilityDetail.components
          .filter(item => item.earned < item.max)
          .map(item => ({ code: item.reason_code, points: Number((item.max - item.earned).toFixed(1)), facts: item.facts })),
      },
      energy: {
        score: energyScore,
        deductions: findings
          .filter(item => item.domain === 'energy' && item.level !== 'safe')
          .map(item => ({ code: item.code, facts: item.facts })),
      },
      safety: {
        score: safety,
        deductions: findings
          .filter(item => item.domain === 'safety' && item.level !== 'safe')
          .map(item => ({ code: item.code, facts: item.facts })),
      },
      long_term: {
        score: longTerm,
        limiting_factors: limitingFactors.map(item => ({ key: item.key, value: item.value })),
      },
    },
    suitability_detail: suitabilityDetail,
    long_term_detail: {
      score: longTerm,
      limiting_factors: limitingFactors.map(item => ({ key: item.key, label_code: item.label_code, adjustment_code: item.adjustment_code, label: item.label, value: item.value })),
      explanation_code: 'LONG_TERM_LIMITING_FACTORS',
      explanation_facts: { factors: limitingFactors.map(item => ({ key: item.key, value: item.value })) },
      explanation: `当前长期适宜性主要受${limitingFactors.map(item => `${item.label}${item.value}分`).join('、')}限制。`,
      adjustment_codes: [...new Set(limitingFactors.map(item => item.adjustment_code))],
      adjustments: [...new Set(limitingFactors.map(item => item.adjustment))],
      professional_confirmation_required: profileNotice(pet, ingredients).length > 0,
    },
    scores: [
      { key: 'safety', label_code: 'SCORE_SAFETY_LABEL', label: '食材安全性', value: safety },
      { key: 'suitability', label_code: 'SCORE_SUITABILITY_LABEL', label: '宠物适配性', value: suitability },
      { key: 'structure', label_code: 'SCORE_STRUCTURE_LABEL', label: '食谱结构平衡性', value: structure },
      { key: 'nutrition', label_code: 'SCORE_NUTRITION_LABEL', label: '营养完整性', value: completeness },
      { key: 'long_term', label_code: 'SCORE_LONG_TERM_LABEL', label: '长期适宜性', value: longTerm },
      { key: 'energy', label_code: 'SCORE_ENERGY_LABEL', label: '能量需求满足度', value: energyScore },
    ],
    findings,
    verdict_code: verdictCode,
    verdict: isBlocked ? '需先处理红色安全风险后再继续。' : warning ? '存在需要调整的项目，请按建议修改后重新验证。' : '未发现明显安全冲突；长期喂养前仍需专业人员确认营养完整性。',
    cooking_plan: !isBlocked && warning === 0 && total <= 1000 ? { total_weight_g: total, temperature_c: 85, cook_minutes: Math.max(8, Math.round(total / 25)), note_code: 'COOKING_PLAN_AWAITING_CONFIRMATION_NOT_SENT', note: '这是待人工确认的鲜食机烹饪参数，尚未下发设备。' } : null,
  };
}

async function recognizeFreshCheck({ text }) {
  const fallback = normalizeIngredients(String(text || '').split(/[\n,，;；]+/).map(part => {
    const match = part.match(/^\s*(.+?)\s*(\d+(?:\.\d+)?)\s*(?:g|克)?\s*$/i);
    return match ? { name: match[1], grams: Number(match[2]) } : null;
  }).filter(Boolean));
  try {
    const ai = await recognizeFreshCheckRecipe({ text });
    const ingredients = normalizeIngredients(ai?.ingredients);
    return { ingredients: ingredients.length ? ingredients : fallback, source: 'deepseek' };
  } catch (error) {
    return { ingredients: fallback, source: 'local', warning: '未能智能识别，请检查后手动编辑。' };
  }
}

async function buildFreshCheckAnalysis({ pet, ingredients, meal_intent, b_pack_category }, dependencies = {}) {
  const bPacks = await getFreshCheckBPackOptions(pet);
  const ingredientLibrary = await getIngredientMap();
  const normalizedIngredients = normalizeIngredients(ingredients);
  const deterministicFacts = normalizedIngredients.map(deterministicIngredientFact).filter(Boolean);
  const lookupCandidates = normalizedIngredients.filter(item => !isPlainWater(item.name) && !matchIngredientRecord(item.name, ingredientLibrary.ingredients) && !isDeterministicDanger(item.name));
  let ingredientFacts = deterministicFacts;
  let energyLookupSource = lookupCandidates.length ? 'unresolved' : 'local_database';
  let lookupMeta = { status: 'available', retried_ingredients: [], unresolved_ingredients: [] };
  if (lookupCandidates.length) {
    try {
      lookupMeta = await lookupIngredientFactsWithRetry(lookupCandidates.map(item => ({ name: item.name, grams: item.grams })), dependencies.lookupFreshCheckIngredientFacts || lookupFreshCheckIngredientFacts);
      ingredientFacts = [...deterministicFacts, ...lookupMeta.facts];
      if (lookupMeta.facts.some(hasNutritionValues)) energyLookupSource = lookupMeta.unresolved_ingredients.length ? 'deepseek_partial' : 'deepseek';
    } catch (_) {
      ingredientFacts = [...deterministicFacts, ...lookupCandidates.map(item => ({ name: item.name, is_food: null, dog_safety: null, kcal_per_100g: null, category: 'unknown', protein_pct: null, fat_pct: null, carb_pct: null, confidence: 'low', basis: '', lookup_attempts: 2, nutrition_unresolved: true }))];
      lookupMeta = { status: 'service_unavailable', retried_ingredients: lookupCandidates.map(item => item.name), unresolved_ingredients: lookupCandidates.map(item => item.name) };
    }
  }
  const requestedCategory = clean(b_pack_category);
  const selectedBPack = selectBPackOption(bPacks.options, requestedCategory);
  if (requestedCategory && (!selectedBPack || !selectedBPack.enabled)) {
    const error = new Error(selectedBPack?.reason || '所选全价营养包不存在或不适合当前宠物档案');
    error.status = 400;
    throw error;
  }
  const local = localCheck({ pet, ingredients: normalizedIngredients, mealIntent: meal_intent, selectedBPack, ingredientFacts, ingredientMap: ingredientLibrary.ingredients, ingredientLookupStatus: lookupMeta.status });
  local.ingredient_library = { source: ingredientLibrary.source };
  local.energy_lookup = { source: energyLookupSource, status: lookupMeta.status, queried_ingredients: lookupCandidates.map(item => item.name), retried_ingredients: lookupMeta.retried_ingredients, unresolved_ingredients: lookupMeta.unresolved_ingredients };
  local.b_pack = {
    source: bPacks.source,
    needed: local.b_pack_needed,
    selected: selectedBPack,
    application: selectedBPack ? bPackApplication(local.recipe.total_weight_g) : null,
    options: bPacks.options,
  };
  try {
    const ai = await analyzeFreshCheck({ pet, report: local });
    if (clean(ai?.summary)) local.ai_summary = clean(ai.summary);
    if (ai?.macro_assessment && typeof ai.macro_assessment === 'object') local.ai_macro_assessment = ai.macro_assessment;
  } catch (_) { /* deterministic report remains the safe fallback */ }
  return local;
}

module.exports = {
  recognizeFreshCheck,
  buildFreshCheckAnalysis,
  getFreshCheckBPackOptions,
  evaluateRecipe: localCheck,
  _test: { calculateMacroNutrition, structureAssessment, dailyEnergyNeed, intakeFeasibility, localCheck, normalizeIngredientFacts, lookupIngredientFactsWithRetry, hasNutritionValues, bPackApplication, selectBPackOption, deterministicIngredientFact, classifyRecipe },
};
