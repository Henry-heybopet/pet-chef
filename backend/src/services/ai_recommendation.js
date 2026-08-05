const crypto = require('crypto');
const { recommendationScoreFromValidation } = require('./nutrition_energy');
const { aiNutritionPresentationIsValid, normalizeLocale } = require('./localization');

const MODEL = () => process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const THINKING_MODE = () => process.env.DEEPSEEK_THINKING_MODE || 'disabled';
const REQUEST_TIMEOUT_MS = () => Number(process.env.DEEPSEEK_REQUEST_TIMEOUT_MS || 25000);
const PROMPT_VERSION = 'heybo-agent-ab-v6-i18n';
const CACHE_TTL_MS = 10 * 24 * 60 * 60 * 1000;
const OUTPUT_LANGUAGES = {
  zh: '简体中文', en: 'English', de: 'Deutsch', fr: 'français',
  es: 'español', it: 'italiano', ja: '日本語', ko: '한국어',
};

function safeCacheId(value) { return String(value || 'default').replace(/[^a-zA-Z0-9_-]/g, '_'); }

function cachedEnergyTarget(cache, { petUpdatedAt, feedbackCount, now = Date.now() }) {
  if (!cache || cache.cache_version !== PROMPT_VERSION || now - Number(cache.timestamp || 0) > CACHE_TTL_MS) return null;
  if (petUpdatedAt && String(cache.pet_updated_at || '') !== String(petUpdatedAt)) return null;
  if (Math.max(0, Number(feedbackCount || 0) - Number(cache.feedback_count_at_analysis || 0)) >= 10) return null;
  const value = Number(cache.response?.analysis?.daily_energy?.daily_kcal);
  return Number.isFinite(value) ? value : null;
}

function stableHash(value) {
  const normalize = input => {
    if (Array.isArray(input)) return input.map(normalize);
    if (!input || typeof input !== 'object') return input;
    return Object.fromEntries(Object.keys(input).sort().map(key => [key, normalize(input[key])]));
  };
  return crypto.createHash('sha256').update(JSON.stringify(normalize(value))).digest('hex');
}

function cacheContextHash({ pet, recipes, bPacks, locale = 'zh' }) {
  return stableHash({
    model: MODEL(), prompt_version: PROMPT_VERSION, locale: normalizeLocale(locale),
    pet,
    recipes: recipes.map(recipe => ({ id: recipe.id, updated_at: recipe.updated_at, ingredients: recipe.ingredients, nutrition: recipe.nutrition })),
    b_packs: bPacks.map(pack => ({ category: pack.category, enabled: pack.enabled, recommended: pack.recommended })),
  });
}

function isRecommendationCacheValid(cache, { contextHash, feedbackCount, now = Date.now() }) {
  return Boolean(cache
    && cache.cache_version === PROMPT_VERSION
    && cache.context_hash === contextHash
    && now - Number(cache.timestamp || 0) <= CACHE_TTL_MS
    && Math.max(0, Number(feedbackCount || 0) - Number(cache.feedback_count_at_analysis || 0)) < 10);
}

function publicPetContext(pet = {}) {
  return {
    species: pet.species || 'dog', breed: pet.breedName || pet.breed_name,
    age_months: pet.ageMonths || pet.age_months, life_stage: pet.lifeStage || pet.life_stage,
    weight_kg: pet.weight || pet.current_weight_kg, target_weight_kg: pet.targetWeight || pet.target_weight_kg,
    bcs: pet.bcs, sex: pet.sex, neutered: Boolean(pet.neutered), body_size: pet.bodySize || pet.body_size,
    activity_level: pet.activityLevel || pet.activity_level, feeding_goal: pet.feedingGoal || pet.feeding_goal,
    goals: pet.goals || [], health_tags: pet.healthTags || pet.health_tags || [], allergens: pet.allergens || [],
    special_period: pet.specialPeriod || pet.special_period || null,
  };
}

const LIFE_STAGE_ALIASES = {
  puppy: new Set(['幼犬', 'puppy']),
  adult: new Set(['成年犬', 'adult']),
  senior: new Set(['老年犬', 'senior']),
};

function filterRecipesForLifeStage(recipes, stageCode) {
  const aliases = LIFE_STAGE_ALIASES[stageCode];
  if (!aliases) return [];
  return (recipes || []).filter(recipe => aliases.has(String(recipe?.life_stage || '').trim().toLowerCase()));
}

