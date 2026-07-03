// src/api/index.js — 前端 API 客户端层
// Web 本地开发可使用 Vite 代理；移动端生产构建通过 VITE_API_URL 连接线上后端。
import { dogBreeds } from '../data/breeds';
import { demoRecipes } from '../data/demoRecipes';

const BASE = import.meta.env.VITE_API_URL || '';

const fallbackBreeds = dogBreeds.map(b => ({
  ...b,
  weight_avg: b.weight_avg || b.weight || 15,
  breed_desc: b.breed_desc || `${b.name}适合根据体重、年龄和活动量定制鲜食。`,
  activity: b.activity || 'medium',
  intake_factor: b.intake_factor || { low: 20, medium: 25, high: 30 },
}));

function calcDailyIntake(breedInfo, weight = 15, age = 3) {
  const activity = breedInfo?.activity || 'medium';
  const intakeFactor = breedInfo?.intake_factor || { low: 20, medium: 25, high: 30 };
  let ageMultiplier = 1.0;
  let meals = 2;

  if (age < 0.5) {
    ageMultiplier = 1.8;
    meals = 4;
  } else if (age < 1) {
    ageMultiplier = 1.5;
    meals = 3;
  } else if (age >= 8) {
    ageMultiplier = 0.85;
  }

  const baseFactor = intakeFactor[activity] || intakeFactor.medium || 25;
  const daily = Math.round(weight * baseFactor * ageMultiplier);

  return {
    daily_grams: daily,
    meals_per_day: meals,
    per_meal_grams: Math.round(daily / meals),
    activity_level: activity,
    intake_factor_used: baseFactor,
    age_multiplier: ageMultiplier,
  };
}

function calcCookingParams(recipe, totalGrams) {
  const base = recipe.cooking_base || { temperature: 85, power: 8, speed: '1', water_ratio: 0.15, mode: 'diy' };
  const waterContent = (recipe.water_content_pct || 70) / 100;
  const waterGrams = Math.round(totalGrams * (base.water_ratio || 0.15));
  const waterDelta = waterContent - 0.60;
  const preheatPer100g = Math.max(10, 22.5 - waterDelta * 60);
  const cookPer100g = Math.max(120, 270 - waterDelta * 120);
  const preheatSeconds = Math.round(preheatPer100g * Math.pow(totalGrams / 100, 0.9));
  const cookSeconds = Math.round(cookPer100g * Math.pow(totalGrams / 100, 0.75));

  return {
    totalGrams,
    waterGrams,
    mode: base.mode,
    temperature: base.temperature,
    power: base.power,
    speed: base.speed,
    preheat_seconds: preheatSeconds,
    cook_seconds: cookSeconds,
    total_seconds: preheatSeconds + cookSeconds,
    water_content_pct: recipe.water_content_pct || 70,
  };
}

function ingredientGrams(ingredients, totalGrams) {
  const totalPct = Object.values(ingredients || {}).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
  return Object.entries(ingredients || {}).map(([name, pct]) => ({
    name,
    pct: typeof pct === 'number' && totalPct > 0 ? Math.round((pct / totalPct) * 100) : null,
    grams: typeof pct === 'number' && totalPct > 0 ? Math.round((pct / totalPct) * totalGrams) : null,
  }));
}

