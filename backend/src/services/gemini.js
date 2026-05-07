// gemini.js — Google Gemini AI 客户端封装
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 宠物营养学专家 System Prompt
const NUTRITION_EXPERT_PROMPT = `你是 Heybo Lux 的首席宠物营养学专家，拥有兽医营养学博士学位，
专注于犬类鲜食营养配方研究20年。你深谙各犬种的体质特点和营养需求。

你的核心职责：
1. 根据犬种/年龄/体重提供科学的营养分析
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
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const langInstruction = lang && lang !== 'zh' 
    ? `\n\nIMPORTANT: ALL text fields in the response (breed_intro, activity_desc, key_nutrition_needs, nutrition_analysis, cautions, recommended_categories) MUST be written in ${LANG_NAMES[lang] || 'English'}. Only life_stage should remain as 幼犬|成年犬|老年犬.`
    : '';

  const prompt = `${NUTRITION_EXPERT_PROMPT}

请分析以下犬只的营养需求，以JSON格式返回：

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
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    // 提取JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    throw new Error('No JSON found in response');
  } catch (err) {
    console.error('Gemini analyzeBreedNutrition error:', err.message);
    // 降级到规则引擎结果
    return null;
  }
}

/**
 * 生成AI个性化食谱
 */
async function generateAIRecipe(breedName, age, weight, goals, existingRecipeNames) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const goalsText = goals.length > 0 ? goals.join('、') : '均衡营养';
  const existingNames = existingRecipeNames.slice(0, 10).join('、');
  
  const prompt = `${NUTRITION_EXPERT_PROMPT}

请为以下犬只创建一个全新的个性化鲜食食谱（不能和已有食谱重复）。

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
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const recipe = JSON.parse(jsonMatch[0]);
      // 验证百分比总和
      const total = Object.values(recipe.ingredients).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
      if (Math.abs(total - 100) > 5) throw new Error(`Ingredient total ${total} != 100`);
      return recipe;
    }
    throw new Error('No JSON found');
  } catch (err) {
    console.error('Gemini generateAIRecipe error:', err.message);
    return null;
  }
}

module.exports = { analyzeBreedNutrition, generateAIRecipe };
