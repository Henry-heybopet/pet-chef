const { analyzeFreshMatch, classifyFreshMatchIngredients } = require('./deepseek');

const FORBIDDEN_DOG_INGREDIENTS = [
  '木糖醇', '巧克力', '可可制品', '含咖啡因食品', '咖啡因', '葡萄', '葡萄干', '洋葱', '大蒜',
  '韭菜', '大葱', '夏威夷果', '牛油果', '苹果籽', '樱桃核', '桃核', '李子核', '酒精', '发酵面团',
];

const INEDIBLE_INGREDIENTS = [
  '水泥', '木头', '木块', '混凝土', '推土机', '塑料', '金属', '玻璃', '泥土', '沙子', '石头',
  '清洁剂', '洗洁精', '洗衣液', '肥皂', '药品', '药片', '水杯', '杯子', '手机', '钥匙',
];

const ALLERGEN_ALIASES = {
  鸡肉: ['鸡肉', '鸡胸', '鸡胸肉', '鸡大胸', '鸡小胸', '鸡腿', '鸡腿肉', '鸡翅', '鸡翅中', '鸡翅根', '鸡肝', '鸡心', '鸡胗', '鸡头'],
  牛肉: ['牛肉', '牛心', '牛肝', '牛舌', '牛舌头', '牛腩', '牛腱', '牛排', '牛里脊', '牛肉末'],
  鸭肉: ['鸭肉', '鸭胸', '鸭腿', '鸭翅', '鸭肝', '鸭心'],
  鱼肉: ['鱼', '鱼肉', '黄花鱼', '鳕鱼', '三文鱼', '鲑鱼', '金枪鱼', '吞拿鱼', '鲈鱼', '鲅鱼'],
  羊肉: ['羊肉', '羊肝', '羊心', '羊腿', '羊排'],
  猪肉: ['猪肉', '猪肝', '猪心', '猪里脊', '猪腿'],
  燕麦: ['燕麦', '燕麦片', '麦', '麸质', '谷物'],
};

const VEGETABLE_PRIORITY = ['南瓜', '胡萝卜', '西葫芦', '西兰花'];
const FRUIT_PRIORITY = ['蓝莓', '苹果', '香蕉'];
const CARB_PRIORITY = ['红薯', '藜麦', '土豆', '燕麦', '糙米'];
const LOW_PRIORITY_CARBS = ['小米', '玉米'];
const LEAFY_VEGETABLES = ['菠菜', '生菜', '油麦菜', '上海青', '青菜', '白菜', '羽衣甘蓝'];
const HIGH_FIBER_VEGETABLES = ['南瓜', '胡萝卜', '西兰花', '西葫芦'];
const PROTEIN_TERMS = [
  ...Object.entries(ALLERGEN_ALIASES).filter(([key]) => key !== '燕麦').flatMap(([key, aliases]) => [key, ...aliases]),
  '鸡蛋', '鸭蛋', '鹌鹑蛋', '蛋', '虾', '虾仁',
];
const VEGETABLE_FRUIT_TERMS = [
  ...VEGETABLE_PRIORITY, ...FRUIT_PRIORITY, ...LEAFY_VEGETABLES, ...HIGH_FIBER_VEGETABLES,
  '番茄', '西红柿', '黄瓜', '芹菜', '甜椒', '紫甘蓝',
];
const CARB_TERMS = [...CARB_PRIORITY, ...LOW_PRIORITY_CARBS, '米饭', '大米', '白米饭', '南瓜'];

const PREP_TIPS = '食材预处理建议：肉类请去骨，切成约1立方厘米小块；鱼类请去骨、去刺，切成约1立方厘米小块；青菜、果蔬请洗净后切成约1立方厘米小块。';

function normalizeList(value) {
  if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean);
  return String(value || '').split(/[,，、;；\s\n]+/).map(item => item.trim()).filter(Boolean);
}

