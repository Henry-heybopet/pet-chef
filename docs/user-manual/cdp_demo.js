#!/usr/bin/env node

const target = process.argv[2];
if (!target) {
  console.error('Usage: node cdp_demo.js <websocket-url>');
  process.exit(1);
}

const demoPet = {
  id: 'manual-demo-pet',
  name: '茜茜',
  species: 'dog',
  breed: '金毛寻回犬',
  sex: 'female',
  neutered: true,
  birth_date: '2022-05-18',
  age_months: 50,
  current_weight_kg: 24.5,
  target_weight_kg: 23.5,
  body_condition_score: '6',
  activity_level: 'medium',
  life_stage: 'adult',
  allergens: ['鸡肉'],
  health_tags: ['dermatological'],
  feeding_goal: 'coat_care',
  body_size: 'large',
  environment: 'indoor',
  allergy_symptoms: ['皮肤瘙痒'],
  allergy_severity: 'mild',
};

const recipes = [
  {
    id: 'manual-beef',
    name: '牛肉护肤美毛',
    category: '成犬通用',
    custom_category: 'skin',
    description: '适合成犬日常维护的示例鲜食基础包。',
    img: '/牛肉护肤美毛.png',
    ingredients: { 牛肉: 45, 南瓜: 20, 西兰花: 15, 糙米: 18, 亚麻籽油: 2 },
    tags: ['美毛', '成犬'],
  },
  {
    id: 'manual-fish',
    name: '鱼肉抗炎美毛',
    category: '成犬通用',
    custom_category: 'skin',
    description: '鱼肉蛋白与脂肪酸组合的示例食谱。',
    img: '/鱼肉抗炎美毛.png',
    ingredients: { 三文鱼: 42, 红薯: 23, 胡萝卜: 15, 燕麦: 18, 鱼油: 2 },
    tags: ['美毛', '抗炎'],
  },
  {
    id: 'manual-rabbit',
    name: '兔肉红薯单一低敏',
    category: '成犬通用',
    custom_category: 'hypoallergenic',
    description: '单一动物蛋白示例食谱。',
    img: '/兔肉红薯单一低敏.png',
    ingredients: { 兔肉: 50, 红薯: 25, 西葫芦: 15, 小米: 8, 亚麻籽油: 2 },
    tags: ['低敏', '单一蛋白'],
  },
];

const analysis = {
  locale: 'zh',
  life_stage: '成年犬',
  activity_level: 'medium',
  breed_intro: '金毛寻回犬体型较大，应结合体重、体况、活动量和健康记录持续调整鲜食量。',
  daily_grams: 610,
  meals_per_day: 2,
  per_meal_grams: 305,
  daily_kcal: 1180,
  kcal_per_gram: 1.93,
  daily_food_weight_pct_body_weight: 2.5,
  key_nutrition_needs: ['均衡优质蛋白', 'Omega-3脂肪酸', '适量膳食纤维'],
  nutrition_analysis: '当前每日鲜食建议约 610g，分 2 餐，每餐约 305g。优先选择不含已记录过敏原的配方，并根据每周体重与体况变化调整。',
  cautions: ['已记录鸡肉过敏，选择食谱时应检查全部原料和营养包成分。'],
  reference_feeding_plan: {
    daily_grams: 610,
    meals_per_day: 2,
    per_meal_grams: 305,
    daily_kcal: 1180,
    kcal_per_gram: 1.93,
    daily_food_weight_pct_body_weight: 2.5,
  },
  recipe_feeding_plans: {
    'manual-beef': { daily_grams: 610, meals_per_day: 2, per_meal_grams: 305, daily_kcal: 1180, kcal_per_gram: 1.93 },
    'manual-fish': { daily_grams: 590, meals_per_day: 2, per_meal_grams: 295, daily_kcal: 1180, kcal_per_gram: 2.0 },
    'manual-rabbit': { daily_grams: 620, meals_per_day: 2, per_meal_grams: 310, daily_kcal: 1180, kcal_per_gram: 1.9 },
  },
};

