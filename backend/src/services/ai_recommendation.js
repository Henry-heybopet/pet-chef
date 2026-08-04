const crypto = require('crypto');
const { recommendationScoreFromValidation } = require('./nutrition_energy');

const MODEL = () => process.env.DEEPSEEK_MODEL || 'deepseek-v4-pro';
const THINKING_MODE = () => process.env.DEEPSEEK_THINKING_MODE || 'disabled';
const REQUEST_TIMEOUT_MS = () => Number(process.env.DEEPSEEK_REQUEST_TIMEOUT_MS || 60000);
const PROMPT_VERSION = 'heybo-agent-ab-v1';
const CACHE_TTL_MS = 10 * 24 * 60 * 60 * 1000;

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

function cacheContextHash({ pet, recipes, bPacks }) {
  return stableHash({
    model: MODEL(), prompt_version: PROMPT_VERSION,
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

function validateAgentResult(result, { candidateIds, hardBlockedIds, minKcal, maxKcal, allowedBPacks }) {
  if (!result || !Array.isArray(result.ranked_recipes)) throw new Error('invalid ranked_recipes');
  const selected = Number(result.selected_daily_kcal);
  if (!Number.isFinite(selected) || selected < minKcal || selected > maxKcal) throw new Error('energy target outside safe range');
  const ids = result.ranked_recipes.map(item => String(item.recipe_id));
  if (ids.length < 1 || ids.length > Math.min(10, candidateIds.length) || new Set(ids).size !== ids.length || ids.some(id => !candidateIds.includes(id))) {
    throw new Error('AI must return up to ten unique candidate recipes');
  }
  result.ranked_recipes.forEach(item => {
    if (!Number.isFinite(Number(item.score)) || Number(item.score) < 0 || Number(item.score) > 100) throw new Error('invalid score');
    if (hardBlockedIds.has(String(item.recipe_id)) && item.eligible !== false) throw new Error('hard-blocked recipe marked eligible');
    if (item.b_pack_category && !allowedBPacks.has(item.b_pack_category)) throw new Error('invalid B pack');
  });
  return result;
}

function completeAgentRanking(result, candidates) {
  const selectedIds = new Set(result.ranked_recipes.map(item => String(item.recipe_id)));
  return {
    ...result,
    ranked_recipes: [
      ...result.ranked_recipes,
      ...fallbackRanking(candidates).filter(item => !selectedIds.has(String(item.recipe_id))),
    ],
  };
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
        model: MODEL(), thinking: { type: THINKING_MODE() }, max_tokens: 4000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `你是 HeyboPet Agent 的犬类营养推荐核心。程序已提供唯一可信的 RER/MER 安全区间、Fresh Check 配方事实、硬安全码和 B 包资格。你负责综合档案、BCS、目标、活动、健康标签及14/30天真实喂食反馈，在安全区间内选择每日能量，并从全部 A 基础包中选出最适合且安全的前10名。规则事实不可篡改；不得选择硬阻断项；适口性好但便便异常不得加分；推荐结构仅为 A 基础包加 B 全价营养包。理由不超过30个汉字，优点和权衡各最多2项。不得诊断。只返回严格 JSON。` },
          { role: 'user', content: JSON.stringify({ ...payload, output_schema: { selected_daily_kcal: 'number', summary: 'string', key_nutrition_needs: ['string'], cautions: ['string'], factors_used: ['string'], ranked_recipes: 'exactly 10 best eligible candidates', ranked_recipe_item: { recipe_id: 'string', score: '0-100', suitability: 'high|medium|low', eligible: true, b_pack_category: 'string|null', reason: 'max 30 Chinese characters', positive_factors: 'max 2 strings', tradeoffs: 'max 2 strings' } } }) },
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
    try {
      const started = Date.now();
      const response = await callAgent({ ...input, attempt, correction: attempt === 2 ? String(lastError?.message || '') : null });
      const validated = validateAgentResult(response.result, validation);
      return { ...completeAgentRanking(validated, candidates), meta: { model: MODEL(), prompt_version: PROMPT_VERSION, latency_ms: Date.now() - started, usage: response.usage } };
    } catch (error) {
      lastError = error;
      if (error?.name === 'AbortError') break;
    }
  }
  throw lastError;
}

function fallbackRanking(candidates) {
  return [...candidates].map(candidate => ({
    recipe_id: String(candidate.recipe_id),
    score: candidate.hard_blocked ? Math.min(49, Number(candidate.rule_score || 0)) : Number(candidate.rule_score || 50),
    suitability: candidate.hard_blocked ? 'blocked' : Number(candidate.rule_score || 0) >= 85 ? 'high' : Number(candidate.rule_score || 0) >= 70 ? 'medium' : 'low',
    eligible: !candidate.hard_blocked, b_pack_category: candidate.b_pack_category || null,
    reason: candidate.hard_blocked ? '存在必须先处理的营养安全风险。' : '根据宠物档案和 Fresh Check 营养安全事实生成。',
    positive_factors: [], tradeoffs: candidate.warning_codes || [],
  })).sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score);
}

module.exports = { MODEL, THINKING_MODE, REQUEST_TIMEOUT_MS, PROMPT_VERSION, CACHE_TTL_MS, safeCacheId, cachedEnergyTarget, stableHash, cacheContextHash, isRecommendationCacheValid, publicPetContext, recommendWithHeyboAgent, fallbackRanking, _test: { validateAgentResult, completeAgentRanking } };