function normalizeIngredients(ingredients = {}) {
  const classified = { proteins: [], vegetables_fruits: [], carbs: [], unknown: [], all_inputs: [] };
  const add = (key, item) => {
    if (!classified[key].some(value => includesIngredient(value, item))) classified[key].push(item);
  };
  const classify = (item) => {
    classified.all_inputs.push(item);
    if (PROTEIN_TERMS.some(term => includesIngredient(item, term))) add('proteins', item);
    else if (CARB_TERMS.some(term => includesIngredient(item, term))) add('carbs', item);
    else if (VEGETABLE_FRUIT_TERMS.some(term => includesIngredient(item, term))) add('vegetables_fruits', item);
    else add('unknown', item);
  };
  [
    ...normalizeList(ingredients.proteins),
    ...normalizeList(ingredients.vegetables_fruits),
    ...normalizeList(ingredients.carbs),
  ].forEach(classify);
  return classified;
}

function rawIngredients(ingredients = {}) {
  return {
    proteins: normalizeList(ingredients.proteins),
    vegetables_fruits: normalizeList(ingredients.vegetables_fruits),
    carbs: normalizeList(ingredients.carbs),
  };
}

function normalizeRemovedItems(items = []) {
  return items
    .map(item => ({
      name: String(item?.name || '').trim(),
      reason: String(item?.reason || '').trim(),
      type: String(item?.type || 'inedible').trim(),
    }))
    .filter(item => item.name);
}

async function classifyIngredients(ingredients = {}) {
  const raw = rawIngredients(ingredients);
  if (process.env.FRESH_MATCH_AI_CLASSIFY === 'off') {
    return {
      ingredients: normalizeIngredients(raw),
      removed: [],
      source: 'rules',
    };
  }
  try {
    const ai = await classifyFreshMatchIngredients({ ingredients: raw });
    const usable = ai?.usable || {};
    return {
      ingredients: normalizeIngredients(usable),
      removed: normalizeRemovedItems(ai?.removed),
      source: 'deepseek',
    };
  } catch (error) {
    if (process.env.DEEPSEEK_API_KEY) console.error('Fresh Match ingredient classification fallback:', error.message);
    return {
      ingredients: normalizeIngredients(raw),
      removed: [],
      source: 'rules',
    };
  }
}

function includesIngredient(input, target) {
  return input === target || input.includes(target) || target.includes(input);
}

function findMatches(inputs, candidates) {
  return [...new Set(inputs.filter(input => candidates.some(candidate => includesIngredient(input, candidate))))];
}

function findBlockedInputs(inputs, candidates) {
  return [...new Set(inputs.filter(input => candidates.some(candidate => input === candidate || input.includes(candidate))))];
}

function priorityIndex(item, priority) {
  const index = priority.findIndex(name => includesIngredient(item, name));
  return index === -1 ? priority.length : index;
}

function sortByPriority(items, priority) {
  return [...items].sort((a, b) => priorityIndex(a, priority) - priorityIndex(b, priority));
}

function isFruit(item) {
  return FRUIT_PRIORITY.some(name => includesIngredient(item, name));
}

function isLowPriorityCarb(item) {
  return LOW_PRIORITY_CARBS.some(name => includesIngredient(item, name));
}

function isFishProtein(item) {
  return ['鱼', '鱼肉', '三文鱼', '金枪鱼', '鳕鱼'].some(name => includesIngredient(item, name));
}

function mealCountFor(pet) {
  const months = Number(pet.age_months || 0);
  if (months && months < 6) return 4;
  if (months && months < 12) return 3;
  return 2;
}

function allergenTerms(allergen) {
  const value = String(allergen || '').trim();
  const matchedKey = Object.keys(ALLERGEN_ALIASES).find(key => includesIngredient(value, key) || ALLERGEN_ALIASES[key].some(alias => includesIngredient(value, alias)));
  return matchedKey ? ALLERGEN_ALIASES[matchedKey] : [value];
}

function findAllergyMatches(inputs, allergens) {
  return inputs.flatMap(input => normalizeList(allergens)
    .filter(allergen => allergenTerms(allergen).some(term => includesIngredient(input, term)))
    .map(allergen => ({ name: input, allergen })));
}

function petAgeYears(pet) {
  if (pet.age_months) return Number((Number(pet.age_months) / 12).toFixed(1));
  return null;
}

