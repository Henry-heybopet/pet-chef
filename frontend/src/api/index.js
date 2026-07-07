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

async function post(path, body, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.region ? { 'X-Heybo-Region': options.region } : {}),
      ...(options.token ? authHeaders(options.token) : {}),
    },
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

export const api = {
  sendPhoneCode: (body, region = 'CN') => post('/api/auth/phone/send-code', body, { region }),
  loginWithPhoneCode: (body, region = 'CN') => post('/api/auth/phone/login', body, { region }),
  sendEmailCode: (body, region = 'US') => post('/api/auth/email/send-code', body, { region }),
  loginWithEmailCode: (body, region = 'US') => post('/api/auth/email/login', body, { region }),
  refreshAuthSession: (refreshToken) => post('/api/auth/refresh', { refresh_token: refreshToken }),
  logout: (refreshToken) => post('/api/auth/logout', { refresh_token: refreshToken }),
  logoutAll: (token) => post('/api/auth/logout-all', {}, { token }),
  wechatLogin: (body) => post('/api/auth/wechat/login', body, { region: 'CN' }),
  bindWechatPhone: (body) => post('/api/auth/wechat/bind-phone', body, { region: 'CN' }),
  googleLogin: (body, region = 'US') => post('/api/auth/google/login', body, { region }),
  appleLogin: (body, region = 'US') => post('/api/auth/apple/login', body, { region }),
  bindGoogleEmail: (body, region = 'US') => post('/api/auth/google/bind-email', body, { region }),
  bindAppleEmail: (body, region = 'US') => post('/api/auth/apple/bind-email', body, { region }),
  listAuthIdentities: (token) => authedGet('/api/auth/identities', token),
  unbindAuthIdentity: (identityId, token) => post(`/api/auth/identities/${identityId}/unbind`, {}, { token }),
  heyboMockLogin: (body) => post('/api/auth/mock-login', body),
  heyboMe: (token) => authedGet('/api/users/me', token),
  createPet: (body, token) => authedPost('/api/pets', body, token),
  listPets: (token) => authedGet('/api/pets', token),
  registerDevice: (body, token) => authedPost('/api/devices', body, token),
  listDevices: (token) => authedGet('/api/devices', token),
  recordCookingOperation: (body, token) => authedPost('/api/operations/cooking', body, token),
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
