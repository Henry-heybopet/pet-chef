// index.js — 后端主入口（修复 CommonJS 兼容）
require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { breedsDb } = require('./data/breeds_db');
const { recipesDb } = require('./data/recipes_db');
const { analyzeBreedNutrition, generateAIRecipe } = require('./services/gemini');
const { startCooking, pauseCooking, stopCooking, getDeviceStatus } = require('./services/tuya');
const { calcCookingParams, calcDailyIntake, calcIngredientGrams } = require('./services/cooking_engine');

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================
// GET /api/breeds — 获取全部犬种列表
// ============================================================
app.get('/api/breeds', (req, res) => {
  res.json({ success: true, breeds: breedsDb });
});

// ============================================================
// GET /api/recipes — 按分类获取食谱
// query: category (生命阶段分类名) | life_stage | dog_size | functional | protein | all
// ============================================================
app.get('/api/recipes', (req, res) => {
  const { category, life_stage, dog_size, functional, protein, all } = req.query;
  let result = recipesDb;

  if (all) {
    return res.json({ success: true, recipes: result });
  }

  // 按主分类名筛选（如"幼犬食谱"、"老年犬食谱"）
  if (category) {
    result = result.filter(r => r.category.includes(category) || r.category_type === category);
  }
  // 按生命阶段
  if (life_stage) {
    result = result.filter(r => r.life_stage === life_stage);
  }
  // 按体型
  if (dog_size) {
    result = result.filter(r => !r.dog_size || r.dog_size === dog_size);
  }
  // 按功能分类
  if (functional) {
    result = result.filter(r => r.category_type === 'functional' && r.category.includes(functional));
  }
  // 按蛋白质来源（鸡肉/牛肉/鱼肉）
  if (protein) {
    result = result.filter(r => Object.keys(r.ingredients).some(name => name.includes(protein)));
  }
  // 其它肉类（鸭/羊/鹿/火鸡）— 排除鸡肉/牛肉/鱼肉为主的食谱
  if (req.query.protein_other) {
    const otherMeats = ['鸭', '羊', '鹿', '火鸡'];
    result = result.filter(r => {
      const ingNames = Object.keys(r.ingredients);
      return otherMeats.some(m => ingNames.some(name => name.includes(m)));
    });
  }

  res.json({ success: true, recipes: result, count: result.length });
});

// ============================================================
// GET /api/recipes/:id — 获取单个食谱详情
// ============================================================
app.get('/api/recipes/:id', (req, res) => {
  const recipe = recipesDb.find(r => r.id === req.params.id);
  if (!recipe) return res.status(404).json({ success: false, error: 'Recipe not found' });
  res.json({ success: true, recipe });
});

// ============================================================
// POST /api/recommend — 智能推荐食谱（规则引擎）
// body: { breedId, weight, age, goals[] }
// ============================================================
app.post('/api/recommend', (req, res) => {
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
// POST /api/ai-analysis — Gemini AI 分析犬种营养需求
// body: { breedId, breedName, age, weight, customBreedName }
// ============================================================
app.post('/api/ai-analysis', async (req, res) => {
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

  res.json({
    success: true,
    analysis: {
      breed_intro: breed?.breed_desc || `${breedName || '您的爱犬'}是一种优秀的犬种。`,
      life_stage: lifeStage,
      activity_level: breed?.activity || 'medium',
      key_nutrition_needs: nutritionNeeds,
      nutrition_analysis: `根据您的${breedName || '爱犬'}${age}岁、${weight}kg的信息，每日所需鲜食量约为${intake.daily_grams}克，建议每日分${intake.meals_per_day}次喂食，每次约${intake.per_meal_grams}克。`,
      ...intake,
    },
  });
});

// ============================================================
// POST /api/ai-recipe — Gemini AI 生成新食谱
// body: { breedId, breedName, age, weight, goals[] }
// ============================================================
app.post('/api/ai-recipe', async (req, res) => {
  const { breedId, breedName, age = 3, weight = 15, goals = [] } = req.body;
  const breed = breedsDb.find(b => b.id === breedId);
  const existingNames = recipesDb.map(r => r.name);

  const aiRecipe = await generateAIRecipe(
    breedName || breed?.name || '家犬',
    age, weight, goals, existingNames
  );

  if (!aiRecipe) return res.status(500).json({ success: false, error: 'AI recipe generation failed' });

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
// POST /api/cook/params — 计算烹饪参数
// body: { recipeId, weight, age, breedId, mealType: 'daily'|'per_meal' }
// ============================================================
app.post('/api/cook/params', (req, res) => {
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
// POST /api/tuya/start — 启动鲜食机
// ============================================================
app.post('/api/tuya/start', async (req, res) => {
  const { temperature = 85, power = 8, speed = '1', cook_time } = req.body;

  if (!cook_time) return res.status(400).json({ success: false, error: 'cook_time (seconds) required' });

  try {
    const result = await startCooking({ temperature, power: parseInt(power), speed, cook_time: parseInt(cook_time) });
    res.json({ success: true, result });
  } catch (err) {
    // 模拟模式（涂鸦不可用时）
    res.json({
      success: true,
      simulated: true,
      message: '鲜食机指令已发送（模拟模式）',
      params: { temperature, power, speed, cook_time },
    });
  }
});

// ============================================================
// POST /api/tuya/pause — 暂停
// ============================================================
app.post('/api/tuya/pause', async (req, res) => {
  try {
    const result = await pauseCooking();
    res.json({ success: true, result });
  } catch (err) {
    res.json({ success: true, simulated: true, message: '已暂停（模拟）' });
  }
});

// ============================================================
// POST /api/tuya/stop — 停止
// ============================================================
app.post('/api/tuya/stop', async (req, res) => {
  try {
    const result = await stopCooking();
    res.json({ success: true, result });
  } catch (err) {
    res.json({ success: true, simulated: true, message: '已停止（模拟）' });
  }
});

// ============================================================
// GET /api/tuya/status — 获取设备状态
// ============================================================
app.get('/api/tuya/status', async (req, res) => {
  try {
    const result = await getDeviceStatus();
    res.json({ success: true, status: result });
  } catch (err) {
    res.json({ success: true, simulated: true, status: { online: true, cooking: false } });
  }
});

// ============================================================
// 健康检查
// ============================================================
app.get('/api/health', (req, res) => {
  res.json({ success: true, version: '2.0.0', recipes: recipesDb.length, breeds: breedsDb.length });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Heybo Lux Backend v2.0 running on port ${PORT}`);
  console.log(`   Recipes: ${recipesDb.length} | Breeds: ${breedsDb.length}`);
  console.log(`   Gemini AI: ${process.env.GEMINI_API_KEY ? '✅' : '❌ Missing key'}`);
  console.log(`   Tuya API:  ${process.env.TUYA_ACCESS_ID ? '✅' : '❌ Missing key'}`);
});