function petDTO(pet) {
  return {
    id: pet.id,
    name: pet.name,
    avatar: pet.avatar_url || pet.avatar || '',
    breed: pet.breed || '',
    age: petAgeYears(pet),
    weight_kg: Number(pet.current_weight_kg || pet.weight || 0),
  };
}

function safetyCheck(ingredients, allergens = [], removedItems = []) {
  const allInputs = ingredients.all_inputs || [...ingredients.proteins, ...ingredients.vegetables_fruits, ...ingredients.carbs];
  const forbidden = findBlockedInputs(allInputs, FORBIDDEN_DOG_INGREDIENTS);
  const inedible = findBlockedInputs(allInputs, INEDIBLE_INGREDIENTS);
  const allergy = findAllergyMatches(allInputs, allergens);
  const aiBlockedItems = normalizeRemovedItems(removedItems).map(item => ({
    name: item.name,
    level: 'danger',
    message: item.type === 'unsafe'
      ? `检测到犬类禁食食材：${item.name}。${item.reason || '该食材禁止给狗食用，请立即移除。'}`
      : `检测到非犬类可食用食材：${item.name}。${item.reason || '不能给狗食用，请立即移除。'}`,
  }));
  const alreadyBlocked = new Set(aiBlockedItems.map(item => item.name));
  const forbidden_items = aiBlockedItems.concat(forbidden.filter(name => !alreadyBlocked.has(name)).map(name => ({
    name,
    level: 'danger',
    message: `检测到犬类禁食食材：${name}。该食材绝对禁止给狗食用，请立即移除。`,
  }))).concat(inedible.filter(name => !alreadyBlocked.has(name)).map(name => ({
    name,
    level: 'danger',
    message: `检测到非犬类可食用食材：${name}。不能给狗食用，请立即移除。`,
  })));
  const allergy_items = allergy.map(match => ({
    name: match.name,
    allergen: match.allergen,
    level: 'warning',
    message: `检测到该宠物档案记录的过敏食材：${match.allergen}，命中本次输入：${match.name}。本次配方将自动排除该食材。`,
  }));
  return {
    forbidden_items,
    allergy_items,
    summary: forbidden_items.length
      ? `检测到不能给狗食用的食材：${forbidden_items.map(item => item.name).join('、')}。请立即移除。`
      : allergy.length
        ? `检测到该宠物档案记录的过敏食材：${[...new Set(allergy.map(item => item.allergen))].join('、')}。本次配方将自动排除相关食材。`
        : '未发现明显禁食或过敏冲突，但首次尝试新食材仍建议少量观察。',
  };
}

function nutritionGap(ingredients, allergens = []) {
  const protein = ingredients.proteins.length ? 'sufficient' : 'missing';
  const vegetables_fruits = ingredients.vegetables_fruits.length ? 'sufficient' : 'missing';
  const carbs = ingredients.carbs.length ? 'sufficient' : 'missing';
  let message = '营养成分较完整，请参考下列具体配方的营养比例配比。';
  if (protein === 'missing') message = '本次食材缺少主要蛋白质来源，暂不建议生成完整鲜食主餐。';
  else if (vegetables_fruits === 'missing') message = '本次食材缺少果蔬来源，膳食纤维和部分微量营养可能不足。';
  else if (carbs === 'missing') {
    const suggestions = ['红薯', '南瓜', '米饭', '燕麦'].filter(item => !normalizeList(allergens).some(allergen => includesIngredient(item, allergen)));
    message = `当前食材缺少主食/碳水来源。可以继续生成临时低碳鲜食餐，但不建议作为长期日常主食。建议补充：${suggestions.join('、')}。`;
  }
  return { protein, vegetables_fruits, carbs, message };
}

function removeUnsafe(ingredients, safety) {
  const blocked = [...safety.forbidden_items, ...safety.allergy_items].map(item => item.name);
  const keep = item => !blocked.some(blockedItem => includesIngredient(item, blockedItem));
  return {
    proteins: ingredients.proteins.filter(keep),
    vegetables_fruits: ingredients.vegetables_fruits.filter(keep),
    carbs: ingredients.carbs.filter(keep),
  };
}

