// Pet Chef Ver B1.00 — Safety Filter · 2026-06-22
// index.js — 后端主入口（修复 CommonJS 兼容）
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { breedsDb } = require('./data/breeds_db');
const { analyzeBreedNutrition, generateAIRecipe, compareRecipeSelection, compareRecipeSelectionBatch } = require('./services/gemini');
const { evaluatePetBCS } = require('./services/deepseek');
const { validateIngredientSafety, hasToxicIngredients, hasCautionIngredients, generateSafetyWarnings } = require('./services/safety_filter');
const { startCooking, pauseCooking, stopCooking, getDeviceStatus } = require('./services/tuya');
const { calcCookingParams, calcDailyIntake, calcIngredientGrams } = require('./services/cooking_engine');
const heyboRoutes = require('./routes/heybo');
const { getCorsOrigins, printRegionSummary, getEnvironment } = require('./config/region_config');
const { listRecipes, listAdminRecipes, getRecipeById, getRecipeNames, updateRecipe, buildRecipeIndexByName } = require('./services/nutrition_repository');
const store = require('./services/heybo_store');
const { verifyToken } = require('./services/auth');
const petRepository = require('./services/pet_repository');
const userRepository = require('./services/user_repository');

const app = express();
app.set('trust proxy', 1);
const uploadsDir = path.resolve(__dirname, '../public/uploads');
const runtimeDataDir = path.resolve(__dirname, '../.data');
const AI_RECOMMENDATION_CACHE_VERSION = 8;
fs.mkdirSync(uploadsDir, { recursive: true });
fs.mkdirSync(runtimeDataDir, { recursive: true });

// 路由兼容性中间件：自动将 /api/xxx 转发至 /api/v1/xxx （防止生产环境 Nginx 或 Capacitor 容器导致 404）
app.use((req, res, next) => {
  if (req.url.startsWith('/api/') && !req.url.startsWith('/api/v1/')) {
    req.url = req.url.replace(/^\/api\//, '/api/v1/');
  }
  next();
});

// 安全跨域配置
app.use(cors({
  origin: getCorsOrigins(),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'idempotency-key', 'x-heybo-payment-mock-secret'],
}));

app.use('/uploads', express.static(uploadsDir));

app.use(express.json({
  limit: '5mb',
  verify: (req, res, buffer) => {
    req.rawBody = Buffer.from(buffer);
  },
}));

