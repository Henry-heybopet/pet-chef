// Pet Chef Ver B1.00 — Safety Filter · 2026-06-22
// index.js — 后端主入口（修复 CommonJS 兼容）
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const { breedsDb } = require('./data/breeds_db');
const { recipesDb } = require('./data/recipes_db');
const { analyzeBreedNutrition, generateAIRecipe, compareRecipeSelection } = require('./services/gemini');
const { evaluatePetBCS } = require('./services/deepseek');
const { validateIngredientSafety, hasToxicIngredients, hasCautionIngredients, generateSafetyWarnings } = require('./services/safety_filter');
const { startCooking, pauseCooking, stopCooking, getDeviceStatus } = require('./services/tuya');
const { calcCookingParams, calcDailyIntake, calcIngredientGrams } = require('./services/cooking_engine');
const heyboRoutes = require('./routes/heybo');
const { query, isAvailable } = require('./data/pg_client');
const { getCorsOrigins, printRegionSummary } = require('./config/region_config');

// 尝试从 PostgreSQL 获取食谱，失败则回退到 JSON
async function fetchRecipesFromDB(filterFn) {
  const pgAvailable = await isAvailable();
  if (pgAvailable) {
    try {
      const result = await query('SELECT * FROM recipes WHERE status = $1', ['active']);
      const recipes = result.rows.map(r => {
        const healthTags = Array.isArray(r.health_tags) 
          ? r.health_tags 
          : (typeof r.health_tags === 'string' ? JSON.parse(r.health_tags) : (r.health_tags || []));
        const ingredients = typeof r.ingredients === 'string' ? JSON.parse(r.ingredients) : (r.ingredients || {});
        const cookingBase = typeof r.cooking_profile === 'string' ? JSON.parse(r.cooking_profile) : (r.cooking_profile || {});
        const nut = typeof r.nutrition_snapshot === 'string' ? JSON.parse(r.nutrition_snapshot) : (r.nutrition_snapshot || {});
        return {
          id: r.id,
          name: r.name,
          category: r.category,
          life_stage: r.life_stage,
          tags: healthTags,
          ingredients: ingredients,
          cooking_base: cookingBase,
          b_pack: r.b_pack || nut.b_pack || '无',
          c_pack: r.c_pack || nut.c_pack || '无',
          img: r.img || '',
          water_content_pct: r.water_content_pct || nut.water_content_pct || 70,
          protein_pct: r.protein_pct || nut.protein_pct || 30,
          fat_pct: r.fat_pct || nut.fat_pct || 15,
          carb_pct: r.carb_pct || nut.carb_pct || 35,
          fiber_pct: r.fiber_pct || nut.fiber_pct || 5,
        };
      });
      return { recipes, source: 'pg' };
    } catch (err) {
      console.warn('[DB] PostgreSQL query failed, falling back to JSON:', err.message);
    }
  }
  // JSON 回退
  const recipes = filterFn ? recipesDb.filter(filterFn) : recipesDb;
  return { recipes, source: 'json_fallback' };
}

const app = express();

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

