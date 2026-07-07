const axios = require('axios');

async function evaluatePetBCS({ breedName, ageMonths, weight }) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  // Create prompt
  const systemPrompt = `你是一个非常资深且专业的宠物执业兽医师与宠物营养学专家。请基于犬只（或猫咪）的品种、年龄（月龄或天数）以及当前的实际体重，推算出该宠物在此成长阶段对应的“标准体重范围下限 (standard_weight_range_min)”与“标准体重范围上限 (standard_weight_range_max)”。如果是未成年的幼犬，请根据其品种的成年平均重和该月龄的幼犬生长发育曲线进行科学测算；如果是成犬，则给出该品种的理想均重范围。

请计算这两个上下限的平均值作为“标准参考体重 (standard_weight)”，并将此平均值作为首选推荐目标体重。

然后，计算体况评分（Body Condition Score, BCS 1-9分制），并给出一个适合该评分的状态评估词（如：极度消瘦、偏瘦、稍瘦、偏苗条、理想体态、偏丰满、超重、肥胖、极度肥胖）和详细、温暖但又科学的诊断分析以及喂养改进建议。

必须以 JSON 格式输出，且不要包含任何 markdown 块或其它无关字符，格式如下：
{
  "standard_weight_range_min": 2.5,
  "standard_weight_range_max": 4.0,
  "standard_weight": 3.25,
  "bcs_score": 5,
  "bcs_label": "理想体态",
  "bcs_description": "当前体况非常健康！对于55天的史宾格幼犬，其标准体重应在2.5-4.0公斤左右，现在的4.0公斤处于合理范围的上限。请继续保持规律的幼犬高消化率蛋白质喂食。"
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
    const data = JSON.parse(cleanContent.trim());
    return data;
  } catch (error) {
    console.error('DeepSeek BCS evaluation error:', error.message);
    throw new Error(error.message);
  }
}

async function analyzeFreshMatch({ pet, ingredients, safety_check, nutrition_gap }) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

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
9. 配方最大总克重不得超过 1000g。
10. 返回结果必须是 JSON，不要返回 Markdown。
11. 不要给出医疗诊断，不要替代兽医建议。`;

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

module.exports = { evaluatePetBCS, analyzeFreshMatch };