function validateAgentResult(result, { candidateIds, hardBlockedIds, minKcal, maxKcal, allowedBPacks }) {
  if (!result || !Array.isArray(result.ranked_recipes)) throw new Error('invalid ranked_recipes');
  const selected = Number(result.selected_daily_kcal);
  if (!Number.isFinite(selected) || selected < minKcal || selected > maxKcal) throw new Error('energy target outside safe range');
  const ids = result.ranked_recipes.map(item => String(item.recipe_id));
  if (ids.length !== candidateIds.length || new Set(ids).size !== ids.length || ids.some(id => !candidateIds.includes(id))) {
    throw new Error('AI must score every candidate recipe exactly once');
  }
  result.ranked_recipes.forEach(item => {
    if (!Number.isFinite(Number(item.score)) || Number(item.score) < 0 || Number(item.score) > 100) throw new Error('invalid score');
    if (typeof item.eligible !== 'boolean') throw new Error('invalid eligibility');
    if (hardBlockedIds.has(String(item.recipe_id)) && item.eligible !== false) throw new Error('hard-blocked recipe marked eligible');
    if (item.b_pack_category && !allowedBPacks.has(item.b_pack_category)) throw new Error('invalid B pack');
  });
  return result;
}

function completeAgentRanking(result) {
  const rankedRecipes = result.ranked_recipes
    .map((item, index) => ({ item, index }))
    .sort((a, b) => Number(b.item.eligible) - Number(a.item.eligible)
      || Number(b.item.score) - Number(a.item.score)
      || a.index - b.index)
    .map(({ item }) => item);
  return {
    ...result,
    ranked_recipes: rankedRecipes,
  };
}

function applyRuleScoreCeilings(rankedRecipes, plansByRecipeId) {
  return completeAgentRanking({
    ranked_recipes: (rankedRecipes || []).map(item => {
      const aiScore = Math.round(Number(item.score));
      const ruleScore = Number(plansByRecipeId?.[String(item.recipe_id)]?.recommendation_score);
      const weightedRuleScore = Number.isFinite(ruleScore) ? Math.round(ruleScore) : 49;
      const finalScore = item.eligible ? weightedRuleScore : Math.min(weightedRuleScore, 49);
      return {
        ...item,
        ai_score: aiScore,
        rule_score: Number.isFinite(ruleScore) ? Math.round(ruleScore) : null,
        score: finalScore,
        score_cap_applied: finalScore < aiScore,
        score_rule_applied: finalScore !== aiScore,
        suitability: item.eligible === false
          ? 'blocked'
          : finalScore >= 85 ? 'high' : finalScore >= 70 ? 'medium' : 'low',
      };
    }),
  }).ranked_recipes;
}

async function callAgent(payload) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY is not configured');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS());
  try {
    const response = await fetch(`${process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'}/chat/completions`, {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL(), thinking: { type: THINKING_MODE() }, max_tokens: 8000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `你是 HeyboPet Agent 的犬类营养推荐核心。程序已提供唯一可信的 RER/MER 安全区间、Fresh Check 配方事实、硬安全码和 B 包资格。你负责综合档案、BCS、目标、活动、健康标签及14/30天真实喂食反馈，在安全区间内选择每日能量。必须对程序提供的每一个 A 基础包逐一评估、逐一打分，并且每个候选只返回一次；不得只返回前10个。每项score必须等于候选的rule_score；个体档案和喂食反馈用于能量选择、风险关注与推荐理由，不得另造一套与Fresh Check六维不一致的百分比。程序会在收到全部评估后按分数排序并展示前10个。规则事实不可篡改；硬阻断项必须标记 eligible=false；适口性好但便便异常不得加分；推荐结构仅为 A 基础包加 B 全价营养包。summary、key_nutrition_needs、cautions、factors_used 以及 ranked_recipes 中的 reason、positive_factors、tradeoffs 都必须使用 ${OUTPUT_LANGUAGES[normalizeLocale(payload.locale)]}，日语必须是含假名的自然日语，不得输出仅中文的字段。每项理由不超过30个字，优点和权衡各最多2项。不得诊断。只返回严格 JSON。` },
          { role: 'user', content: JSON.stringify({ ...payload, output_schema: { selected_daily_kcal: 'number', summary: 'string', key_nutrition_needs: ['string'], cautions: ['string'], factors_used: ['string'], ranked_recipes: `exactly ${payload.candidates.length} items; score every candidate exactly once`, ranked_recipe_item: { recipe_id: 'string', score: '0-100', suitability: 'high|medium|low|blocked', eligible: 'boolean', b_pack_category: 'string|null', reason: 'max 30 Chinese characters', positive_factors: 'max 2 strings', tradeoffs: 'max 2 strings' } } }) },
        ],
      }),
    });
    if (!response.ok) throw new Error(`DeepSeek API error (${response.status})`);
    const data = await response.json();
    const text = String(data.choices?.[0]?.message?.content || '').replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    if (!text) throw new Error('empty AI response');
    return { result: JSON.parse(text), usage: data.usage || null };
  } finally { clearTimeout(timeout); }
}