// 全局限流：15分钟最多 500 次
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, error: 'Too many requests from this IP, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 敏感操作限流：1分钟最多 15 次
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { success: false, error: 'Request rate too high, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);
app.use('/api/v1', heyboRoutes);

// ============================================================
// GET /api/v1/breeds — 获取全部犬种列表
// ============================================================
app.get('/api/v1/breeds', (req, res) => {
  res.json({ success: true, breeds: breedsDb });
});

// ============================================================
// GET /api/v1/recipes — 按分类获取食谱（PG + JSON 回退）
// query: category (生命阶段分类名) | life_stage | dog_size | functional | protein | all
// ============================================================
app.get('/api/v1/recipes', async (req, res) => {
  const { category, life_stage, dog_size, functional, protein, all, custom_category } = req.query;

  const ingredientNames = (r) => Object.keys(r.ingredients || {});
  const hasIngredient = (r, markers) => markers.some(marker => ingredientNames(r).some(name => name.includes(marker)));
  const hasText = (r, marker) => [
    r.category,
    r.name,
    r.b_pack,
    r.c_pack,
    ...(r.health_tags || []),
    ...(r.tags || []),
  ].some(value => String(value || '').includes(marker));

  // custom_category 映射表：食谱分类页 → 当前 40 条食谱字段
  const customCategoryFilter = (r) => {
    switch (custom_category) {
      case 'puppy_general': return r.category === '幼犬通用';
      case 'puppy_calcium': return r.category === '控钙幼犬（大型幼犬）';
      case 'adult_general': return r.category === '成犬通用';
      case 'senior_general': return r.category === '老年犬通用';
      case 'protein_chicken': return hasIngredient(r, ['鸡']);
      case 'protein_beef': return hasIngredient(r, ['牛']);
      case 'protein_fish': return hasIngredient(r, ['鱼', '金枪']);
      case 'protein_other': return hasIngredient(r, ['鸭', '兔', '羊', '鹿', '火鸡']);
      case 'skin': return r.category === '美毛护肤' || hasText(r, '美毛');
      case 'liver': return r.category === '护肝' || hasText(r, '护肝');
      case 'hypoallergenic': return r.category === '低敏单一蛋白' || hasText(r, '低敏');
      case 'low_fat': return hasText(r, '低脂');
      case 'joint': return hasText(r, '关节') || hasText(r, '护关节');
      default: return false;
    }
  };

  const filterFn = (r) => {
    if (all) return true;
    // 优先使用 custom_category 过滤
    if (custom_category) return customCategoryFilter(r);
    let match = true;
    if (category) match = match && (r.category.includes(category) || r.category_type === category);
    if (life_stage) match = match && r.life_stage === life_stage;
    if (dog_size) match = match && (!r.dog_size || r.dog_size === dog_size);
    if (functional) match = match && r.category_type === 'functional' && r.category.includes(functional);
    if (protein) match = match && Object.keys(r.ingredients || {}).some(name => name.includes(protein));
    if (req.query.protein_other) {
      const otherMeats = ['鸭', '羊', '鹿', '火鸡'];
      const ingNames = Object.keys(r.ingredients || {});
      match = match && otherMeats.some(m => ingNames.some(name => name.includes(m)));
    }
    return match;
  };

  const { recipes, source } = await listRecipes(filterFn);
  const result = all ? recipes : recipes.filter(filterFn);

  res.json({ success: true, recipes: result, count: result.length, source });
});

// ============================================================
// GET /api/v1/recipes/:id — 获取单个食谱详情（PG + JSON 回退）
// ============================================================
app.get('/api/v1/recipes/:id', async (req, res) => {
  const { recipe, source } = await getRecipeById(req.params.id);

  if (!recipe) return res.status(404).json({ success: false, error: 'Recipe not found' });
  res.json({ success: true, recipe, source });
});

// ============================================================
// Admin recipes — 管理正式 recipes 表
// ============================================================
app.get('/api/v1/admin/recipes', async (req, res) => {
  const { recipes, source } = await listAdminRecipes();
  res.json({ success: true, recipes, count: recipes.length, source });
});

app.patch('/api/v1/admin/recipes/:id', async (req, res) => {
  try {
    const { recipe, source } = await updateRecipe(req.params.id, req.body || {});
    if (!recipe) return res.status(404).json({ success: false, error: 'Recipe not found' });
    res.json({ success: true, recipe, source });
  } catch (err) {
    if (err.code === 'DB_UNAVAILABLE') {
      return res.status(503).json({ success: false, error: 'recipes table unavailable; cannot save admin changes' });
    }
    console.error('Admin recipe update error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/v1/admin/pets', async (req, res) => {
  try {
    const pets = await petRepository.listAdminPets();
    res.json({ success: true, pets, count: pets.length, source: 'pg' });
  } catch (err) {
    console.error('Admin pets list error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/v1/admin/users', async (req, res) => {
  try {
    const users = await userRepository.listAdminUsers();
    res.json({ success: true, users, count: users.length, source: 'pg' });
  } catch (err) {
    console.error('Admin users list error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PET_CHEF_SPEED_RPM = { 0: 0, 1: 60, 2: 120, 3: 230, 4: 500, 5: 1200, 6: 2500, 7: 4000, 8: 5500, 9: 7500, 10: 9500 };
const PET_CHEF_FAULTS = {
  1: 'E01 盖子没有盖好',
  2: 'E02 鲜食杯没有安装好',
  3: 'E03 马达堵转',
  4: 'E04 鲜食杯温度超过145度',
  5: 'E05 马达温度超过80度',
  7: 'E07 换挡位失败',
  8: 'E04 马达NTC失败',
  11: 'E11 高速搅拌时温度超过90度',
  12: 'E12 电子秤超过5KG',
};

function petChefFault(value) {
  if (value === undefined || value === null || value === '' || Number(value) === 0) return { code: '-', message: '无' };
  return { code: `DP12=${value}`, message: PET_CHEF_FAULTS[Number(value)] || `未知故障 ${value}` };
}

function petChefSpeed(value) {
  if (value === undefined || value === null || value === '') return '-';
  const level = Number(value);
  return PET_CHEF_SPEED_RPM[level] === undefined ? `${value}档` : `${level}档（${PET_CHEF_SPEED_RPM[level]}转/分钟）`;
}

function petChefPower(value) {
  if (value === undefined || value === null || value === '') return '-';
  const level = Number(value);
  return level >= 1 && level <= 10 ? `${level}档（${level * 100}W）` : `${value}档`;
}

function tuyaRowsToDps(rows = []) {
  return Object.fromEntries(rows.map(item => [item.code ?? item.dpId ?? item.dp_id ?? item.dpCode, item.value]));
}

app.get('/api/v1/admin/devices', async (req, res) => {
  const devices = await Promise.all((store.db.devices || [])
    .filter(device => !/^(demo_|web_)/.test(String(device.tuya_device_id || '')))
    .map(async device => {
      try {
        const status = await getDeviceStatus(device.tuya_device_id);
        const dps = tuyaRowsToDps(status.result || []);
        const fault = petChefFault(dps.fault ?? dps[12]);
        return {
          ...device,
          region: 'CN',
          dps,
          last_dp_reported_at: new Date().toISOString(),
          telemetry: {
            online: true,
            current_temp: dps.temperature ?? dps.cook_temperature ?? '-',
            motor_speed: petChefSpeed(dps.cook_mode_speed ?? dps[108]),
            motor_power: petChefPower(dps.cook_mode_power ?? dps[102]),
            water_tank_level: '-',
            scale_weight: '-',
            error_code: fault.code,
            error_message: fault.message,
            cup_status: Number(dps.fault ?? dps[12]) === 2 ? '未安装好' : '正常',
            lid_status: Number(dps.fault ?? dps[12]) === 1 ? '未盖好' : '正常',
            status: dps.status ?? '-',
            remain_time: dps.remain_time ?? '-',
          },
        };
      } catch (error) {
        return {
          ...device,
          region: 'CN',
          telemetry: {
            online: device.status !== 'offline',
            current_temp: '-',
            motor_speed: '-',
            water_tank_level: '-',
            scale_weight: '-',
            error_code: error.message,
          },
        };
      }
    }));
  res.json({ success: true, devices, count: devices.length, source: 'heybo_store' });
});

const LIFE_STAGE_LABEL = { puppy: '幼犬', adult: '成年犬', senior: '老年犬' };
const BODY_SIZE_LABEL = { mini: '小型犬', small: '小型犬', medium: '中型犬', large: '大型犬', giant: '大型犬' };
const ALLERGEN_ALIASES = {
  '鸡肉': ['鸡', '鸡肉', '鸡小胸', '鸡胸'],
  '牛肉': ['牛', '牛肉', '牛腩', '牛腱'],
  '鸭肉': ['鸭', '鸭肉'],
  '兔肉': ['兔', '兔肉'],
  '鱼': ['鱼', '海鲜', '金枪鱼', '三文鱼', '鳕鱼'],
  '燕麦': ['燕麦', '麦', '麸质', '谷物'],
};

function hasRecipeAllergen(recipe, allergens = []) {
  const ingredientNames = Object.keys(recipe?.ingredients || {});
  return allergens.some(allergen => {
    if (!allergen || typeof allergen !== 'string') return false;
    const aliases = ALLERGEN_ALIASES[allergen] || [allergen];
    return aliases.some(alias => ingredientNames.some(ingredient => ingredient.includes(alias) || alias.includes(ingredient)));
  });
}

function applyAllergenWarning(comparison, dogProfile, selection, recipeIndexByName = {}) {
  const recipeName = selection?.a_recipe_name;
  const recipe = recipeIndexByName[recipeName];
  const matchedAllergen = (dogProfile.allergens || []).find(allergen => {
    const aliases = ALLERGEN_ALIASES[allergen] || [allergen];
    return hasRecipeAllergen(recipe, [allergen]) || aliases.some(alias => String(recipeName || '').includes(alias));
  });
  if (!matchedAllergen) return comparison;
  const allergens = matchedAllergen || '已登记过敏原';
  return {
    ...comparison,
    has_warning: true,
    warning_level: 'warning',
    warning_text: `该配方包含或疑似包含过敏原：${allergens}，不建议选择。`,
  };
}

// ============================================================
// POST /api/v1/recommend — 智能推荐食谱（规则引擎）
// body: { pet_id }
// ============================================================
app.post('/api/v1/recommend', async (req, res) => {
  const resolved = await resolveDogProfileFromRequest(req);
  const dogProfile = resolved.dogProfile;
  if (!dogProfile) {
    return res.status(400).json({ success: false, error: resolved.missingPetId ? `Pet not found: ${resolved.missingPetId}` : 'pet_id is required' });
  }
  const { breedName, weight = 10, age = 3, goals = [], bcs, allergens = [] } = dogProfile;

  const breed = breedsDb.find(b => b.name === breedName || breedName?.includes(b.name) || b.name.includes(breedName));

  // 判断生命阶段
  let lifeStage = LIFE_STAGE_LABEL[dogProfile.lifeStage] || '成年犬';
  if (age < 1) lifeStage = '幼犬';
  else if (age >= 8) lifeStage = '老年犬';

  // 判断体型
  let size = BODY_SIZE_LABEL[dogProfile.bodySize] || '中型犬';
  if (weight < 10) size = '小型犬';
  else if (weight > 25) size = '大型犬';

  // 计算食量
  const intake = calcDailyIntake(breed, weight, age);

  // 评分推荐
  const { recipes } = await listRecipes();
  const scored = recipes.map(r => {
    let score = 0;
    if (r.life_stage === lifeStage) score += 40;
    if (!r.dog_size || r.dog_size === size) score += 20;

    // 功能性加分
    goals.forEach(g => {
      const tagStr = (r.tags || []).join(',') + r.category;
      if ((g === '美毛' && tagStr.includes('美毛'))) score += 15;
      if ((g === '护肝' && tagStr.includes('护肝'))) score += 15;
      if ((g === '低敏' && (tagStr.includes('低敏') || tagStr.includes('单一')))) score += 15;
      if ((g === '护关节' && tagStr.includes('关节'))) score += 15;
      if ((g === '低脂' && tagStr.includes('低脂'))) score += 10;
      if ((g === '高蛋白' && tagStr.includes('高蛋白'))) score += 10;
    });

    // 犬种特殊营养需求加分
    if (breed?.nutrition_notes) {
      breed.nutrition_notes.forEach(note => {
        if ((r.tags || []).includes(note) || r.category.includes(note)) score += 5;
      });
    }
    if (hasRecipeAllergen(r, allergens)) score -= 1000;
    if (Number(bcs) <= 3 && (goals.includes('muscle_gain') || goals.includes('增肌'))) score += 10;
    return { ...r, score };
  });

  const top = scored.filter(r => r.score > -500).sort((a, b) => b.score - a.score).slice(0, 6);

  res.json({
    success: true,
    recommendations: top,
    profile: { lifeStage, size, ...intake, breedName: breedName || breed?.name, pet_id: dogProfile.pet_id },
  });
});

// 画像对比辅助函数 (只对比会影响配方营养评估的 14 个画像核心字段)
const isProfileEqual = (p1, p2) => {
  if (!p1 || !p2) return false;
  const keysToCompare = [
    'sex', 'birthDate', 'breedId', 'breedName', 'bodySize', 'size',
    'activityLevel', 'environment', 'weight', 'targetWeight', 'bcs',
    'feedingGoal', 'goals', 'neutered', 'healthTags', 'allergensText',
    'allergens', 'allergySymptomsText', 'allergySymptoms', 'allergySeverity',
    'specialPeriod'
  ];
  for (const key of keysToCompare) {
    if (Array.isArray(p1[key]) && Array.isArray(p2[key])) {
      if (p1[key].length !== p2[key].length) return false;
      const sorted1 = [...p1[key]].sort();
      const sorted2 = [...p2[key]].sort();
      if (sorted1.some((val, idx) => val !== sorted2[idx])) return false;
    } else if (typeof p1[key] === 'object' || typeof p2[key] === 'object') {
      if (JSON.stringify(p1[key]) !== JSON.stringify(p2[key])) return false;
    } else if (p1[key] !== p2[key]) {
      return false;
    }
  }
  return true;
};

function getOptionalUserId(req) {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length);
  if (getEnvironment() !== 'production' && token.startsWith('dev_')) return token.replace('dev_', '');
  return verifyToken(token)?.sub || null;
}

function safeCacheId(value) {
  return String(value || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function compareCachePath(petCacheId) {
  return path.join(runtimeDataDir, `compare_cache_${petCacheId}.json`);
}

function normalizeCacheTimestamp(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

async function resolveDogProfileFromRequest(req) {
  const body = req.body || {};
  const petId = body.pet_id || body.petId;
  if (!petId) return { dogProfile: null, pet: null };
  const userId = getOptionalUserId(req);
  const pet = userId
    ? await petRepository.getPetForUser(userId, petId)
    : await petRepository.getPetById(petId);
  if (!pet) return { dogProfile: null, pet: null, missingPetId: petId };
  return {
    dogProfile: petRepository.petToDogProfile(pet, { lang: body.lang }),
    pet,
  };
}

// ============================================================
// POST /api/v1/recommend/compare — 比较并评估食谱配方变更的营养风险 (优先读物物理缓存)
// body: { pet_id, currentSelection, proposedSelection }
// ============================================================
app.post('/api/v1/recommend/compare', async (req, res) => {
  const { currentSelection, proposedSelection } = req.body;
  const resolved = await resolveDogProfileFromRequest(req);
  const dogProfile = resolved.dogProfile;
  if (!dogProfile || !currentSelection || !proposedSelection) {
    return res.status(400).json({ success: false, error: !dogProfile ? 'pet_id is required' : 'Missing required parameters' });
  }

  // 尝试读取物理缓存
  const petCacheId = safeCacheId(dogProfile.pet_id || dogProfile.id || dogProfile.name || 'default');
  const cacheFilePath = compareCachePath(petCacheId);
  if (fs.existsSync(cacheFilePath)) {
    try {
      const cacheData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
      const cacheAgeMs = Date.now() - (cacheData.timestamp || 0);
      const isExpired = cacheAgeMs > 30 * 24 * 60 * 60 * 1000;
      const isOldVersion = cacheData.cache_version !== AI_RECOMMENDATION_CACHE_VERSION;
      const isDirty = dogProfile.pet_updated_at
        ? normalizeCacheTimestamp(cacheData.pet_updated_at) !== normalizeCacheTimestamp(dogProfile.pet_updated_at)
        : !isProfileEqual(cacheData.dogProfile, dogProfile);

      if (!isExpired && !isDirty && !isOldVersion) {
        const proposedRecipeName = proposedSelection.a_recipe_name;
        if (cacheData.comparisons && cacheData.comparisons[proposedRecipeName]) {
          console.log(`[Compare Cache Hit File] Served ${proposedRecipeName} from cache for ${petCacheId}`);
          const { recipes } = await listRecipes();
          return res.json({
            success: true,
            comparison: applyAllergenWarning(cacheData.comparisons[proposedRecipeName], dogProfile, proposedSelection, buildRecipeIndexByName(recipes))
          });
        }
      }
    } catch (err) {
      console.error('[Compare Cache Read Error]', err.message);
    }
  }

  try {
    const { recipes } = await listRecipes();
    const recipeIndexByName = buildRecipeIndexByName(recipes);
    const comparison = await compareRecipeSelection({
      ...dogProfile,
      recipeIndexByName,
    }, currentSelection, proposedSelection);
    res.json({ success: true, comparison: applyAllergenWarning(comparison, dogProfile, proposedSelection, recipeIndexByName) });
  } catch (err) {
    console.error('Comparison API error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// POST /api/v1/recommend/compare/batch — 批量评估候选食谱配方变更的营养风险
// body: { pet_id, currentSelection, proposedSelections[] }
// ============================================================
app.post('/api/v1/recommend/compare/batch', async (req, res) => {
  const { currentSelection, proposedSelections } = req.body;
  const resolved = await resolveDogProfileFromRequest(req);
  const dogProfile = resolved.dogProfile;
  if (!dogProfile || !currentSelection || !proposedSelections || !Array.isArray(proposedSelections)) {
    return res.status(400).json({ success: false, error: !dogProfile ? 'pet_id is required' : 'Missing required parameters' });
  }

  try {
    const { recipes } = await listRecipes();
    const recipeIndexByName = buildRecipeIndexByName(recipes);
    const result = await compareRecipeSelectionBatch({
      ...dogProfile,
      recipeIndexByName,
    }, currentSelection, proposedSelections);
    const comparisons = { ...result.comparisons };
    proposedSelections.forEach(selection => {
      if (comparisons[selection.a_recipe_name]) {
        comparisons[selection.a_recipe_name] = applyAllergenWarning(comparisons[selection.a_recipe_name], dogProfile, selection, recipeIndexByName);
      }
    });
    res.json({ success: true, comparisons });
  } catch (err) {
    console.error('Batch comparison API error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// POST /api/v1/ai-analysis — Gemini AI 分析犬种营养需求（正式路径只收 pet_id）
// body: { pet_id, lang }
// ============================================================
app.post('/api/v1/ai-analysis', sensitiveLimiter, async (req, res) => {
  const resolved = await resolveDogProfileFromRequest(req);
  if (!resolved.dogProfile) {
    return res.status(404).json({ success: false, error: `Pet not found: ${resolved.missingPetId || ''}`.trim() });
  }
  const dogProfile = resolved.dogProfile;
  const {
    breedId, breedName, age = 3, weight = 15, customBreedName, lang,
    id, name, feedingGoal, goals = [], bcs, allergens = []
  } = dogProfile;

  const breed = breedsDb.find(b => b.id === breedId);
  const intake = calcDailyIntake(breed, weight, age);

  const petCacheId = safeCacheId(dogProfile.pet_id || id || name || 'default');
  const cacheFilePath = compareCachePath(petCacheId);
  let comparisons = null;
  let cacheValid = false;
  let cacheNeedsWrite = false;

  if (fs.existsSync(cacheFilePath)) {
    try {
      const cacheData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf8'));
      const cacheAgeMs = Date.now() - (cacheData.timestamp || 0);
      const isExpired = cacheAgeMs > 30 * 24 * 60 * 60 * 1000;
      const isOldVersion = cacheData.cache_version !== AI_RECOMMENDATION_CACHE_VERSION;
      const isDirty = dogProfile.pet_updated_at
        ? normalizeCacheTimestamp(cacheData.pet_updated_at) !== normalizeCacheTimestamp(dogProfile.pet_updated_at)
        : !isProfileEqual(cacheData.dogProfile, dogProfile);

      if (!isExpired && !isDirty && !isOldVersion) {
        comparisons = cacheData.comparisons || null;
        cacheValid = true;
        if (cacheData.analysis && comparisons) {
          console.log(`[AI Analysis Cache Hit File] Served valid cache for pet ${petCacheId}`);
          return res.json({
            success: true,
            analysis: { ...cacheData.analysis, ...intake },
            comparisons,
            cache_hit: true
          });
        }
        cacheNeedsWrite = true;
        console.log(`[AI Analysis Cache Partial Hit] Reusing comparisons only for pet ${petCacheId}`);
      } else {
        console.log(`[Cache Invalidated] isExpired: ${isExpired}, isDirty: ${isDirty} for pet ${petCacheId}`);
      }
    } catch (err) {
      console.error('[Cache Parsing Error]', err.message);
    }
  }

  let analysis = null;
  try {
    analysis = await analyzeBreedNutrition(
      breedName || breed?.name,
      age,
      weight,
      customBreedName,
      bcs,
      goals,
      allergens,
      lang
    );
  } catch (e) {
    console.error('AI analysis failed, using fallback:', e.message);
  }

  if (!analysis) {
    let lifeStage = '成年犬', nutritionNeeds = [];
    if (age < 1) { lifeStage = '幼犬'; nutritionNeeds = ['高蛋白促进生长', 'DHA脑部发育', '适量钙质骨骼健康']; }
    else if (age >= 8) { lifeStage = '老年犬'; nutritionNeeds = ['易消化低脂', '关节保护', '抗氧化护心']; }
    else { nutritionNeeds = ['均衡蛋白质', '优质脂肪', '丰富蔬菜纤维']; }

    if (breed?.nutrition_notes) nutritionNeeds.push(...breed.nutrition_notes.slice(0, 2));

    const cautions = [];
    if (breed && weight < breed.weight_avg * 0.7) {
      nutritionNeeds.unshift('营养不良/体重偏瘦');
      cautions.push(`⚠️ 您的宠物当前体重（${weight}kg）显著低于${breed.name}的平均体重（${breed.weight_avg}kg左右），属于明显偏瘦/营养不良状态，建议逐步增加喂食量，并配合全价高能营养包以促进体重恢复。`);
    }

    analysis = {
      breed_intro: breed?.breed_desc || `${breedName || '您的爱犬'}是一种优秀的犬种。`,
      life_stage: lifeStage,
      activity_level: breed?.activity || 'medium',
      key_nutrition_needs: nutritionNeeds,
      cautions: cautions,
      nutrition_analysis: `根据您的${breedName || '爱犬'}${age}岁、${weight}kg的信息，每日所需鲜食量约为${intake.daily_grams}克，建议每日分${intake.meals_per_day}次喂食，每次约${intake.per_meal_grams}克。`,
    };
  }

  const mergedAnalysis = { ...analysis, ...intake };

  if (!cacheValid) {
    const lifeStage = mergedAnalysis.life_stage || '成年犬';
    let targetCat = '成犬通用';
    if (lifeStage === '幼犬') {
      targetCat = weight >= 25 ? '控钙幼犬（大型幼犬）' : '幼犬通用';
    } else if (lifeStage === '老年犬') {
      targetCat = '老年犬通用';
    }

    const { recipes } = await listRecipes();
    const categoryRecipes = recipes.filter(r => r.category === targetCat);
    const baselineRecipe = categoryRecipes[0] || recipes[0];

    let recommendedBName = '成犬维护营养包B';
    if (lifeStage === '幼犬') {
      recommendedBName = weight >= 25 ? '大型幼犬稳骨控钙营养包B' : '幼犬成长营养包B';
    } else if (lifeStage === '老年犬') {
      recommendedBName = '老年犬轻负担营养包B';
    } else {
      const goalsList = feedingGoal ? [feedingGoal] : (goals || []);
      if (goalsList.includes('美毛')) recommendedBName = '成犬/美毛基础营养包B';
      else if (goalsList.includes('护肝')) recommendedBName = '成犬/护肝基础营养包B';
      else if (goalsList.includes('低敏')) recommendedBName = '低敏单一蛋白营养包B';
    }

    const recommendedCList = [];
    if (lifeStage === '幼犬') {
      recommendedCList.push('脑发育支持功能包C');
    }
    const goalsList = feedingGoal ? [feedingGoal] : (goals || []);
    if (goalsList.includes('美毛') || goalsList.includes('皮毛')) {
      recommendedCList.push('美毛护肤支持功能包C');
    }
    if (goalsList.includes('护肝')) {
      recommendedCList.push('护肝支持功能包C');
    }
    if (goalsList.includes('低敏') || goalsList.includes('肠胃') || goalsList.includes('消化')) {
      recommendedCList.push('肠胃健康支持功能包C');
    }
    if (lifeStage === '老年犬' || goalsList.includes('关节') || goalsList.includes('护关节')) {
      recommendedCList.push('关节支持功能包C');
    }
    if (lifeStage === '老年犬' || goalsList.includes('抗炎') || goalsList.includes('免疫')) {
      recommendedCList.push('抗炎免疫支持功能包C');
    }
    const defaultCList = [...new Set(recommendedCList)].slice(0, 1);

    const currentSelection = {
      a_recipe_name: baselineRecipe?.name || '',
      b_pack_name: recommendedBName,
      c_pack_names: defaultCList
    };

    const proposedSelections = categoryRecipes.slice(0, 10).map(r => ({
      a_recipe_name: r.name,
      b_pack_name: recommendedBName,
      c_pack_names: defaultCList
    }));

    const scoringDogProfile = {
      ...dogProfile,
      recipeIndexByName: buildRecipeIndexByName(recipes),
    };

    try {
      const result = await compareRecipeSelectionBatch(scoringDogProfile, currentSelection, proposedSelections);
      comparisons = result.comparisons;
      cacheNeedsWrite = true;
    } catch (err) {
      console.error('Failed to pre-compute comparisons:', err.message);
      comparisons = {};
      const { getLocalComparisonWarning } = require('./services/gemini');
      proposedSelections.forEach(p => {
        comparisons[p.a_recipe_name] = getLocalComparisonWarning(scoringDogProfile, currentSelection, p);
      });
      cacheNeedsWrite = true;
    }
  }

  if (cacheNeedsWrite) {
    fs.writeFileSync(cacheFilePath, JSON.stringify({
      cache_version: AI_RECOMMENDATION_CACHE_VERSION,
      timestamp: Date.now(),
      pet_id: dogProfile.pet_id || dogProfile.id,
      pet_updated_at: normalizeCacheTimestamp(dogProfile.pet_updated_at),
      dogProfile: dogProfile,
      analysis: mergedAnalysis,
      comparisons: comparisons
    }, null, 2), 'utf8');
    console.log(`[Cache Written File] Saved analysis cache for pet ${petCacheId}`);
  }

  res.json({
    success: true,
    analysis: mergedAnalysis,
    comparisons: comparisons,
    cache_hit: false
  });
});

// ============================================================
// POST /api/v1/ai-recipe — Gemini AI 生成新食谱
// body: { breedId, breedName, age, weight, goals[] }
// ============================================================
app.post('/api/v1/ai-recipe', sensitiveLimiter, async (req, res) => {
  const { breedId, breedName, age = 3, weight = 15, goals = [] } = req.body;
  const breed = breedsDb.find(b => b.id === breedId);
  const existingNames = await getRecipeNames();

  const aiRecipe = await generateAIRecipe(
    breedName || breed?.name || '家犬',
    age, weight, goals, existingNames
  );

  // 检查是否返回错误（如毒性食材检测）
  if (!aiRecipe) return res.status(500).json({ success: false, error: 'AI recipe generation failed' });
  if (aiRecipe.error) return res.status(400).json({ success: false, ...aiRecipe });

  // 构造完整食谱对象
  const fullRecipe = {
    id: `ai_recipe_${Date.now()}`,
    category: 'AI定制',
    category_code: 99,
    category_type: 'ai_generated',
    life_stage: age < 1 ? '幼犬' : age >= 8 ? '老年犬' : '成年犬',
    dog_size: weight < 10 ? '小型犬' : weight > 25 ? '大型犬' : '中型犬',
    img: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&h=400&q=80',
    isAIGenerated: true,
    ...aiRecipe,
  };

  res.json({ success: true, recipe: fullRecipe });
});

// ============================================================
// POST /api/v1/ingredients/safety-check — 食材安全检测
// body: { "ingredients": ["鸡胸肉", "葡萄", "胡萝卜"] }
// ============================================================
app.post('/api/v1/ingredients/safety-check', async (req, res) => {
  const { ingredients } = req.body;
  
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ success: false, error: 'ingredients array required' });
  }
  
  const result = await validateIngredientSafety(ingredients);
  
  const warnings = generateSafetyWarnings(result);
  
  res.json({
    success: true,
    safe: result.safe,
    caution: result.caution,
    toxic: result.toxic,
    unknown: result.unknown,
    has_toxic: hasToxicIngredients(result),
    has_caution: hasCautionIngredients(result),
    warnings,
  });
});

// ============================================================
// POST /api/v1/cook/params — 计算烹饪参数
// body: { recipeId, weight, age, breedId, mealType: 'daily'|'per_meal' }
// ============================================================
app.post('/api/v1/cook/params', async (req, res) => {
  const { recipeId, weight = 15, age = 3, breedId, totalGrams } = req.body;

  const { recipe } = await getRecipeById(recipeId);
  if (!recipe) return res.status(404).json({ success: false, error: 'Recipe not found' });

  const breed = breedsDb.find(b => b.id === breedId);
  const intake = calcDailyIntake(breed, weight, age);

  // 使用传入的克数（每餐），或自动计算
  const cookGrams = totalGrams || intake.per_meal_grams;
  const cookParams = calcCookingParams(recipe, cookGrams);
  const ingredientList = calcIngredientGrams(recipe.ingredients, cookGrams);

  res.json({
    success: true,
    intake,
    cookParams: { ...cookParams, water_content_pct: recipe.water_content_pct },
    ingredientList,
    recipe: { id: recipe.id, name: recipe.name, img: recipe.img },
  });
});

// ============================================================
// POST /api/v1/tuya/start — 启动鲜食机
// ============================================================
app.post('/api/v1/tuya/start', sensitiveLimiter, async (req, res) => {
  const { temperature = 85, power = 8, speed = '1', cook_time } = req.body;

  if (!cook_time) return res.status(400).json({ success: false, error: 'cook_time (seconds) required' });

  try {
    const result = await startCooking({ temperature, power: parseInt(power), speed, cook_time: parseInt(cook_time) });
    res.json({ success: true, result });
  } catch (err) {
    console.error('Tuya start error:', err.message, err.response?.data);
    // 模拟模式（涂鸦不可用时）
    res.json({
      success: true,
      simulated: true,
      message: '鲜食机指令已发送（模拟模式）',
      error_detail: err.message,
      params: { temperature, power, speed, cook_time },
    });
  }
});

// ============================================================
// POST /api/v1/tuya/pause — 暂停
// ============================================================
app.post('/api/v1/tuya/pause', async (req, res) => {
  try {
    const result = await pauseCooking();
    res.json({ success: true, result });
  } catch (err) {
    console.error('Tuya pause error:', err.message);
    res.json({ success: true, simulated: true, message: '已暂停（模拟）', error_detail: err.message });
  }
});

// ============================================================
// POST /api/v1/tuya/stop — 停止
// ============================================================
app.post('/api/v1/tuya/stop', async (req, res) => {
  try {
    const result = await stopCooking();
    res.json({ success: true, result });
  } catch (err) {
    console.error('Tuya stop error:', err.message);
    res.json({ success: true, simulated: true, message: '已停止（模拟）', error_detail: err.message });
  }
});

// ============================================================
// GET /api/v1/tuya/status — 获取设备状态
// ============================================================
app.get('/api/v1/tuya/status', async (req, res) => {
  try {
    const result = await getDeviceStatus(req.query.devId);
    res.json({ success: true, status: result, dps: tuyaRowsToDps(result.result || []) });
  } catch (err) {
    console.error('Tuya status error:', err.message);
    res.json({ success: true, simulated: true, status: { online: true, cooking: false }, error_detail: err.message });
  }
});

// ============================================================
// POST /api/v1/pets/evaluate-bcs — AI 评估宠物 BCS 与标准发育体重
// ============================================================
app.post('/api/v1/pets/evaluate-bcs', async (req, res) => {
  const { breedName, ageMonths, weight } = req.body || {};
  if (!breedName || !weight) {
    return res.status(400).json({ success: false, error: 'breedName and weight are required' });
  }

  try {
    const evaluation = await evaluatePetBCS({ breedName, ageMonths: ageMonths || 12, weight });
    res.json({ success: true, evaluation });
  } catch (err) {
    console.warn('[AI] DeepSeek evaluation failed, using local growth fallback:', err.message);
    
    // local fallback
    let adultWeight = 15;
    const selected = breedsDb.find(b => b.name === breedName || b.id === breedName);
    if (selected && selected.weight_avg) {
      adultWeight = selected.weight_avg;
    }

    const ageMonthsVal = ageMonths || 12;
    let factor = 1.0;
    if (ageMonthsVal < 12) {
      if (ageMonthsVal <= 1) factor = 0.1;
      else if (ageMonthsVal <= 2) factor = 0.1 + (ageMonthsVal - 1) * 0.1;
      else if (ageMonthsVal <= 3) factor = 0.2 + (ageMonthsVal - 2) * 0.1;
      else if (ageMonthsVal <= 4) factor = 0.3 + (ageMonthsVal - 3) * 0.15;
      else if (ageMonthsVal <= 6) factor = 0.45 + (ageMonthsVal - 4) * 0.1;
      else if (ageMonthsVal <= 8) factor = 0.65 + (ageMonthsVal - 6) * 0.075;
      else factor = 0.8 + (ageMonthsVal - 8) * 0.05;
    }
    const standardWeight = parseFloat((adultWeight * factor).toFixed(1));
    const ratio = weight / standardWeight;

    let score = 5;
    let label = '理想体态';
    let description = '发育标准。肋骨易于触及但覆有适当脂肪，腰部轮廓明显。';
    if (ratio <= 0.65) { score = 1; label = '极度消瘦'; description = '极度消瘦。发育受阻，请咨询兽医。'; }
    else if (ratio <= 0.75) { score = 2; label = '偏瘦'; description = '偏瘦。建议逐渐补充优质蛋白营养。'; }
    else if (ratio <= 0.85) { score = 3; label = '稍瘦'; description = '稍瘦。可以适当增加喂食分量。'; }
    else if (ratio <= 0.95) { score = 4; label = '偏苗条'; description = '偏苗条。体态匀称，状态较好。'; }
    else if (ratio <= 1.05) { score = 5; label = '理想体态'; description = '理想体态。该年龄阶段发育标准。'; }
    else if (ratio <= 1.15) { score = 6; label = '偏丰满'; description = '偏丰满。略微有些圆润。'; }
    else if (ratio <= 1.25) { score = 7; label = '超重'; description = '超重。建议适当调低喂食比例。'; }
    else if (ratio <= 1.40) { score = 8; label = '肥胖'; description = '肥胖。建议进入科学控卡喂食。'; }
    else { score = 9; label = '极度肥胖'; description = '极度肥胖。骨骼负荷过大，建议医疗减重。'; }

    res.json({
      success: true,
      evaluation: {
        standard_weight: standardWeight,
        bcs_score: score,
        bcs_label: label,
        bcs_description: description
      }
    });
  }
});

// ============================================================
// 健康检查
// ============================================================
app.get('/api/v1/health', async (req, res) => {
  const { recipes } = await listRecipes();
  res.json({
    success: true,
    version: '3.0.0',
    recipes: recipes.length,
    breeds: breedsDb.length,
    regionalized: true,
  });
});

// 调试端点：检查环境变量是否正确加载
app.get('/api/v1/debug-env', (req, res) => {
  res.json({
    TUYA_ACCESS_ID: process.env.TUYA_ACCESS_ID ? `${process.env.TUYA_ACCESS_ID.substring(0, 6)}...` : 'MISSING',
    TUYA_SECRET: process.env.TUYA_SECRET ? `${process.env.TUYA_SECRET.substring(0, 6)}...` : 'MISSING',
    TUYA_DEVICE_ID: process.env.TUYA_DEVICE_ID ? `${process.env.TUYA_DEVICE_ID.substring(0, 6)}...` : 'MISSING',
    TUYA_BASE_URL: process.env.TUYA_BASE_URL || 'MISSING (default: tuyacn.com)',
    GEMINI_API_KEY: process.env.GEMINI_API_KEY ? `${process.env.GEMINI_API_KEY.substring(0, 8)}...` : 'MISSING',
    NODE_ENV: process.env.NODE_ENV || 'undefined',
    VERCEL: process.env.VERCEL || 'undefined',
  });
});

const PORT = process.env.PORT || 3001;

// Only start the server if we are not running in a Serverless environment (like Vercel).
if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    printRegionSummary();
    console.log(`✅ Heybo Regional Monolith Server running on port ${PORT}`);
  });
}

// Export the Express API for Vercel Serverless
module.exports = app;
