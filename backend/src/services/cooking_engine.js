// cooking_engine.js — 烹饪参数计算引擎
// 基于3组实测数据推导的计算模型

const { ingredientsDb } = require('../data/ingredients_db');

/**
 * 计算食谱的平均含水量
 * @param {Object} ingredients - { 食材名: 百分比 }
 * @returns {number} 含水量 0~1
 */
function calcWaterContent(ingredients) {
  let totalWeight = 0, totalWater = 0;
  Object.entries(ingredients).forEach(([name, pct]) => {
    if (typeof pct !== 'number') return;
    const ing = ingredientsDb[name];
    const waterPct = ing ? ing.water_pct : 0.70;
    totalWeight += pct;
    totalWater += pct * waterPct;
  });
  return totalWeight > 0 ? totalWater / totalWeight : 0.70;
}

/**
 * 根据实测数据推导：
 * 实测1: 200g纯肉(水60%), 8档, 85℃ → 预热45s, 熟透9min
 * 实测2: 191g混合(水70%), 8档, 85℃ → 预热48s, 熟透11min
 * 实测3: 200g肉+蔬菜(水75%), 8档, 85℃ → 预热30s, 熟透8min
 * 
 * 模型（100g基准，8档，85℃）：
 *   基础预热 = 22.5s（水含量60%基准）
 *   预热修正：水分越高，前期升温越快（-60s per +10%水含量）
 *   
 *   基础烹饪 = 270s（水含量60%基准，100%熟）
 *   烹饪修正：水分越高，导热越快，时间越短（-80s per +10%水含量）
 */
function calcCookingParams(recipe, totalGrams) {
  const { cooking_base, ingredients, water_content_pct } = recipe;
  const waterContent = water_content_pct / 100;
  
  // 加水量（食材总量的15%）
  const waterGrams = Math.round(totalGrams * cooking_base.water_ratio);
  
  // ——— 预热时间计算 ———
  // 基准：100g食材，60%水含量 → 22.5s预热
  // 水含量每增加1%，预热减少 0.6s/100g
  const waterDelta = waterContent - 0.60;
  const preheat_per_100g = Math.max(10, 22.5 - waterDelta * 60);
  // 非线性缩放：大质量时预热不完全线性（指数 0.9）
  const preheat_seconds = Math.round(preheat_per_100g * Math.pow(totalGrams / 100, 0.9));
  
  // ——— 烹饪时间计算 ———
  // 基准：100g，60%水含量 → 270s到100%熟
  // 水含量每增加1%，烹饪减少 1.2s/100g
  const cook_per_100g = Math.max(120, 270 - waterDelta * 120);
  // 非线性缩放：大质量时烹饪时间不完全线性（指数 0.75）
  const cook_seconds = Math.round(cook_per_100g * Math.pow(totalGrams / 100, 0.75));
  
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
      id: 'preheat',
      name: '预加热',
      desc: `高火（${cooking_base.power}档）快速升温至 ${cooking_base.temperature}℃`,
      seconds: preheat_seconds,
      display: preheat_seconds < 60 ? `约${preheat_seconds}秒` : `约${Math.ceil(preheat_seconds/60)}分钟`,
    },
    {
      id: 'cook',
      name: '低温烹饪',
      desc: `恒温 ${cooking_base.temperature}℃，搅拌速度${cooking_base.speed}档（60转/分钟），低温慢炖`,
      seconds: cook_seconds,
      display: `约${Math.ceil(cook_seconds/60)}分钟`,
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
    preheat_seconds,
    cook_seconds,
    total_seconds: preheat_seconds + cook_seconds,
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

/**
 * 将食谱百分比配比转为实际克数
 * @param {Object} ingredients - { 食材名: 百分比 }
 * @param {number} totalGrams - 总克数
 * @returns {Array} [{ name, pct, grams }]
 */
function calcIngredientGrams(ingredients, totalGrams) {
  const result = [];
  const totalPct = Object.values(ingredients).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  
  Object.entries(ingredients).forEach(([name, pct]) => {
    if (typeof pct !== 'number') {
      result.push({ name, pct: null, grams: null, note: '微量' });
      return;
    }
    result.push({
      name,
      pct: Math.round((pct / totalPct) * 100),
      grams: Math.round((pct / totalPct) * totalGrams),
    });
  });
  return result;
}

module.exports = { calcCookingParams, calcDailyIntake, calcIngredientGrams, calcWaterContent };
