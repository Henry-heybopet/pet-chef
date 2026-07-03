// Pet Chef Ver B1.00 — Safety Filter · 2026-06-22
// gemini.js — Google Gemini AI 客户端封装 (已迁移为 DeepSeek)
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { validateIngredientSafety, hasToxicIngredients, generateSafetyWarnings } = require('./safety_filter');
const { breedsDb } = require('../data/breeds_db');

async function callDeepSeekAPI(systemPrompt, userPrompt) {
  const apiKey = process.env.DEEPSEEK_API_KEY || 'sk-85673c68584b4c06a9aa5d1fe5db5108';
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// 宠物营养学专家 System Prompt
const NUTRITION_EXPERT_PROMPT = `你是 Heybo Lux 的首席宠物营养学专家，拥有兽医营养学博士学位，
专注于犬类鲜食营养配方研究20年。你深谙各犬种的体质特点 and 营养需求。

你的核心职责：
1. 根据犬种/年龄/体重提供科学的营养 analysis
2. 设计针对性的鲜食食谱（成分配比精确到百分比，总和=100）
3. 解释食材的营养功效
4. 提供专业但通俗易懂的建议

犬的活跃度分级：
- 低活跃：老年犬、肥胖犬、短头犬（法斗、巴哥、英斗）
- 中等活跃：大多数家庭伴侣犬
- 高活跃：猎犬、工作犬（金毛、拉布拉多、德牧）
- 极高活跃：工作犬/运动犬（哈士奇、边牧、杜宾）

每日鲜食总量公式：
- 幼犬(<1岁): 体重(kg) × 35-40g
- 成年犬(1-7岁): 根据活跃度：低×20g, 中×25g, 高×30g, 极高×35g
- 老年犬(≥8岁): 体重(kg) × 20g（适当减少）

重要提示：
- 所有食谱配比百分比总和必须等于100
- 不可使用对犬有毒的食材（葡萄、洋葱、大蒜、巧克力等）
- 回复必须是合法的JSON格式`;

const LANG_NAMES = { en:'English', de:'German', fr:'French', es:'Spanish', it:'Italian', ja:'Japanese', ko:'Korean', zh:'Chinese' };

/**
 * 分析犬种营养需求（AI健康食谱页面用）
 */
async function analyzeBreedNutrition(breedName, age, weight, customBreedName, lang) {
  const langInstruction = lang && lang !== 'zh' 
    ? `\n\nIMPORTANT: ALL text fields in the response (breed_intro, activity_desc, key_nutrition_needs, nutrition_analysis, cautions, recommended_categories) MUST be written in ${LANG_NAMES[lang] || 'English'}. Only life_stage should remain as 幼犬|成年犬|老年犬.`
    : '';

  const prompt = `请分析以下犬只的营养需求，以JSON格式返回：

犬种: ${customBreedName || breedName}
年龄: ${age}岁
体重: ${weight}kg

请返回如下JSON结构（严格JSON，无其他文字）：
{
  "breed_intro": "这个犬种的简短介绍（50字以内）",
  "life_stage": "幼犬|成年犬|老年犬",
  "activity_level": "low|medium|high|very_high",
  "activity_desc": "活跃度描述",
  "daily_grams": 每日总食量数字,
  "meals_per_day": 每日喂食次数,
  "per_meal_grams": 每餐食量数字,
  "key_nutrition_needs": ["营养需求1", "营养需求2", "营养需求3"],
  "nutrition_analysis": "详细营养需求分析（100字以内，专业且通俗）",
  "recommended_proteins": ["推荐蛋白质1", "推荐蛋白质2"],
  "cautions": ["注意事项1", "注意事项2"],
  "recommended_categories": ["推荐的食谱分类1", "推荐的食谱分类2"]
}${langInstruction}`;

  try {
    const text = await callDeepSeekAPI(NUTRITION_EXPERT_PROMPT, prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error('No JSON found in response');
  } catch (err) {
    console.error('DeepSeek analyzeBreedNutrition error:', err.message);
    return null;
  }
}

/**
 * 生成AI个性化食谱
 */
async function generateAIRecipe(breedName, age, weight, goals, existingRecipeNames) {
  const goalsText = goals.length > 0 ? goals.join('、') : '均衡营养';
  const existingNames = existingRecipeNames.slice(0, 10).join('、');
  
  const prompt = `请为以下犬只创建一个全新的个性化鲜食食谱（不能和已有食谱重复）。

犬种: ${breedName}
年龄: ${age}岁  
体重: ${weight}kg
功能需求: ${goalsText}
已有食谱（请避免重复）: ${existingNames}

可用食材（必须从此列表选择）：
蛋白质: 鸡胸肉、鸡肉、鸡肝、鸡心、火鸡、火鸡肉、牛肉、牛肝、三文鱼、白鱼、鸭肉、羊肉、鹿肉、鸡蛋
碳水: 红薯、南瓜、燕麦、糙米、米饭、土豆、藜麦、山药
蔬菜: 胡萝卜、西兰花、菠菜、青豆、西葫芦、苹果、蓝莓
添加剂: 鱼油、亚麻籽油、橄榄油、钙粉、蛋壳粉、葡萄糖胺、姜黄

请返回如下JSON（严格JSON，无其他文字）：
{
  "name": "食谱名称（6字以内，有特点）",
  "category": "${goalsText}",
  "tags": ["标签1", "标签2"],
  "description": "食谱功效简介（30字以内）",
  "ingredients": {
    "食材名": 百分比数字,
    ...
  },
  "nutrition_highlights": "核心营养亮点（50字以内）",
  "suitable_for": "适合的犬只描述"
}
注意：ingredients所有百分比必须加总等于100`;

  try {
    const text = await callDeepSeekAPI(NUTRITION_EXPERT_PROMPT, prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const recipe = JSON.parse(jsonMatch[0]);
      const total = Object.values(recipe.ingredients).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
      if (Math.abs(total - 100) > 5) throw new Error(`Ingredient total ${total} != 100`);
      
      const ingredientNames = Object.keys(recipe.ingredients);
      const safetyResult = validateIngredientSafety(ingredientNames);
      
      if (hasToxicIngredients(safetyResult)) {
        const warnings = generateSafetyWarnings(safetyResult);
        console.error('🚫 DeepSeek generated recipe with TOXIC ingredients:', safetyResult.toxic);
        return {
          error: true,
          blocked: true,
          toxic_ingredients: safetyResult.toxic,
          message: '危险食材检测',
          safety_warnings: warnings,
        };
      }
      
      if (safetyResult.caution && safetyResult.caution.length > 0) {
        recipe.safety_warnings = generateSafetyWarnings(safetyResult);
      }
      
      return recipe;
    }
    throw new Error('No JSON found');
  } catch (err) {
    console.error('DeepSeek generateAIRecipe error:', err.message);
    return null;
  }
}

/**
 * 比较新老配方选择并给出警告和说明
 */
async function compareRecipeSelection(dogProfile, currentSelection, proposedSelection) {
  const prompt = `请分析以下犬只的鲜食配方变更，评估其潜在的营养风险和变化，以JSON格式返回：

犬只信息：
- 品种: ${dogProfile.breedName}
- 年龄: ${dogProfile.age}岁
- 体重: ${dogProfile.weight}kg
- 喂养目标/健康状态: ${dogProfile.goals ? dogProfile.goals.join('、') : '无'}

当前配方组成：
- A鲜食基础包: ${currentSelection.a_recipe_name} (食材: ${currentSelection.a_ingredients || '无'})
- B全价营养包: ${currentSelection.b_pack_name}
- C功能支持包: ${currentSelection.c_pack_names ? currentSelection.c_pack_names.join('、') : '无'}

用户计划更换为的新配方：
- A鲜食基础包: ${proposedSelection.a_recipe_name} (食材: ${proposedSelection.a_ingredients || '无'})
- B全价营养包: ${proposedSelection.b_pack_name}
- C功能支持包: ${proposedSelection.c_pack_names ? proposedSelection.c_pack_names.join('、') : '无'}

分析要点：
1. A包变化：如果蛋白质来源改变（例如从鸡肉换到牛肉），分析脂肪、蛋白质及致敏风险。若A包改变，必须计算当前A包和新A包的配方营养得分（范围严格限制在 85% 到 100% 之间）。
2. B包变化（核心警告）：B包根据食谱和犬只匹配。若用户强制切换B包（例如从“大型幼犬稳骨控钙B包”换成“普通幼犬B包”），必须警示“大型犬生长期控制钙磷比极其关键，随意更换可能增加骨骼发育异常的风险”。
3. C包变化：说明增减C包（如关节支持包、肠胃健康包）对犬只的实际功效差异。

请返回如下JSON（严格JSON，无其他文字，不要直接抄写模版里的数字，必须客观评分）：
{
  "has_warning": true/false,
  "warning_level": "none/info/warning",
  "warning_text": "B包/C包变化的警示提示信息",
  "a_comparison": {
    "show_dialog": true/false (只要用户更换了A鲜食基础包且新A包与原A包名称不同，这里必须为true),
    "current_score": [请给出当前A包的契合度评分，必须为85-100之间的整数，根据犬只体质与食谱成分的契合度科学估算],
    "proposed_score": [请给出更换后A包的契合度评分，必须为85-100之间的整数，需要客观且有明显梯度，反映真实营养利弊],
    "comparison_details": "两个A包主要营养特点的详细横向对比分析，例如蛋白质来源、脂肪含量、消化率差异（80字以内）",
    "score_reason": "得分差异的营养学解释（80字以内）"
  }
}`;

  try {
    const text = await callDeepSeekAPI(NUTRITION_EXPERT_PROMPT, prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error('No JSON found');
  } catch (err) {
    console.error('DeepSeek compareRecipeSelection error:', err.message);
    return getLocalComparisonWarning(dogProfile, currentSelection, proposedSelection);
  }
}

function getRecommendedBName(dogProfile) {
  const { age = 3, weight = 15, goals = [] } = dogProfile;
  if (age < 1) {
    return weight >= 25 ? '大型幼犬稳骨控钙营养包B' : '幼犬成长营养包B';
  } else if (age >= 8) {
    return '老年犬轻负担营养包B';
  } else {
    if (goals.includes('美毛') || goals.includes('皮毛')) return '成犬/美毛基础营养包B';
    if (goals.includes('护肝')) return '成犬/护肝基础营养包B';
    if (goals.includes('低敏')) return '低敏单一蛋白营养包B';
    return '成犬维护营养包B';
  }
}

function calculateAScore(dogProfile, recipeName) {
  const { age = 3, weight = 15, goals = [] } = dogProfile;
  let score = 93; // 默认基准推荐得分
  
  const isBeef = recipeName.includes('牛肉') || recipeName.includes('补能');
  const isChicken = recipeName.includes('鸡肉');
  const isFish = recipeName.includes('金枪鱼') || recipeName.includes('三文鱼') || recipeName.includes('亮毛');
  const isRabbit = recipeName.includes('兔肉') || recipeName.includes('消化') || recipeName.includes('温和');
  const isLowFat = recipeName.includes('低脂') || recipeName.includes('轻盈') || recipeName.includes('高纤');

  // 1. 年龄段修正
  if (age < 1) {
    if (isBeef) score += 4;
    if (isLowFat) score -= 5;
  } else if (age >= 8) {
    if (isLowFat || isRabbit) score += 4;
    if (isBeef) score -= 6;
  }
  
  // 2. 健康目标修正
  if (goals.some(g => g.includes('低脂') || g.includes('减肥') || g.includes('体重') || g.includes('肥胖'))) {
    if (isLowFat) score += 3;
    else if (isBeef) score -= 8;
    else if (isChicken) score += 0;
    else if (isFish) score -= 2;
  }
  if (goals.some(g => g.includes('关节') || g.includes('骨骼'))) {
    if (isFish) score += 2;
    if (isBeef && age >= 8) score -= 2;
  }
  if (goals.some(g => g.includes('消化') || g.includes('肠胃') || g.includes('胃肠') || g.includes('排便') || g.includes('软便'))) {
    if (isRabbit) score += 4;
    if (isBeef) score -= 4;
  }
  if (goals.some(g => g.includes('皮毛') || g.includes('皮肤') || g.includes('美毛') || g.includes('亮毛'))) {
    if (isFish) score += 4;
  }

  // 3. 产生微小偏移量，增强趣味性与真实性，避免比分重合
  let hash = 0;
  for (let i = 0; i < recipeName.length; i++) {
    hash += recipeName.charCodeAt(i);
  }
  const variance = (hash % 3) - 1; // -1, 0, or 1
  score += variance;

  return Math.max(85, Math.min(100, score));
}

function getADetailsAndReason(dogProfile, currentName, proposedName, currentScore, proposedScore) {
  let details = '';
  let reason = '';
  
  if (proposedName.includes('牛肉') || proposedName.includes('补能')) {
    details = `当前推荐配方选用低脂禽肉/鱼类，蛋白质高且脂肪仅约6%；计划更换配方为红肉牛肉，粗脂肪升至14%，属于高热量能量食谱。`;
    if (dogProfile.age >= 8 || (dogProfile.goals && dogProfile.goals.some(g => g.includes('低脂') || g.includes('减肥')))) {
      reason = `鉴于爱犬年龄偏大或有低脂调理诉求，高脂牛肉可能会加重肠胃和胰腺负荷，故推荐配方打分（${currentScore}%）优于更换配方（${proposedScore}%）。`;
    } else {
      reason = `更换配方可带来更强劲的能量补充，但在平衡性调和上当前推荐配方（${currentScore}%）适配打分更高。`;
    }
  } else if (proposedName.includes('低脂') || proposedName.includes('关节') || proposedName.includes('轻盈')) {
    details = `两款均属低脂配方。推荐配方均衡易消化；更换配方为针对性低脂，并补充了南瓜和冬瓜以提升纤维含量。`;
    reason = `结合爱犬对低脂及关节护理的特定需求，更换配方（${proposedScore}%）匹配度极高，可提供优异的体重管理与骨关节润滑。`;
  } else if (proposedName.includes('温和') || proposedName.includes('消化') || proposedName.includes('兔肉')) {
    details = `当前推荐配方维稳效果优良；计划更换为温和兔脊肉，属单一优质蛋白，粗脂肪极低，更契合高敏感度消化系统。`;
    reason = `兔肉具有高消化、低过敏的特征，非常适合肠胃娇嫩或易软便的犬只，打分达 ${proposedScore}%，两款对比各有特色。`;
  } else if (proposedName.includes('心') || proposedName.includes('金枪鱼') || proposedName.includes('亮毛') || proposedName.includes('三文鱼')) {
    details = `推荐配方蛋白质吸收温和；更换配方主打金枪鱼白肉，富含Omega-3（DHA/EPA）及抗氧化蓝莓，对心血管更佳。`;
    reason = `海鱼与浆果的天然抗氧配比可强化心脑血管活性及皮毛屏障，针对心肺与毛发养护打分为 ${proposedScore}%，极为理想。`;
  } else {
    details = `两款配方在主要蛋白质来源（肉源）及纤维添加上有所不同，主要粗蛋白、粗脂肪比例分别在24%-28%和6%-10%区间。`;
    reason = `两款均符合 AAFCO 全价平衡标准，当前推荐得分（${currentScore}%）略高。更换配方（${proposedScore}%）也可作为日常换粮换口味的选择。`;
  }
  
  return { details, reason };
}

// 本地降级对比逻辑
function getLocalComparisonWarning(dogProfile, current, proposed) {
  let warningText = '';
  let level = 'none';
  let hasWarning = false;

  // 1. A包切换检查
  let a_comparison = null;
  if (current.a_recipe_name !== proposed.a_recipe_name) {
    const isFatLoss = dogProfile.goals && (dogProfile.goals.includes('低脂') || dogProfile.goals.includes('减肥'));
    if (isFatLoss && proposed.a_recipe_name.includes('牛肉') && !current.a_recipe_name.includes('牛肉')) {
      warningText += '⚠️ 您选择的新配方包含牛肉，牛肉的脂肪含量比鸡肉/火鸡更高。由于您的爱犬有低脂或减肥目标，建议尽量保持低脂的鸡肉或兔肉配方。';
      level = 'info';
      hasWarning = true;
    }

    const currentScore = calculateAScore(dogProfile, current.a_recipe_name);
    let proposedScore = calculateAScore(dogProfile, proposed.a_recipe_name);
    if (current.a_recipe_name === proposed.a_recipe_name) {
      proposedScore = currentScore;
    }
    const { details, reason } = getADetailsAndReason(dogProfile, current.a_recipe_name, proposed.a_recipe_name, currentScore, proposedScore);
    a_comparison = {
      show_dialog: true,
      current_score: currentScore,
      proposed_score: proposedScore,
      comparison_details: details,
      score_reason: reason
    };
  }

  // 2. B包切换核心警告
  const recB = getRecommendedBName(dogProfile);
  if (proposed.b_pack_name !== recB) {
    if (recB.includes('大型幼犬') || recB.includes('控钙')) {
      warningText += '🚫 警告：大型犬的幼犬生长发育与普通幼犬有显著差异，需要精准控钙磷的比例以防止发育性骨关节病。不建议将其更换为普通全价营养包！';
      level = 'warning';
      hasWarning = true;
    } else {
      warningText += `⚠️ 提示：您将推荐的 ${recB} 替换为了 ${proposed.b_pack_name}，全价营养包是针对特定生命阶段/功能匹配设计的，随意替换可能会打破微量营养平衡。`;
      level = 'info';
      hasWarning = true;
    }
  }

  // 3. C包切换
  if (current.c_pack_names && proposed.c_pack_names) {
    const addedC = proposed.c_pack_names.filter(x => !current.c_pack_names.includes(x));
    const removedC = current.c_pack_names.filter(x => !proposed.c_pack_names.includes(x));
    if (removedC.length > 0) {
      warningText += ` 提示：移除了 ${removedC.join('、')}，对应的特定功能强化（如关节或肠胃支持）将会减弱。`;
      level = level === 'none' ? 'info' : level;
      hasWarning = true;
    }
  }

  if (!warningText) {
    warningText = '配置已更新，配方成分平衡满足需求。';
  }

  return {
    has_warning: hasWarning,
    warning_level: level,
    warning_text: warningText.trim(),
    a_comparison: a_comparison
  };
}

module.exports = { analyzeBreedNutrition, generateAIRecipe, compareRecipeSelection };
