const { ingredientsDb } = require('../data/ingredients_db');

const ACTIVITY_FACTORS = { low: 0.85, medium: 1, high: 1.15, working: 1.3, very_high: 1.3 };
const GOAL_FACTORS = {
  weight_loss: 0.85,
  muscle_gain: 1.1,
  post_surgery_recovery: 0.9,
  gastrointestinal_care: 0.9,
};
const REFERENCE_VOLUME_PCT = { puppy: 8, adult: 5, senior: 4.5 };
const HARD_VOLUME_PCT = { puppy: 12, adult: 8, senior: 7 };
const RECOMMENDATION_SCORE_WEIGHTS = {
  safety: 0.2,
  suitability: 0.15,
  structure: 0.2,
  nutrition: 0.15,
  long_term: 0.1,
  energy: 0.2,
};

function numberFrom(...values) {
  const value = values.find(item => item !== undefined && item !== null && item !== '');
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function stageFor(pet, ageMonths) {
  const explicit = pet.life_stage || pet.lifeStage;
  if (explicit === 'puppy' || explicit === '幼犬' || (ageMonths > 0 && ageMonths < 12)) return 'puppy';
  if (explicit === 'senior' || explicit === '老年犬' || ageMonths >= 96) return 'senior';
  return 'adult';
}

function normalizePet(pet = {}) {
  const ageMonths = numberFrom(pet.age_months, pet.ageMonths, numberFrom(pet.age) * 12);
  return {
    weight: numberFrom(pet.current_weight_kg, pet.weight),
    targetWeight: numberFrom(pet.target_weight_kg, pet.targetWeight),
    ageMonths,
    stage: stageFor(pet, ageMonths),
    activityLevel: pet.activity_level || pet.activityLevel || 'medium',
    feedingGoal: pet.feeding_goal || pet.feedingGoal || 'maintenance',
    neutered: Boolean(pet.neutered),
  };
}

function dailyEnergyNeed(pet) {
  const normalized = normalizePet(pet);
  const { weight, targetWeight, ageMonths, stage, activityLevel, feedingGoal, neutered } = normalized;
  const puppy = stage === 'puppy';
  const rer = weight ? Math.round(70 * Math.pow(weight, 0.75)) : 0;
  const lifeFactor = puppy ? (ageMonths < 4 ? 3 : 2) : stage === 'senior' ? 1.4 : 1.6;
  const recordedActivity = ACTIVITY_FACTORS[activityLevel] || 1;
  const activity = puppy && ageMonths > 0 && ageMonths < 4 ? 1 : recordedActivity;
  const goal = GOAL_FACTORS[feedingGoal] || 1;
  const targetAdjustment = !puppy && weight && targetWeight ? Math.max(0.9, Math.min(1.1, targetWeight / weight)) : 1;
  const neuterFactor = neutered ? 0.9 : 1;
  const targetWeightConflict = Boolean(puppy && weight && targetWeight && targetWeight < weight);
  const dailyKcal = Math.round(rer * lifeFactor * activity * goal * targetAdjustment * neuterFactor);

  return {
    stage_label: puppy ? '幼犬' : stage === 'senior' ? '老年犬' : '成犬',
    stage_code: stage,
    rer_kcal: rer,
    daily_kcal: dailyKcal,
    min_kcal: Math.round(dailyKcal * 0.85),
    max_kcal: Math.round(dailyKcal * 1.15),
    meals_per_day: puppy ? (ageMonths < 6 ? 4 : 3) : 2,
    age_months: ageMonths || null,
    current_weight_kg: weight || null,
    target_weight_kg: targetWeight || null,
    activity_level: activityLevel,
    activity_factor: activity,
    recorded_activity_factor: recordedActivity,
    activity_note: puppy && ageMonths > 0 && ageMonths < 4 ? '4个月以下幼犬先按 3×RER 估算，不再叠加普通活动系数；活动量仅用于观察后续体重、BCS和生长曲线变化。' : null,
    activity_note_code: puppy && ageMonths > 0 && ageMonths < 4 ? 'EARLY_PUPPY_RER_ACTIVITY_NOT_MULTIPLIED' : null,
    neutered,
    neuter_factor: neuterFactor,
    feeding_goal: feedingGoal,
    goal_factor: goal,
    target_adjustment: targetAdjustment,
    target_weight_conflict: targetWeightConflict,
    target_weight_note: targetWeightConflict ? '幼犬目标体重低于当前体重，档案存在冲突；本次不使用该目标体重推导减重结论。' : null,
    target_weight_note_code: targetWeightConflict ? 'PUPPY_TARGET_WEIGHT_CONFLICT' : null,
    digestion_note: feedingGoal === 'gastrointestinal_care' ? '已按肠胃护理目标保守下调 10%，并建议少量多餐。' : null,
    digestion_note_code: feedingGoal === 'gastrointestinal_care' ? 'GI_GOAL_CONSERVATIVE_ADJUSTMENT' : null,
    note_code: puppy ? 'DAILY_ENERGY_ESTIMATE_PUPPY' : 'DAILY_ENERGY_ESTIMATE_GENERAL',
    note: puppy ? '幼犬能量公式仅作为初始估算；应结合体重、BCS和生长曲线持续调整，个体实际需求可能与估算相差约30%。' : '能量公式仅作为初始估算；应结合体重和BCS持续调整，个体实际需求可能与估算相差约30%。',
  };
}

function recipeEnergyDensity(recipe, ingredientMap = ingredientsDb) {
  const entries = Object.entries(recipe?.ingredients || {}).filter(([, ratio]) => Number.isFinite(Number(ratio)) && Number(ratio) > 0);
  const totalRatio = entries.reduce((sum, [, ratio]) => sum + Number(ratio), 0);
  if (!totalRatio) return { kcal_per_gram: null, kcal_per_100g: null, coverage_pct: 0, unknown_ingredients: [] };

  let weightedKcal = 0;
  let coveredRatio = 0;
  const unknown = [];
  entries.forEach(([name, ratioValue]) => {
    const ratio = Number(ratioValue);
    const kcal = Number(ingredientMap[name]?.calories_per_100g);
    if (Number.isFinite(kcal) && kcal >= 0) {
      weightedKcal += ratio * kcal;
      coveredRatio += ratio;
    } else {
      unknown.push(name);
    }
  });
  const coveragePct = coveredRatio / totalRatio * 100;
  const kcalPer100g = coveredRatio ? weightedKcal / totalRatio : null;
  return {
    kcal_per_gram: kcalPer100g === null ? null : Number((kcalPer100g / 100).toFixed(3)),
    kcal_per_100g: kcalPer100g === null ? null : Number(kcalPer100g.toFixed(1)),
    coverage_pct: Number(coveragePct.toFixed(1)),
    unknown_ingredients: unknown,
  };
}

function referenceFeedingPlanForPet(pet) {
  const need = dailyEnergyNeed(pet);
  const weight = need.current_weight_kg || 0;
  const referencePct = REFERENCE_VOLUME_PCT[need.stage_code];
  const dailyGrams = weight ? Math.round(weight * 1000 * referencePct / 100) : null;
  const requiredDensity = dailyGrams && need.daily_kcal ? need.daily_kcal / dailyGrams : null;
  return {
    ...need,
    daily_grams: dailyGrams,
    per_meal_grams: dailyGrams ? Math.round(dailyGrams / need.meals_per_day) : null,
    kcal_per_gram: requiredDensity === null ? null : Number(requiredDensity.toFixed(3)),
    daily_food_weight_pct_body_weight: referencePct,
    calculation_model: 'reference_volume_target_density_v1',
  };
}

function feedingPlanForRecipe(pet, recipe, ingredientMap = ingredientsDb) {
  const need = dailyEnergyNeed(pet);
  const referencePlan = referenceFeedingPlanForPet(pet);
  const energy = recipeEnergyDensity(recipe, ingredientMap);
  const weight = need.current_weight_kg || 0;
  const referencePct = REFERENCE_VOLUME_PCT[need.stage_code];
  const hardPct = HARD_VOLUME_PCT[need.stage_code];
  const referenceGrams = referencePlan.daily_grams;
  const dailyGrams = energy.kcal_per_gram && need.daily_kcal ? Math.round(need.daily_kcal / energy.kcal_per_gram) : null;
  const dailyRatioPct = weight && dailyGrams ? dailyGrams / (weight * 1000) * 100 : null;
  const excessPct = referenceGrams && dailyGrams ? Math.max(0, (dailyGrams - referenceGrams) / referenceGrams * 100) : null;
  const requiredDensity = referencePlan.kcal_per_gram;
  const excessiveVolume = excessPct !== null && excessPct > 20;
  const coverageComplete = energy.coverage_pct >= 80;
  const warningRatioPct = referencePct * 1.2;
  let feasibilityScore = dailyRatioPct === null ? 50 : 100;
  if (dailyRatioPct > warningRatioPct) {
    feasibilityScore = Math.max(0, Math.min(100, Math.round(100 - (dailyRatioPct - warningRatioPct) / (hardPct - warningRatioPct) * 100)));
  }
  if (!coverageComplete) feasibilityScore = Math.min(feasibilityScore, 50);

  return {
    ...need,
    recipe_id: recipe?.id || null,
    recipe_name: recipe?.name || null,
    daily_grams: dailyGrams,
    per_meal_grams: dailyGrams ? Math.round(dailyGrams / need.meals_per_day) : null,
    kcal_per_gram: energy.kcal_per_gram,
    kcal_per_100g: energy.kcal_per_100g,
    energy_coverage_pct: energy.coverage_pct,
    unknown_ingredients: energy.unknown_ingredients,
    daily_food_weight_pct_body_weight: dailyRatioPct === null ? null : Number(dailyRatioPct.toFixed(1)),
    reference_max_pct_body_weight: referencePct,
    reference_max_daily_grams: referenceGrams === null ? null : Math.round(referenceGrams),
    hard_max_pct_body_weight: hardPct,
    minimum_density_for_reference_volume: requiredDensity,
    exceeds_reference_by_pct: excessPct === null ? null : Number(excessPct.toFixed(1)),
    excessive_volume: excessiveVolume,
    severe_excessive_volume: dailyRatioPct !== null && dailyRatioPct > hardPct,
    low_energy_density: Boolean(energy.kcal_per_gram && energy.kcal_per_gram < 1.3),
    feasibility_score: feasibilityScore,
    feasible: coverageComplete && !excessiveVolume,
    warning_code: !coverageComplete ? 'ENERGY_DENSITY_INCOMPLETE' : excessiveVolume ? 'EXCESSIVE_DAILY_FOOD_VOLUME' : null,
  };
}

function recommendationScoreFromValidation(scores = {}, { hasDanger = false } = {}) {
  const entries = Object.entries(RECOMMENDATION_SCORE_WEIGHTS);
  if (entries.some(([key]) => !Number.isFinite(Number(scores[key])))) return null;
  const weightedScore = Math.round(entries.reduce(
    (sum, [key, weight]) => sum + Number(scores[key]) * weight,
    0
  ));
  return hasDanger || Number(scores.safety) < 70 ? Math.min(weightedScore, 49) : weightedScore;
}

module.exports = {
  dailyEnergyNeed,
  feedingPlanForRecipe,
  referenceFeedingPlanForPet,
  recommendationScoreFromValidation,
  recipeEnergyDensity,
  _constants: { REFERENCE_VOLUME_PCT, HARD_VOLUME_PCT, RECOMMENDATION_SCORE_WEIGHTS },
};
