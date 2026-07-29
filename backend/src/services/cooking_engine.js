// cooking_engine.js — 烹饪参数计算引擎
// 基于3组实测数据推导的计算模型

const { ingredientsDb } = require('../data/ingredients_db');
const { feedingPlanForRecipe } = require('./nutrition_energy');

/**
 * 计算食谱的平均含水量
 * @param {Object} ingredients - { 食材名: 百分比 }
 * @returns {number} 含水量 0~1
 */
function calcWaterContent(ingredients, ingredientMap = ingredientsDb) {
  let totalWeight = 0, totalWater = 0;
  Object.entries(ingredients).forEach(([name, pct]) => {
    if (typeof pct !== 'number') return;
    const ing = ingredientMap[name];
    const waterPct = ing ? ing.water_pct : 0.70;
    totalWeight += pct;
    totalWater += pct * waterPct;
  });
  return totalWeight > 0 ? totalWater / totalWeight : 0.70;
}

const COOK_MINUTES_BY_WEIGHT = Object.freeze({
  200: 15,
  300: 18,
  400: 21,
  500: 25,
  600: 29,
  700: 34,
  800: 39,
});

function cookingDuration(recipe, totalGrams) {
  const grams = Number(totalGrams);
  if (!Number.isFinite(grams) || grams <= 0 || grams > 800) {
    const error = new Error('totalGrams must be between 1 and 800');
    error.code = 'INVALID_COOK_WEIGHT';
    throw error;
  }

  const weight_bucket_grams = Math.max(100, Math.ceil(grams / 100) * 100);
  const configured100gMinutes = Number(recipe?.cooking_base?.cook_minutes);
  const hasConfigured100gMinutes = Number.isFinite(configured100gMinutes) && configured100gMinutes > 0;
  const base_cook_minutes = hasConfigured100gMinutes
    ? configured100gMinutes
    : 10;
  const cook_minutes = weight_bucket_grams === 100
    ? base_cook_minutes
    : COOK_MINUTES_BY_WEIGHT[weight_bucket_grams];

  return {
    base_cook_minutes,
    cook_minutes,
    weight_bucket_grams,
    duration_source: weight_bucket_grams === 100 && hasConfigured100gMinutes
      ? 'recipe_100g'
      : weight_bucket_grams === 100 ? 'fallback_100g' : 'standard_weight_table',
  };
}

function calcCookingParams(recipe, totalGrams) {
  const { cooking_base, ingredients, water_content_pct } = recipe;
  
  // 加水量（食材总量的15%）
  const waterGrams = Math.round(totalGrams * cooking_base.water_ratio);
  
  const {
    base_cook_minutes,
    cook_minutes,
    weight_bucket_grams,
    duration_source,
  } = cookingDuration(recipe, totalGrams);
  const cook_seconds = Math.round(cook_minutes * 60);
  const total_seconds = cook_seconds;
  
  // ——— 阶段时间分配 ———
  const stages = [
    {
      id: 'load',
      name: '放入食材',
      desc: `切成约1cm³小块后放入，并加入 ${waterGrams}g 清水`,
      seconds: 0, // 用户操作，不计时
      display: '用户操作',
    },
    {
      id: 'cook',
      name: '低温烹饪',
      desc: `以 ${cooking_base.temperature}℃、${cooking_base.speed}档（60转/分钟）从启动开始同步加热搅拌`,
      seconds: cook_seconds,
      display: `约${cook_minutes}分钟`,
    },
    {
      id: 'done',
      name: '烹饪完成',
      desc: '鲜食已制作完成，稍作冷却后即可喂食',
      seconds: 0,
      display: '完成！',
    },
  ];

  return {
    totalGrams,
    waterGrams,
    mode: cooking_base.mode,
    temperature: cooking_base.temperature,
    power: cooking_base.power,
    speed: cooking_base.speed,
    base_cook_minutes,
    weight_bucket_grams,
    duration_source,
    cook_minutes,
    cook_seconds,
    total_seconds,
    stages,
  };
}

/**
 * 计算每日食量和每餐食量
 * @param {Object} breedInfo - 犬种信息（含 intake_factor 和 activity）
 * @param {number} weight - 体重(kg)
 * @param {number} age - 年龄(岁)
 * @returns {Object} { daily_grams, meals_per_day, per_meal_grams, activity_level, intake_factor }
 */
function calcDailyIntake(breedInfo, weight, age) {
  const activity = breedInfo?.activity || 'medium';
  const intakeFactor = breedInfo?.intake_factor || { low: 20, medium: 25, high: 30 };
  
  // 年龄修正
  let ageMultiplier = 1.0;
  let meals = 2;
  if (age < 0.5) { ageMultiplier = 1.8; meals = 4; } // 幼犬 <6月
  else if (age < 1) { ageMultiplier = 1.5; meals = 3; } // 幼犬 6-12月
  else if (age >= 8) { ageMultiplier = 0.85; meals = 2; } // 老年犬
  
  // 活跃度系数
  const activityMap = {
    'low': intakeFactor.low,
    'medium': intakeFactor.medium,
    'high': intakeFactor.high,
    'very_high': Math.round(intakeFactor.high * 1.15),
  };
  const baseFactor = activityMap[activity] || intakeFactor.medium;
  
  const daily = Math.round(weight * baseFactor * ageMultiplier);
  const perMeal = Math.round(daily / meals);
  
  return {
    daily_grams: daily,
    meals_per_day: meals,
    per_meal_grams: perMeal,
    activity_level: activity,
    intake_factor_used: baseFactor,
    age_multiplier: ageMultiplier,
  };
}

function calcRecipeFeedingPlan(pet, recipe, ingredientMap = ingredientsDb) {
  return feedingPlanForRecipe(pet, recipe, ingredientMap);
}

/**
 * 将食谱百分比配比转为实际克数
 * @param {Object} ingredients - { 食材名: 百分比 }
 * @param {number} totalGrams - 总克数
 * @returns {Array} [{ name, pct, grams }]
 */
function calcIngredientGrams(ingredients, totalGrams) {
  const entries = Object.entries(ingredients);
  const numericEntries = entries.filter(([, pct]) => typeof pct === 'number' && pct > 0);
  const totalPct = numericEntries.reduce((sum, [, pct]) => sum + pct, 0);
  const roundedTotal = Math.max(0, Math.round(totalGrams));
  const allocations = numericEntries.map(([name, pct], index) => {
    const rawGrams = totalPct ? pct / totalPct * roundedTotal : 0;
    return { name, index, pct, rawGrams, grams: Math.floor(rawGrams) };
  });
  let remainder = roundedTotal - allocations.reduce((sum, item) => sum + item.grams, 0);
  [...allocations]
    .sort((a, b) => (b.rawGrams - b.grams) - (a.rawGrams - a.grams) || a.index - b.index)
    .forEach(item => {
      if (remainder <= 0) return;
      item.grams += 1;
      remainder -= 1;
    });
  const byName = new Map(allocations.map(item => [item.name, item]));
  return entries.map(([name, pct]) => {
    const allocation = byName.get(name);
    if (!allocation) return { name, pct: null, grams: null, note: '微量' };
    return {
      name,
      pct: Math.round((pct / totalPct) * 100),
      grams: allocation.grams,
    };
  });
}

module.exports = { calcCookingParams, calcDailyIntake, calcRecipeFeedingPlan, calcIngredientGrams, calcWaterContent };