function distribute(total, names, ratioTotal, category, weights = {}) {
  const selected = names.filter(Boolean);
  const totalWeight = selected.reduce((sum, name) => sum + (weights[name] || 1), 0) || 1;
  let used = 0;
  return selected.map((name, index) => {
    const weight_g = index === selected.length - 1
      ? Math.max(1, Math.round(total * ratioTotal) - used)
      : Math.max(1, Math.round(total * ratioTotal * ((weights[name] || 1) / totalWeight)));
    used += weight_g;
    return { name, weight_g, category };
  });
}

function selectPlantFoods(safeIngredients) {
  const vegetables = sortByPriority(safeIngredients.vegetables_fruits.filter(item => !isFruit(item)), VEGETABLE_PRIORITY).slice(0, 3);
  const fruit = sortByPriority(safeIngredients.vegetables_fruits.filter(isFruit), FRUIT_PRIORITY).slice(0, 1);
  const preferredCarbs = sortByPriority(safeIngredients.carbs.filter(item => !isLowPriorityCarb(item)), CARB_PRIORITY);
  const backupCarbs = sortByPriority(safeIngredients.carbs.filter(isLowPriorityCarb), LOW_PRIORITY_CARBS);
  return {
    vegetables,
    fruit,
    carbs: [...preferredCarbs, ...backupCarbs].slice(0, 2),
  };
}

function grams(total, protein, carbNames, vegetableNames, fruitNames) {
  const vegWeights = Object.fromEntries(vegetableNames.map(name => [
    name,
    (LEAFY_VEGETABLES.some(item => includesIngredient(name, item)) || HIGH_FIBER_VEGETABLES.some(item => includesIngredient(name, item))) ? 1.25 : 1,
  ]));
  const items = [];
  if (protein) items.push({ name: protein, weight_g: Math.round(total * 0.62), category: 'protein' });
  items.push(...distribute(total, carbNames, carbNames.length ? 0.22 : 0, 'carb'));
  items.push(...distribute(total, vegetableNames, vegetableNames.length ? 0.12 : 0, 'vegetable', vegWeights));
  items.push(...distribute(total, fruitNames, fruitNames.length ? 0.04 : 0, 'fruit'));
  const diff = total - items.reduce((sum, item) => sum + item.weight_g, 0);
  if (diff && items[0]) items[0].weight_g += diff;
  return items.map(item => ({ ...item, ratio: `${((item.weight_g / total) * 100).toFixed(1)}%` }));
}

function calciumFor(ingredients) {
  const protein = ingredients.filter(item => item.category === 'protein').reduce((sum, item) => sum + item.weight_g, 0);
  const organ = ingredients.filter(item => item.category === 'organ').reduce((sum, item) => sum + item.weight_g, 0);
  const carb = ingredients.filter(item => item.category === 'carb').reduce((sum, item) => sum + item.weight_g, 0);
  return {
    calcium_carbonate_g: Number((protein * 0.0058 + organ * 0.0069 + carb * 0.0108).toFixed(2)),
    calcium_citrate_g: Number((protein * 0.0110 + organ * 0.0132 + carb * 0.0205).toFixed(2)),
  };
}

