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

module.exports = { evaluatePetBCS };
