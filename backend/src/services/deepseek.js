const axios = require('axios');

function protectPuppyTargetWeight(data, ageMonths, weight) {
  const currentWeight = Number(weight);
  const suggestedWeight = Number(data.standard_weight);
  const hasSuggestedWeight = data.standard_weight !== null && data.standard_weight !== '';
  if (Number(ageMonths) > 0 && Number(ageMonths) < 12 && hasSuggestedWeight && Number.isFinite(currentWeight) && Number.isFinite(suggestedWeight) && suggestedWeight < currentWeight) {
    return { ...data, standard_weight: null, target_weight_requires_review: true, target_weight_conflict: '幼犬参考体重低于当前体重，不能据此设置减重目标；请结合BCS与生长曲线复核。' };
  }
  return data;
}

async function evaluatePetBCS({ breedName, ageMonths, weight }) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  // Create prompt
  const systemPrompt = `你是一个非常资深且专业的宠物执业兽医师与宠物营养学专家。请基于犬只（或猫咪）的品种、年龄（月龄或天数）以及当前的实际体重，推算出该宠物在此成长阶段对应的“标准体重范围下限 (standard_weight_range_min)”与“标准体重范围上限 (standard_weight_range_max)”。如果是未成年的幼犬，请根据其品种的成年平均重和该月龄的幼犬生长发育曲线进行科学测算；如果是成犬，则给出该品种的理想均重范围。

请计算这两个上下限的平均值作为“标准参考体重 (standard_weight)”。幼犬仍处于生长阶段，标准参考体重不能直接等同于减重目标；如果估算值低于幼犬当前实际体重，standard_weight 必须返回 null，并将 target_weight_requires_review 返回 true，交由兽医结合 BCS 和生长曲线复核。

然后，计算体况评分（Body Condition Score, BCS 1-9分制），并给出一个适合该评分的状态评估词（如：极度消瘦、偏瘦、稍瘦、偏苗条、理想体态、偏丰满、超重、肥胖、极度肥胖）和详细、温暖但又科学的诊断分析以及喂养改进建议。

必须以 JSON 格式输出，且不要包含任何 markdown 块或其它无关字符。返回以下字段，体重字段单位均为 kg 且使用数字类型；无法可靠估算时使用 null，不要套用示例数字：
{
  "standard_weight_range_min": null,
  "standard_weight_range_max": null,
  "standard_weight": null,
  "target_weight_requires_review": false,
  "bcs_score": null,
  "bcs_label": "",
  "bcs_description": ""
}`;

  const userPrompt = `宠物信息：
- 品种：${breedName}
- 年龄/月龄：约 ${ageMonths} 个月
- 当前实际体重：${weight} kg

请根据上述信息，给出标准体重估算（单位 kg，数字类型）和 BCS 1-9 分数，并返回 JSON 结构。`;

  try {
    const response = await axios.post(`${baseUrl}/chat/completions`, {
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 12000
    });

    const choice = response.data.choices[0];
    const content = choice.message.content.trim();
    // Strip markdown formatting if any
    let cleanContent = content;
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.slice(7);
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.slice(0, -3);
    }
    return protectPuppyTargetWeight(JSON.parse(cleanContent.trim()), ageMonths, weight);
  } catch (error) {
    console.error('DeepSeek BCS evaluation error:', error.message);
    throw new Error(error.message);
  }
}