function localRecipes(pet, safeIngredients) {
  if (!safeIngredients.proteins.length) return [];
  const total = Math.min(1000, Math.max(180, Math.round((Number(pet.current_weight_kg || 10) || 10) * 25)));
  const proteins = [...safeIngredients.proteins].sort((a, b) => Number(isFishProtein(b)) - Number(isFishProtein(a)));
  const plants = selectPlantFoods(safeIngredients);
  return [0, 1, 2].map(index => {
    const protein = proteins[index % proteins.length];
    const carbOffset = plants.carbs.length > 1 ? index % plants.carbs.length : 0;
    const carbNames = plants.carbs.length ? [plants.carbs[carbOffset], plants.carbs[(carbOffset + 1) % plants.carbs.length]].filter((item, itemIndex, list) => list.indexOf(item) === itemIndex) : [];
    const vegetableNames = plants.vegetables.slice(0, Math.min(3, Math.max(2, plants.vegetables.length)));
    const fruitNames = plants.fruit;
    const ingredients = grams(total, protein, carbNames, vegetableNames, fruitNames);
    const plantNames = [...carbNames, ...vegetableNames, ...fruitNames].join('、') || '现有安全食材';
    const thirdName = isFishProtein(protein)
      ? `${protein}亮毛餐`
      : `${fruitNames[0] || vegetableNames[0] || protein}均衡餐`;
    return {
      id: `recipe_${index + 1}`,
      name: [`轻盈${protein}餐`, `${carbNames[0] || protein}活力餐`, thirdName][index],
      total_weight_g: total,
      reason: `单一${protein}蛋白，搭配${plantNames}，适合按当前档案保守试做。`,
      ingredients,
      nutrition_note: '蛋白质来源清晰，配比保守，适合作为短期鲜食参考。',
      calcium: calciumFor(ingredients),
    };
  });
}

function validRecipes(value) {
  return Array.isArray(value) && value.length >= 3 && value.every(recipe =>
    recipe && recipe.name && Number(recipe.total_weight_g) > 0 && Array.isArray(recipe.ingredients)
  );
}

function sanitizeRecipes(recipes, safeIngredients, pet) {
  const allowed = new Set([...safeIngredients.proteins, ...safeIngredients.vegetables_fruits, ...safeIngredients.carbs]);
  const fallbackRecipes = localRecipes(pet, safeIngredients);
  return recipes.slice(0, 3).map((recipe, index) => {
    const ingredients = recipe.ingredients
      .filter(item => allowed.has(item.name))
      .map(item => ({ ...item, weight_g: Math.round(Number(item.weight_g) || 0) }))
      .filter(item => item.weight_g > 0);
    if (!ingredients.length) return fallbackRecipes[index];
    const total = Math.min(1000, ingredients.reduce((sum, item) => sum + item.weight_g, 0));
    const hasFish = ingredients.some(item => isFishProtein(item.name));
    const cleanName = String(recipe.name).replace(/羹|泥/g, '餐');
    return {
      id: recipe.id || `recipe_${index + 1}`,
      name: !hasFish && cleanName.includes('亮毛') ? cleanName.replace(/亮毛/g, '均衡') : cleanName,
      total_weight_g: total,
      reason: recipe.reason || '基于当前宠物档案和安全食材生成。',
      ingredients: ingredients.map(item => ({ ...item, ratio: `${((item.weight_g / total) * 100).toFixed(1)}%` })),
      nutrition_note: recipe.nutrition_note || '请作为鲜食参考，首次尝试少量观察。',
      calcium: calciumFor(ingredients),
    };
  }).filter(Boolean);
}

async function buildFreshMatchAnalysis({ pet, ingredients }) {
  const classified = await classifyIngredients(ingredients);
  const normalized = classified.ingredients;
  const safety = safetyCheck(normalized, pet.allergens || [], classified.removed);
  const safeIngredients = removeUnsafe(normalized, safety);
  const gap = nutritionGap(safeIngredients, pet.allergens || []);
  let recipes = localRecipes(pet, safeIngredients);
  try {
    if (safeIngredients.proteins.length) {
      const ai = await analyzeFreshMatch({ pet, ingredients: safeIngredients, safety_check: safety, nutrition_gap: gap });
      if (validRecipes(ai?.recipes)) recipes = sanitizeRecipes(ai.recipes, safeIngredients, pet);
    }
  } catch (error) {
    if (process.env.DEEPSEEK_API_KEY) console.error('Fresh Match DeepSeek fallback:', error.message);
  }
  const machine_limit_notice = recipes.some(recipe => recipe.total_weight_g >= 1000)
    ? '受制于鲜食机处理能力，食谱的最大克重不能超过1000克。'
    : '';
  const daily = recipes[0]?.total_weight_g || 0;
  const meals = mealCountFor(pet);
  return {
    pet: petDTO(pet),
    feeding_plan: daily ? { daily_grams: daily, meals_per_day: meals, per_meal_grams: Math.round(daily / meals) } : null,
    safety_check: safety,
    nutrition_gap: gap,
    recipes,
    machine_limit_notice,
    prep_tips: PREP_TIPS,
  };
}