app.use(express.json({
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

  // custom_category 映射表：新分类体系 → 食谱过滤逻辑
  const customCategoryFilter = (r) => {
    switch (custom_category) {
      case 'puppy': return r.life_stage === '幼犬';
      case 'adult': return r.life_stage === '成年犬';
      case 'senior': return r.life_stage === '老年犬';
      case 'skin': return r.category === '美毛';
      case 'digestive':
        return ['dog_recipe_004', 'dog_recipe_022'].includes(r.id) || r.category === '低敏';
      case 'joint':
        return r.id === 'dog_recipe_021' || (r.life_stage === '幼犬' && r.dog_size === '大型犬');
      case 'weight':
        return ['dog_recipe_017', 'dog_recipe_018', 'dog_recipe_023', 'dog_recipe_032'].includes(r.id);
      case 'anti_inflammatory':
        return ['dog_recipe_003', 'dog_recipe_030', 'dog_recipe_034'].includes(r.id);
      case 'cardiac': return r.id === 'dog_recipe_024';
      case 'liver': return r.category === '护肝';
      case 'brain': return r.id === 'dog_recipe_002';
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
    if (protein) match = match && Object.keys(r.ingredients).some(name => name.includes(protein));
    if (req.query.protein_other) {
      const otherMeats = ['鸭', '羊', '鹿', '火鸡'];
      const ingNames = Object.keys(r.ingredients);
      match = match && otherMeats.some(m => ingNames.some(name => name.includes(m)));
    }
    return match;
  };

  const { recipes, source } = await fetchRecipesFromDB(filterFn);
  const result = all ? recipes : recipes.filter(filterFn);

  res.json({ success: true, recipes: result, count: result.length, source });
});

// ============================================================
// GET /api/v1/recipes/:id — 获取单个食谱详情（PG + JSON 回退）
// ============================================================
app.get('/api/v1/recipes/:id', async (req, res) => {
  const pgAvailable = await isAvailable();
  let recipe = null;
  let source = 'json_fallback';

  if (pgAvailable) {
    try {
      const result = await query('SELECT * FROM recipes WHERE id = $1 AND status = $2', [req.params.id, 'active']);
      if (result.rows.length > 0) {
        const r = result.rows[0];
        recipe = {
          ...r,
          tags: Array.isArray(r.tags) ? r.tags : (r.tags || '{}').slice(1, -1).split(',').filter(Boolean),
          ingredients: typeof r.ingredients === 'string' ? JSON.parse(r.ingredients) : r.ingredients,
          cooking_base: typeof r.cooking_base === 'string' ? JSON.parse(r.cooking_base) : r.cooking_base,
        };
        source = 'pg';
      }
    } catch (err) {
      console.warn('[DB] PostgreSQL query failed, falling back to JSON:', err.message);
    }
  }

  if (!recipe) {
    recipe = recipesDb.find(r => r.id === req.params.id);
  }

  if (!recipe) return res.status(404).json({ success: false, error: 'Recipe not found' });
  res.json({ success: true, recipe, source });
});

// ============================================================
// POST /api/v1/recommend — 智能推荐食谱（规则引擎）
// body: { breedId, weight, age, goals[] }
// ============================================================
app.post('/api/v1/recommend', (req, res) => {
  const { breedId, weight = 10, age = 3, goals = [] } = req.body;

  const breed = breedsDb.find(b => b.id === breedId);

  // 判断生命阶段
  let lifeStage = '成年犬';
  if (age < 1) lifeStage = '幼犬';
  else if (age >= 8) lifeStage = '老年犬';

  // 判断体型
  let size = '中型犬';
  if (weight < 10) size = '小型犬';
  else if (weight > 25) size = '大型犬';

  // 计算食量
  const intake = calcDailyIntake(breed, weight, age);

  // 评分推荐
  const scored = recipesDb.map(r => {
    let score = 0;
    if (r.life_stage === lifeStage) score += 40;
    if (!r.dog_size || r.dog_size === size) score += 20;

    // 功能性加分
    goals.forEach(g => {
      const tagStr = r.tags.join(',') + r.category;
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
        if (r.tags.includes(note) || r.category.includes(note)) score += 5;
      });
    }
    return { ...r, score };
  });

  const top = scored.sort((a, b) => b.score - a.score).slice(0, 6);

  res.json({
    success: true,
    recommendations: top,
    profile: { lifeStage, size, ...intake, breedName: breed?.name },
  });
});

// ============================================================
// POST /api/v1/recommend/compare — 比较并评估食谱配方变更的营养风险
// body: { dogProfile, currentSelection, proposedSelection }
// ============================================================
app.post('/api/v1/recommend/compare', async (req, res) => {
  const { dogProfile, currentSelection, proposedSelection } = req.body;
  if (!dogProfile || !currentSelection || !proposedSelection) {
    return res.status(400).json({ success: false, error: 'Missing required parameters' });
  }

  try {
    const comparison = await compareRecipeSelection(dogProfile, currentSelection, proposedSelection);
    res.json({ success: true, comparison });
  } catch (err) {
    console.error('Comparison API error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// POST /api/v1/ai-analysis — Gemini AI 分析犬种营养需求
// body: { breedId, breedName, age, weight, customBreedName }
// ============================================================
app.post('/api/v1/ai-analysis', sensitiveLimiter, async (req, res) => {
  const { breedId, breedName, age = 3, weight = 15, customBreedName, lang } = req.body;
  const breed = breedsDb.find(b => b.id === breedId);
  const intake = calcDailyIntake(breed, weight, age);

  try {
    const analysis = await analyzeBreedNutrition(breedName || breed?.name, age, weight, customBreedName, lang);
    if (analysis) {
      return res.json({ success: true, analysis: { ...analysis, ...intake } });
    }
  } catch (e) {
    console.error('AI analysis failed, using fallback:', e.message);
  }

  // 规则引擎降级
  let lifeStage = '成年犬', nutritionNeeds = [];
  if (age < 1) { lifeStage = '幼犬'; nutritionNeeds = ['高蛋白促进生长', 'DHA脑部发育', '适量钙质骨骼健康']; }
  else if (age >= 8) { lifeStage = '老年犬'; nutritionNeeds = ['易消化低脂', '关节保护', '抗氧化护心']; }
  else { nutritionNeeds = ['均衡蛋白质', '优质脂肪', '丰富蔬菜纤维']; }

  if (breed?.nutrition_notes) nutritionNeeds.push(...breed.nutrition_notes.slice(0, 2));

  // 校验宠物是否明显偏瘦
  const cautions = [];
  if (breed && weight < breed.weight_avg * 0.7) {
    nutritionNeeds.unshift('营养不良/体重偏瘦');
    cautions.push(`⚠️ 您的宠物当前体重（${weight}kg）显著低于${breed.name}的平均体重（${breed.weight_avg}kg左右），属于明显偏瘦/营养不良状态，建议逐步增加喂食量，并配合全价高能营养包以促进体重恢复。`);
  }

  res.json({
    success: true,
    analysis: {
      breed_intro: breed?.breed_desc || `${breedName || '您的爱犬'}是一种优秀的犬种。`,
      life_stage: lifeStage,
      activity_level: breed?.activity || 'medium',
      key_nutrition_needs: nutritionNeeds,
      cautions: cautions,
      nutrition_analysis: `根据您的${breedName || '爱犬'}${age}岁、${weight}kg的信息，每日所需鲜食量约为${intake.daily_grams}克，建议每日分${intake.meals_per_day}次喂食，每次约${intake.per_meal_grams}克。`,
      ...intake,
    },
  });
});

// ============================================================
// POST /api/v1/ai-recipe — Gemini AI 生成新食谱
// body: { breedId, breedName, age, weight, goals[] }
// ============================================================
app.post('/api/v1/ai-recipe', sensitiveLimiter, async (req, res) => {
  const { breedId, breedName, age = 3, weight = 15, goals = [] } = req.body;
  const breed = breedsDb.find(b => b.id === breedId);
  const existingNames = recipesDb.map(r => r.name);

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
app.post('/api/v1/ingredients/safety-check', (req, res) => {
  const { ingredients } = req.body;
  
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ success: false, error: 'ingredients array required' });
  }
  
  const result = validateIngredientSafety(ingredients);
  
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
app.post('/api/v1/cook/params', (req, res) => {
  const { recipeId, weight = 15, age = 3, breedId, totalGrams } = req.body;

  const recipe = recipesDb.find(r => r.id === recipeId);
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
    const result = await getDeviceStatus();
    res.json({ success: true, status: result });
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
app.get('/api/v1/health', (req, res) => {
  res.json({
    success: true,
    version: '3.0.0',
    recipes: recipesDb.length,
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