async function analyzeFreshMatch({ pet, ingredients, safety_check, nutrition_gap }) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  const systemPrompt = `你是 Heybo AI 宠物营养助手。请根据犬类宠物档案和用户输入的家中现有食材，生成安全、保守、结构化的鲜食配方建议。你必须遵守：
1. 绝不使用犬类禁食食材。
2. 绝不使用宠物档案中过敏食材。
3. 每个配方优先使用单一动物蛋白。
4. 不要求用完用户输入的所有食材。
5. 蔬果和碳水可以选择多种组合：蔬菜选2-3个，优先南瓜、胡萝卜、西葫芦、西兰花；粗纤维和叶子菜比例可以略高。
6. 水果最多选1个，优先蓝莓、苹果、香蕉，水果总量必须低于5%。
7. 碳水最多选2个，优先红薯、藜麦、土豆、燕麦、糙米；尽量不要使用小米和玉米，除非没有其它安全碳水。
8. 如缺少碳水，请明确提示这是临时低碳餐，不建议长期作为主食。
9. 只有主蛋白是鱼肉、三文鱼、金枪鱼、鳕鱼等富含Omega-3的鱼类时，配方名称才可以使用“亮毛”；鸡肉、牛肉、兔肉等非鱼类蛋白不要命名为亮毛餐。
10. 配方最大总克重不得超过 1000g。
11. 返回结果必须是 JSON，不要返回 Markdown。
12. 不要给出医疗诊断，不要替代兽医建议。`;

  const userPrompt = JSON.stringify({
    pet: {
      id: pet.id,
      name: pet.name,
      breed: pet.breed,
      age_months: pet.age_months,
      weight_kg: pet.current_weight_kg,
      allergens: pet.allergens || [],
      health_conditions: pet.health_tags || [],
      special_status: pet.special_period || pet.life_stage || null,
    },
    ingredients,
    safety_check,
    nutrition_gap,
    required_shape: {
      recipes: [{
        id: 'recipe_1',
        name: '轻盈鸡肉餐',
        total_weight_g: 420,
        reason: '1-2句适合原因',
        ingredients: [{ name: '鸡肉', weight_g: 260, ratio: '61.9%', category: 'protein' }],
        nutrition_note: '简要营养说明',
      }],
    },
  });

  const response = await axios.post(`${baseUrl}/chat/completions`, {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  }, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 18000,
  });

  const content = response.data.choices?.[0]?.message?.content || '{}';
  return JSON.parse(String(content).replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
}

async function classifyFreshMatchIngredients({ ingredients }) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  const systemPrompt = `你是 Heybo AI 宠物鲜食安全审核助手。你的任务不是生成食谱，而是对用户输入的“家中现有食材”进行第一轮安全清洗和分类。

请严格判断每一个用户输入项是否属于“犬类可食用食材”。

处理规则：
1. 如果输入项不是食物、不是可食用原料、不是宠物鲜食可使用的天然食材，必须标记为 inedible，并从后续食材中剔除。
   例如：水杯、手机、钥匙、木头、水泥、塑料、玻璃、金属、推土机、清洁剂、药品、玩具、纸巾、衣服等。
2. 如果输入项是人类食物但明显不适合犬类食用，标记为 unsafe。
   例如：巧克力、葡萄、葡萄干、洋葱、大蒜、酒精、咖啡、茶、木糖醇、发酵面团、夏威夷果、牛油果等。
3. 如果输入项是犬类可食用食材，请按实际营养类别重新归类，不要受用户填写在哪个输入框影响：
   - protein：肉类、内脏、蛋类、鱼虾等动物蛋白
   - vegetable_fruit：蔬菜、水果、可作为少量果蔬补充的食材
   - carb：米饭、红薯、土豆、南瓜、燕麦、藜麦、糙米等主食/碳水来源
4. 苹果果肉是可食用水果，不要把“苹果”判为禁食；只有“苹果籽/苹果核”需要标记为 unsafe。
5. 如果无法确认某个输入项是否为食材，保守标记为 inedible，不要放入可用食材。
6. 不要生成配方，不要给烹饪建议，只返回 JSON。
7. 返回 JSON 必须保留用户原始输入名称，方便前端提示用户哪些被剔除。

返回格式必须严格如下：
{
  "usable": {
    "proteins": [],
    "vegetables_fruits": [],
    "carbs": []
  },
  "removed": [
    {
      "name": "水杯",
      "reason": "不是犬类可食用食材",
      "type": "inedible"
    }
  ],
  "notes": "一句话总结本次清洗结果"
}`;

  const response = await axios.post(`${baseUrl}/chat/completions`, {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify({ ingredients }) },
    ],
    temperature: 0,
    response_format: { type: 'json_object' },
  }, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: 12000,
  });

  const content = response.data.choices?.[0]?.message?.content || '{}';
  return JSON.parse(String(content).replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
}

async function freshCheckCompletion(system, user) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY is not configured');
  const response = await axios.post(`${process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'}/chat/completions`, {
    model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash', messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0, response_format: { type: 'json_object' },
  }, { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 18000 });
  return JSON.parse(String(response.data.choices?.[0]?.message?.content || '{}').replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
}