async function recommendWithHeyboAgent(input) {
  const candidates = input.candidates;
  const validation = {
    candidateIds: candidates.map(item => String(item.recipe_id)),
    hardBlockedIds: new Set(candidates.filter(item => item.hard_blocked).map(item => String(item.recipe_id))),
    minKcal: input.energy.min_kcal, maxKcal: input.energy.max_kcal,
    allowedBPacks: new Set(input.b_packs.filter(item => item.enabled).map(item => item.category)),
  };
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const started = Date.now();
    try {
      const response = await callAgent({ ...input, attempt, correction: attempt === 2 ? String(lastError?.message || '') : null });
      const validated = validateAgentResult(response.result, validation);
      if (!aiNutritionPresentationIsValid(validated, input.locale)) throw new Error('AI presentation locale mismatch');
      return { ...completeAgentRanking(validated), meta: { model: MODEL(), prompt_version: PROMPT_VERSION, latency_ms: Date.now() - started, usage: response.usage } };
    } catch (error) {
      lastError = error;
      console.warn('[HeyboPet Agent attempt failed]', JSON.stringify({
        model: MODEL(), attempt, latency_ms: Date.now() - started,
        error: error?.name === 'AbortError' ? 'timeout' : String(error?.message || 'unknown'),
      }));
      if (error?.name === 'AbortError') break;
    }
  }
  throw lastError;
}

function fallbackRanking(candidates, requestedLocale = 'zh') {
  const locale = normalizeLocale(requestedLocale);
  const safeReason = {
    zh: '根据宠物档案和 Fresh Check 营养安全事实生成。', en: 'Based on the pet profile and Fresh Check safety facts.',
    de: 'Basierend auf Tierprofil und Fresh-Check-Sicherheitsdaten.', fr: 'Basé sur le profil et les données de sécurité Fresh Check.',
    es: 'Basado en el perfil y los datos de seguridad de Fresh Check.', it: 'Basato sul profilo e sui dati di sicurezza Fresh Check.',
    ja: 'ペット情報とFresh Checkの安全データに基づく結果です。', ko: '반려동물 프로필과 Fresh Check 안전 사실을 반영했습니다.',
  }[locale];
  const blockedReason = {
    zh: '先处理营养安全风险后才可选择。', en: 'Resolve the nutrition safety risk before selecting this recipe.',
    de: 'Vor der Auswahl muss das Ernährungsrisiko behoben werden.', fr: 'Corrigez le risque nutritionnel avant de choisir cette recette.',
    es: 'Corrija el riesgo nutricional antes de elegir esta receta.', it: 'Risolvi il rischio nutrizionale prima di scegliere questa ricetta.',
    ja: '選択前に栄養上の安全リスクを解消してください。', ko: '선택 전에 영양 안전 위험을 먼저 해결하세요.',
  }[locale];
  return [...candidates].map(candidate => ({
    recipe_id: String(candidate.recipe_id),
    score: candidate.hard_blocked ? Math.min(49, Number(candidate.rule_score || 0)) : Number(candidate.rule_score || 50),
    suitability: candidate.hard_blocked ? 'blocked' : Number(candidate.rule_score || 0) >= 85 ? 'high' : Number(candidate.rule_score || 0) >= 70 ? 'medium' : 'low',
    eligible: !candidate.hard_blocked, b_pack_category: candidate.b_pack_category || null,
    reason: candidate.hard_blocked ? blockedReason : safeReason,
    positive_factors: [], tradeoffs: candidate.warning_codes || [],
  })).sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score);
}

module.exports = { MODEL, THINKING_MODE, REQUEST_TIMEOUT_MS, PROMPT_VERSION, CACHE_TTL_MS, safeCacheId, cachedEnergyTarget, stableHash, cacheContextHash, isRecommendationCacheValid, publicPetContext, filterRecipesForLifeStage, recommendWithHeyboAgent, fallbackRanking, applyRuleScoreCeilings, _test: { validateAgentResult, completeAgentRanking } };