if (require.main === module) {
  process.env.FRESH_MATCH_AI_CLASSIFY = 'off';
  const assert = require('assert');
  const pet = { id: 'p1', name: 'Cici', breed: '史宾格犬', current_weight_kg: 50, allergens: ['燕麦', '牛肉', '鸡肉'] };
  buildFreshMatchAnalysis({ pet, ingredients: { proteins: ['鸡胸肉', '牛心', '鸡蛋'], vegetables_fruits: ['葡萄', '胡萝卜'], carbs: [] } })
    .then(result => {
      assert.equal(result.safety_check.forbidden_items[0].name, '葡萄');
      assert(result.safety_check.allergy_items.some(item => item.name === '牛心' && item.allergen === '牛肉'));
      assert(result.safety_check.allergy_items.some(item => item.name === '鸡胸肉' && item.allergen === '鸡肉'));
      assert(!result.safety_check.allergy_items.some(item => item.name === '鸡蛋' && item.allergen === '鸡肉'));
      assert(!result.nutrition_gap.message.includes('燕麦'));
      assert(result.recipes.every(recipe => recipe.ingredients.every(item => !['牛心', '鸡胸肉'].includes(item.name))));
      assert(result.recipes.every(recipe => recipe.total_weight_g <= 1000));
      return buildFreshMatchAnalysis({ pet, ingredients: { proteins: ['鸡腿', '鸡肝', '鸡头'], vegetables_fruits: ['菠菜'], carbs: ['米饭'] } });
    })
    .then(result => {
      assert.equal(result.nutrition_gap.protein, 'missing');
      assert.equal(result.recipes.length, 0);
      return buildFreshMatchAnalysis({
        pet: { ...pet, allergens: [] },
        ingredients: {
          proteins: ['鸭肉'],
          vegetables_fruits: ['菠菜', '蓝莓', '苹果', '西兰花', '胡萝卜', '南瓜'],
          carbs: ['玉米', '红薯', '藜麦', '小米'],
        },
      });
    })
    .then(result => {
      const recipe = result.recipes[0];
      const names = recipe.ingredients.map(item => item.name);
      assert(names.includes('红薯'));
      assert(names.includes('藜麦'));
      assert(!names.includes('玉米'));
      assert(!names.includes('小米'));
      assert.equal(recipe.ingredients.filter(item => item.category === 'fruit').length, 1);
      assert(recipe.ingredients.filter(item => item.category === 'fruit').every(item => Number.parseFloat(item.ratio) < 5));
      assert(recipe.ingredients.filter(item => item.category === 'vegetable').length >= 2);
      return buildFreshMatchAnalysis({
        pet: { ...pet, allergens: [] },
        ingredients: { proteins: ['鸡肉'], vegetables_fruits: ['胡萝卜', '燕麦', '南瓜', '苹果'], carbs: [] },
      });
    })
    .then(result => {
      assert.equal(result.safety_check.forbidden_items.length, 0);
      assert.equal(result.nutrition_gap.carbs, 'sufficient');
      assert(result.recipes[0].ingredients.some(item => item.name === '燕麦' && item.category === 'carb'));
      assert(result.recipes[0].ingredients.some(item => item.name === '南瓜' && item.category === 'carb'));
      return buildFreshMatchAnalysis({
        pet: { ...pet, allergens: [] },
        ingredients: { proteins: ['水泥', '木头'], vegetables_fruits: ['混凝土'], carbs: ['推土机'] },
      });
    })
    .then(result => {
      assert.equal(result.safety_check.forbidden_items.length, 4);
      assert.equal(result.nutrition_gap.protein, 'missing');
      assert.equal(result.recipes.length, 0);
      console.log('fresh_match self-check ok');
    });
}

module.exports = { buildFreshMatchAnalysis, normalizeIngredients, FORBIDDEN_DOG_INGREDIENTS };
