// src/api/index.js — 前端 API 客户端层
// 使用相对路径，通过 Vite 代理转发到后端，确保手机端也能正常访问
const BASE = import.meta.env.VITE_API_URL || '';

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

export const api = {
  getBreeds: () => get('/api/breeds'),
  getRecipes: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return get(`/api/recipes${q ? '?' + q : ''}`);
  },
  recommend: (body) => post('/api/recommend', body),
  aiAnalysis: (body) => post('/api/ai-analysis', body),
  aiRecipe: (body) => post('/api/ai-recipe', body),
  cookParams: (body) => post('/api/cook/params', body),
  tuyaStart: (body) => post('/api/tuya/start', body),
  tuyaPause: () => post('/api/tuya/pause', {}),
  tuyaStop: () => post('/api/tuya/stop', {}),
  tuyaStatus: () => get('/api/tuya/status'),
};