async function translatePresentationFields({ locale, items }) {
  const languageNames = { en: 'English', de: 'German', fr: 'French', es: 'Spanish', it: 'Italian', ja: 'Japanese', ko: 'Korean' };
  const targetLanguage = languageNames[locale];
  if (!targetLanguage || !Array.isArray(items) || !items.length) return { items: [] };
  const allowed = items.filter(item => item?.risk_code === 'AI_PRESENTATION_TEXT' && /^(ai_summary|ai_macro_reasoning|ai_macro_adjustment:\d+)$/.test(item.item_id));
  if (allowed.length !== items.length) throw new Error('Only whitelisted AI presentation fields may be translated');
  return freshCheckCompletion(
    `You localize non-critical Pet Chef AI presentation text into ${targetLanguage}. Only item_id values ai_summary, ai_macro_reasoning, and ai_macro_adjustment:<index> are allowed. Translate only the reason field. Keep item_id, risk_code, title, adjustment, placeholders, numbers, units, codes, and enum values byte-for-byte unchanged. Never add diagnoses, ingredients, numbers, warnings, recommendations, or safety conclusions. Return JSON only: {"items":[{"item_id":"...","risk_code":"AI_PRESENTATION_TEXT","title":"...","reason":"...","adjustment":"..."}]}.`,
    JSON.stringify({ items: allowed })
  );
}

async function recognizeFreshCheckRecipe({ text }) {
  const content = `识别以下宠物鲜食食谱的食材和克重，仅返回 JSON：{"ingredients":[{"name":"鸡胸肉","grams":200}]}。文本：${text || ''}`;
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY is not configured');
  const response = await axios.post(`${process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'}/chat/completions`, {
    model: process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
    messages: [{ role: 'system', content: '你是宠物鲜食食谱识别助手。只识别文本中明确出现的食材与克重；不确定时不要猜测。只返回 JSON。' }, { role: 'user', content }],
    temperature: 0, response_format: { type: 'json_object' },
  }, { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 18000 });
  return JSON.parse(String(response.data.choices?.[0]?.message?.content || '{}').replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
}

async function analyzeFreshCheck({ pet, report }) {
  return freshCheckCompletion(
    `你是 HeyboPet Agent 的犬用鲜食营养复核助手。只能基于报告中已计算的食材重量比例、估算蛋白质/脂肪/碳水克数、每1000kcal指标及FEDIAF阶段阈值进行复核。
本地确定性规则是最终评分依据，你不能修改评分、删除风险或声称营养包能修复宏量结构。数据覆盖不足时必须标记 uncertain，不作医疗诊断。
summary 只写一条具体可执行的食材调整建议，不要重复页面已有的克数、比例、每1000kcal数值或“达到/低于标准”等结论。
只返回 JSON：{"summary":"一句具体调整建议","macro_assessment":{"protein_status":"adequate|low|uncertain","fat_status":"adequate|low|uncertain","carb_structure_status":"reasonable|high|uncertain","reasoning":"后台复核依据","adjustments":["建议"]}}。`,
    JSON.stringify({ pet: { name: pet.name, health_tags: pet.health_tags || [], allergens: pet.allergens || [] }, report })
  );
}

async function lookupFreshCheckIngredientFacts({ ingredients, retry = false }) {
  return freshCheckCompletion(
    `你是犬类鲜食安全与食物成分核验助手。对每个输入项独立判断，并只返回 JSON。
${retry ? '这是第一次未返回有效营养值后的唯一一次复核。请优先核对常见别名、具体部位与常见生熟状态；仍无法可靠确认时必须继续返回 null，禁止猜测。' : ''}
规则：
1. 输入可能使用任意语言。必须按每项的 input_id 独立核验并原样返回 input_id；name 仅用于理解食材，不得用翻译后的名称替代 input_id。
2. is_food 表示它是否为真实可食用原料；石头、铁钉、塑料、玻璃、清洁剂等必须为 false。
3. dog_safety 只能是 safe、unsafe、uncertain；犬类禁食或非食物必须为 unsafe。
4. 对可食用原料给出常见可食部、生/熟状态下合理的 kcal_per_100g、protein_pct、fat_pct、carb_pct；无法可靠估计的字段返回 null，禁止编造精确值。
5. confidence 只能是 high、medium、low，并用 basis 简述估算依据和默认生熟状态。
6. category 只能是 protein、organ、carb、vegetable、fruit、fat、addition、unknown。水果归为 fruit，非淀粉蔬菜归为 vegetable。
7. JSON 格式：{"ingredients":[{"input_id":"ingredient_1","name":"鸡头","is_food":true,"dog_safety":"safe","category":"protein","kcal_per_100g":180,"protein_pct":16,"fat_pct":12,"carb_pct":0,"confidence":"medium","basis":"按生鲜鸡头可食部估算"}]}`,
    JSON.stringify({ ingredients })
  );
}

module.exports = { evaluatePetBCS, analyzeFreshMatch, classifyFreshMatchIngredients, recognizeFreshCheckRecipe, analyzeFreshCheck, lookupFreshCheckIngredientFacts, translatePresentationFields, _test: { protectPuppyTargetWeight } };