const injection = `(() => {
  const demoPet = ${JSON.stringify(demoPet)};
  const recipes = ${JSON.stringify(recipes)};
  const analysis = ${JSON.stringify(analysis)};
  const json = data => Promise.resolve(new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  }));
  const originalFetch = window.fetch.bind(window);
  const mockFetch = (input, init = {}) => {
    const url = String(typeof input === 'string' ? input : input.url);
    const method = String(init.method || 'GET').toUpperCase();
    if (!url.includes('/api/')) return originalFetch(input, init);
    if (url.includes('/api/app-releases/android')) {
      return json({ success: true, latest_version_code: 2, minimum_supported_version_code: 1, latest_version_name: '2.0.0', update_url: '' });
    }
    if (url.includes('/api/users/me')) {
      return json({ success: true, token: 'manual-demo-token', user: { id: 'manual-demo-user', display_name: '手册演示' } });
    }
    if (url.includes('/api/breeds')) {
      return json({ success: true, breeds: [
        { id: 'golden', name: '金毛寻回犬', species: 'dog', size: 'large', weight_avg: 29, image: '/breeds/dog/golden.png' },
        { id: 'corgi', name: '柯基犬', species: 'dog', size: 'medium', weight_avg: 12, image: '/breeds/dog/corgi.png' },
        { id: 'poodle', name: '贵宾犬', species: 'dog', size: 'small', weight_avg: 6, image: '/breeds/dog/poodle.jpg' }
      ] });
    }
    if (url.includes('/api/pets') && method === 'GET') return json({ success: true, pets: [demoPet] });
    if (url.includes('/api/pets') && ['POST', 'PATCH'].includes(method)) return json({ success: true, pet: demoPet });
    if (url.includes('/api/ai-analysis')) return json({ success: true, analysis, comparisons: {} });
    if (url.includes('/api/recipes')) return json({ success: true, recipes });
    if (url.includes('/api/cook/params')) {
      return json({
        success: true,
        intake: { daily_grams: 610, meals_per_day: 2, per_meal_grams: 305 },
        ingredientList: [
          { name: '牛肉', pct: 45 },
          { name: '南瓜', pct: 20 },
          { name: '西兰花', pct: 15 },
          { name: '糙米', pct: 18 },
          { name: '亚麻籽油', pct: 2 }
        ],
        cookParams: { mode: 'diy', temperature: 85, power: 8, speed: 1, cook_seconds: 300 }
      });
    }
    if (url.includes('/api/fresh-check/recognize')) {
      return json({ success: true, ingredients: [
        { name: '牛肉', grams: 180 },
        { name: '南瓜', grams: 80 },
        { name: '西兰花', grams: 40 }
      ] });
    }
    if (url.includes('/api/devices')) return json({ success: true, devices: [] });
    if (url.includes('/api/operations/cooking')) return json({ success: true, operations: [] });
    if (url.includes('/api/feeding-records')) return json({ success: true, records: [] });
    return json({ success: true });
  };
  Object.defineProperty(window, 'fetch', {
    configurable: true,
    get: () => mockFetch,
    set: () => {},
  });
  localStorage.setItem('authToken', 'manual-demo-token');
  localStorage.setItem('userId', 'manual-demo-user');
  localStorage.setItem('username', '手册演示');
  localStorage.setItem('sessionExpiresAt', String(Date.now() + 86400000));
  localStorage.setItem('petchef_onboarding_completed', 'true');
})();`;

const ws = new WebSocket(target);
let nextId = 1;
const pending = new Map();

function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

ws.onopen = async () => {
  try {
    await command('Page.enable');
    await command('Page.addScriptToEvaluateOnNewDocument', { source: injection });
    await command('Runtime.evaluate', { expression: injection, returnByValue: true });
    await command('Runtime.evaluate', { expression: "location.reload(); 'reloading'", returnByValue: true });
    setTimeout(() => ws.close(), 1000);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
    ws.close();
  }
};

ws.onmessage = event => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
};

ws.onerror = error => {
  console.error(error.message || error);
  process.exitCode = 1;
};