function filterRecipes(params = {}) {
  let result = demoRecipes;

  // custom_category 分类过滤（与后端一致）
  if (params.custom_category) {
    const cc = params.custom_category;
    const ccFilter = (r) => {
      switch (cc) {
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
    result = result.filter(ccFilter);
    return result.length ? result : [];
  }

  if (params.life_stage) result = result.filter(r => r.life_stage === params.life_stage);
  if (params.dog_size) result = result.filter(r => !r.dog_size || r.dog_size === params.dog_size);
  if (params.functional) result = result.filter(r => r.category_type === 'functional');
  if (params.protein) result = result.filter(r => Object.keys(r.ingredients).some(name => name.includes(params.protein)));
  if (params.protein_other) {
    const otherMeats = ['鸭', '羊', '鹿', '火鸡'];
    result = result.filter(r => otherMeats.some(m => Object.keys(r.ingredients).some(name => name.includes(m))));
  }
  return result.length ? result : demoRecipes;
}

function fallbackAIAnalysis(body = {}) {
  const { breedId, breedName, age = 3, weight = 15 } = body;
  const breed = fallbackBreeds.find(b => b.id === breedId);
  const intake = calcDailyIntake(breed, weight, age);
  let lifeStage = '成年犬';
  let needs = ['均衡蛋白质', '优质脂肪', '丰富蔬菜纤维'];

  if (age < 1) {
    lifeStage = '幼犬';
    needs = ['高蛋白促进生长', 'DHA脑部发育', '适量钙质骨骼健康'];
  } else if (age >= 8) {
    lifeStage = '老年犬';
    needs = ['易消化低脂', '关节保护', '抗氧化护心'];
  }

  return {
    success: true,
    analysis: {
      breed_intro: breed?.breed_desc || `${breedName || '您的爱犬'}适合根据体重、年龄和活动量定制鲜食。`,
      life_stage: lifeStage,
      activity_level: breed?.activity || 'medium',
      key_nutrition_needs: needs,
      nutrition_analysis: `根据您的${breedName || breed?.name || '爱犬'}${age}岁、${weight}kg的信息，每日所需鲜食量约为${intake.daily_grams}克，建议每日分${intake.meals_per_day}次喂食，每次约${intake.per_meal_grams}克。`,
      ...intake,
    },
  };
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
  } else if (proposedName.includes('心') || proposedName.includes('金枪鱼') || proposedName.includes('亮毛')) {
    details = `推荐配方蛋白质吸收温和；更换配方主打金枪鱼白肉，富含Omega-3（DHA/EPA）及抗氧化蓝莓，对心血管更佳。`;
    reason = `海鱼与浆果的天然抗氧配比可强化心脑血管活性及皮毛屏障，针对心肺与毛发养护打分为 ${proposedScore}%，极为理想。`;
  } else {
    details = `两款配方在主要蛋白质来源（肉源）及纤维添加上有所不同，主要粗蛋白、粗脂肪比例分别在24%-28%和6%-10%区间。`;
    reason = `两款均符合 AAFCO 全价平衡标准，当前推荐得分（${currentScore}%）略高。更换配方（${proposedScore}%）也可作为日常换粮换口味的选择。`;
  }
  
  return { details, reason };
}

function fallbackCompareSelection(body = {}) {
  const { dogProfile = {}, currentSelection = {}, proposedSelection = {} } = body;
  let warningText = '';
  let level = 'none';
  let hasWarning = false;

  // 1. A包切换检查
  let a_comparison = null;
  if (currentSelection.a_recipe_name !== proposedSelection.a_recipe_name) {
    const isFatLoss = dogProfile.goals && (dogProfile.goals.includes('低脂') || dogProfile.goals.includes('减肥'));
    if (isFatLoss && proposedSelection.a_recipe_name.includes('牛肉') && !currentSelection.a_recipe_name.includes('牛肉')) {
      warningText += '⚠️ 您选择的新配方包含牛肉，牛肉的脂肪含量比鸡肉/火鸡更高。由于您的爱犬有低脂或减肥目标，建议尽量保持低脂的鸡肉或兔肉配方。';
      level = 'info';
      hasWarning = true;
    }

    const currentScore = calculateAScore(dogProfile, currentSelection.a_recipe_name);
    let proposedScore = calculateAScore(dogProfile, proposedSelection.a_recipe_name);
    if (currentSelection.a_recipe_name === proposedSelection.a_recipe_name) {
      proposedScore = currentScore;
    }
    const { details, reason } = getADetailsAndReason(dogProfile, currentSelection.a_recipe_name, proposedSelection.a_recipe_name, currentScore, proposedScore);
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
  if (proposedSelection.b_pack_name !== recB) {
    if (recB.includes('大型幼犬') || recB.includes('控钙')) {
      warningText += '🚫 警告：大型犬的幼犬生长发育与普通幼犬有显著差异，需要精准控钙磷的比例以防止发育性骨关节病。不建议将其更换为普通全价营养包！';
      level = 'warning';
      hasWarning = true;
    } else {
      warningText += `⚠️ 提示：您将推荐的 ${recB} 替换为了 ${proposedSelection.b_pack_name}，全价营养包是针对特定生命阶段/功能匹配设计的，随意替换可能会打破微量营养平衡。`;
      level = 'info';
      hasWarning = true;
    }
  }

  // 3. C包切换
  if (currentSelection.c_pack_names && proposedSelection.c_pack_names) {
    const addedC = proposedSelection.c_pack_names.filter(x => !currentSelection.c_pack_names.includes(x));
    const removedC = currentSelection.c_pack_names.filter(x => !proposedSelection.c_pack_names.includes(x));
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

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  return res.json();
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function authedGet(path, token) {
  const res = await fetch(`${BASE}${path}`, { headers: authHeaders(token) });
  return res.json();
}

async function authedPost(path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function createPayment(body, token, idempotencyKey) {
  const res = await fetch(`${BASE}/api/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
  });
  return res.json();
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
  let score = 93;
  
  const isBeef = recipeName.includes('牛肉') || recipeName.includes('补能');
  const isChicken = recipeName.includes('鸡肉');
  const isFish = recipeName.includes('金枪鱼') || recipeName.includes('三文鱼') || recipeName.includes('亮毛');
  const isRabbit = recipeName.includes('兔肉') || recipeName.includes('消化') || recipeName.includes('温和');
  const isLowFat = recipeName.includes('低脂') || recipeName.includes('轻盈') || recipeName.includes('高纤');

  if (age < 1) {
    if (isBeef) score += 4;
    if (isLowFat) score -= 5;
  } else if (age >= 8) {
    if (isLowFat || isRabbit) score += 4;
    if (isBeef) score -= 6;
  }
  
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

  let hash = 0;
  for (let i = 0; i < recipeName.length; i++) {
    hash += recipeName.charCodeAt(i);
  }
  const variance = (hash % 3) - 1;
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
  } else if (proposedName.includes('心') || proposedName.includes('金枪鱼') || proposedName.includes('亮毛')) {
    details = `推荐配方蛋白质吸收温和；更换配方主打金枪鱼白肉，富含Omega-3（DHA/EPA）及抗氧化蓝莓，对心血管更佳。`;
    reason = `海鱼与浆果的天然抗氧配比可强化心脑血管活性及皮毛屏障，针对心肺与毛发养护打分为 ${proposedScore}%，极为理想。`;
  } else {
    details = `两款配方在主要蛋白质来源（肉源）及纤维添加上有所不同，主要粗蛋白、粗脂肪比例分别在24%-28%和6%-10%区间。`;
    reason = `两款均符合 AAFCO 全价平衡标准，当前推荐得分（${currentScore}%）略高。更换配方（${proposedScore}%）也可作为日常换粮换口味的选择。`;
  }
  
  return { details, reason };
}

function fallbackCompareSelection(body = {}) {
  const { dogProfile = {}, currentSelection = {}, proposedSelection = {} } = body;
  let warningText = '';
  let level = 'none';
  let hasWarning = false;

  let a_comparison = null;
  if (currentSelection.a_recipe_name !== proposedSelection.a_recipe_name) {
    const isFatLoss = dogProfile.goals && (dogProfile.goals.includes('低脂') || dogProfile.goals.includes('减肥'));
    if (isFatLoss && proposedSelection.a_recipe_name.includes('牛肉') && !currentSelection.a_recipe_name.includes('牛肉')) {
      warningText += '⚠️ 您选择的新配方包含牛肉，牛肉的脂肪含量比鸡肉/火鸡更高。由于您的爱犬有低脂或减肥目标，建议尽量保持低脂的鸡肉或兔肉配方。';
      level = 'info';
      hasWarning = true;
    }

    const currentScore = calculateAScore(dogProfile, currentSelection.a_recipe_name);
    let proposedScore = calculateAScore(dogProfile, proposedSelection.a_recipe_name);
    if (currentSelection.a_recipe_name === proposedSelection.a_recipe_name) {
      proposedScore = currentScore;
    }
    const { details, reason } = getADetailsAndReason(dogProfile, currentSelection.a_recipe_name, proposedSelection.a_recipe_name, currentScore, proposedScore);
    a_comparison = {
      show_dialog: true,
      current_score: currentScore,
      proposed_score: proposedScore,
      comparison_details: details,
      score_reason: reason
    };
  }

  const recB = getRecommendedBName(dogProfile);
  if (proposedSelection.b_pack_name !== recB) {
    if (recB.includes('大型幼犬') || recB.includes('控钙')) {
      warningText += '🚫 警告：大型犬的幼犬生长发育与普通幼犬有显著差异，需要精准控钙磷的比例以防止发育性骨关节病。不建议将其更换为普通全价营养包！';
      level = 'warning';
      hasWarning = true;
    } else {
      warningText += `⚠️ 提示：您将推荐的 ${recB} 替换为了 ${proposedSelection.b_pack_name}，全价营养包是针对特定生命阶段/功能匹配设计的，随意替换可能会打破微量营养平衡。`;
      level = 'info';
      hasWarning = true;
    }
  }

  if (currentSelection.c_pack_names && proposedSelection.c_pack_names) {
    const addedC = proposedSelection.c_pack_names.filter(x => !currentSelection.c_pack_names.includes(x));
    const removedC = currentSelection.c_pack_names.filter(x => !proposedSelection.c_pack_names.includes(x));
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

export const api = {
  heyboMockLogin: (body) => post('/api/auth/mock-login', body),
  heyboMe: (token) => authedGet('/api/users/me', token),
  createPet: (body, token) => authedPost('/api/pets', body, token),
  listPets: (token) => authedGet('/api/pets', token),
  registerDevice: (body, token) => authedPost('/api/devices', body, token),
  listDevices: (token) => authedGet('/api/devices', token),
  recordCookingOperation: (body, token) => authedPost('/api/operations/cooking', body, token),
  listCookingOperations: (token) => authedGet('/api/operations/cooking', token),
  createFeedingRecord: (body, token) => authedPost('/api/feeding-records', body, token),
  createHealthRecord: (body, token) => authedPost('/api/health-records', body, token),
  createMedicalRecord: (body, token) => authedPost('/api/medical-records', body, token),
  getProducts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return get(`/api/products${q ? '?' + q : ''}`);
  },
  createOrder: (body, token) => authedPost('/api/orders', body, token),
  getPaymentProviders: () => get('/api/payments/providers'),
  createPayment,
  listPayments: (token) => authedGet('/api/payments', token),
  getPayment: (paymentId, token) => authedGet(`/api/payments/${paymentId}`, token),
  getBreeds: async () => {
    try {
      const data = await get('/api/breeds');
      if (data?.success && Array.isArray(data.breeds) && data.breeds.length) return data;
    } catch {}
    return { success: true, breeds: fallbackBreeds, offline: true };
  },
  getRecipes: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    try {
      const data = await get(`/api/recipes${q ? '?' + q : ''}`);
      if (data?.success && Array.isArray(data.recipes) && data.recipes.length) return data;
    } catch {}
    const recipes = filterRecipes(params);
    return { success: true, recipes, count: recipes.length, offline: true };
  },
  recommend: (body) => post('/api/recommend', body),
  compareSelection: async (body) => {
    try {
      const data = await post('/api/recommend/compare', body);
      if (data?.success) return data;
    } catch {}
    return { success: true, comparison: fallbackCompareSelection(body) };
  },
  aiAnalysis: async (body) => {
    try {
      const data = await post('/api/ai-analysis', body);
      if (data?.success) return data;
    } catch {}
    return fallbackAIAnalysis(body);
  },
  aiRecipe: async (body) => {
    try {
      const data = await post('/api/ai-recipe', body);
      if (data?.success) return data;
    } catch {}
    return { success: true, recipe: demoRecipes[0], offline: true };
  },
  cookParams: async (body) => {
    try {
      const data = await post('/api/cook/params', body);
      if (data?.success) return data;
    } catch {}
    const recipe = demoRecipes.find(r => r.id === body.recipeId) || demoRecipes[0];
    const breed = fallbackBreeds.find(b => b.id === body.breedId);
    const intake = calcDailyIntake(breed, body.weight, body.age);
    const cookGrams = body.totalGrams || intake.per_meal_grams;
    return {
      success: true,
      intake,
      ingredientList: ingredientGrams(recipe.ingredients, cookGrams),
      cookParams: calcCookingParams(recipe, cookGrams),
      offline: true,
    };
  },
  tuyaStart: async (body) => {
    try { return await post('/api/tuya/start', body); } catch { return { success: true, offline: true }; }
  },
  tuyaPause: async () => {
    try { return await post('/api/tuya/pause', {}); } catch { return { success: true, offline: true }; }
  },
  tuyaStop: async () => {
    try { return await post('/api/tuya/stop', {}); } catch { return { success: true, offline: true }; }
  },
  tuyaStatus: async () => {
    try { return await get('/api/tuya/status'); } catch { return { success: true, status: { online: false, mode: 'demo' }, offline: true }; }
  },
};
