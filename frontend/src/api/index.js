// src/api/index.js — 前端 API 客户端层
// Web 本地开发可使用 Vite 代理；移动端生产构建通过 VITE_API_URL 连接线上后端。

const BASE = import.meta.env.VITE_API_URL || '';

async function requestJson(path, options) {
  const res = await fetch(`${BASE}${path}`, options);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(res.ok ? '后端返回了非 JSON 数据，请确认后端服务已启动' : `请求失败 ${res.status}`);
  }
  if (!res.ok) throw new Error(data?.error || `请求失败 ${res.status}`);
  return data;
}

async function post(path, body) {
  return requestJson(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function get(path) {
  return requestJson(path);
}

async function getWithTimeout(path, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await requestJson(path, { signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('版本检查超时，请检查网络后重试');
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function authedGet(path, token) {
  return requestJson(path, { headers: authHeaders(token) });
}

async function authedPost(path, body, token) {
  return requestJson(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  });
}

async function authedPatch(path, body, token) {
  return requestJson(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(body),
  });
}

async function authedDelete(path, token) {
  return requestJson(path, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
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
  getAndroidRelease: () => getWithTimeout('/api/app-releases/android'),
  heyboMockLogin: (body) => post('/api/auth/mock-login', body),
  phoneLogin: (body) => post('/api/auth/phone-login', body),
  phoneSignup: (body) => post('/api/auth/phone-signup', body),
  heyboMe: (token) => authedGet('/api/users/me', token),
  uploadAvatar: (dataUrl, token) => authedPost('/api/uploads/avatar', { data_url: dataUrl }, token),
  createPet: (body, token) => authedPost('/api/pets', body, token),
  listPets: (token) => authedGet('/api/pets', token),
  getPet: (petId, token) => authedGet(`/api/pets/${petId}`, token),
  updatePet: (petId, body, token) => authedPatch(`/api/pets/${petId}`, body, token),
  deletePet: (petId, token) => authedDelete(`/api/pets/${encodeURIComponent(petId)}`, token),
  registerDevice: (body, token) => authedPost('/api/devices', body, token),
  listDevices: (token) => authedGet('/api/devices', token),
  unbindDevice: (deviceId, token) => authedDelete(`/api/devices/${encodeURIComponent(deviceId)}`, token),
  syncDeviceDp: (deviceId, body, token) => authedPost(`/api/devices/${encodeURIComponent(deviceId)}/dp-sync`, body, token),
  recordCookingOperation: (body, token) => authedPost('/api/operations/cooking', body, token),
  listCookingOperations: (token) => authedGet('/api/operations/cooking', token),
  listFeedingRecords: (token) => authedGet('/api/feeding-records', token),
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
    return get('/api/breeds');
  },
  getRecipes: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return get(`/api/recipes${q ? '?' + q : ''}`);
  },
  recommend: (petId, token) => authedPost('/api/recommend', { pet_id: petId }, token),
  compareSelection: (body, token) => authedPost('/api/recommend/compare', body, token),
  aiAnalysis: (petId, lang, token) => authedPost('/api/ai-analysis', { pet_id: petId, lang }, token),
  aiAnalysisByPet: (petId, lang, token) => authedPost('/api/ai-analysis', { pet_id: petId, lang }, token),
  freshMatchAnalyze: (body, token) => authedPost('/api/fresh-match/analyze', body, token),
  freshCheckRecognize: (body, token) => authedPost('/api/fresh-check/recognize', body, token),
  freshCheckAnalyze: (body, token) => authedPost('/api/fresh-check/analyze', body, token),
  localizeAnalysis: (body, token) => authedPost('/api/localization/render', body, token),
  aiRecipe: async (body) => {
    return post('/api/ai-recipe', body);
  },
  cookParams: async (body) => {
    return post('/api/cook/params', body);
  },
  tuyaStart: async (body) => {
    return post('/api/tuya/start', body);
  },
  tuyaPause: async () => {
    return post('/api/tuya/pause', {});
  },
  tuyaStop: async () => {
    return post('/api/tuya/stop', {});
  },
  tuyaStatus: async (devId) => {
    return get(`/api/tuya/status${devId ? `?devId=${encodeURIComponent(devId)}` : ''}`);
  },
};
