// tuya.js — 涂鸦 IoT API 客户端封装
require('dotenv').config();
const crypto = require('crypto');
const axios = require('axios');

const ACCESS_ID = process.env.TUYA_ACCESS_ID;
const SECRET = process.env.TUYA_SECRET;
const DEVICE_ID = process.env.TUYA_DEVICE_ID;
const BASE_URL = process.env.TUYA_BASE_URL || 'https://openapi.tuyacn.com';

let cachedToken = null;
let tokenExpiry = 0;

/**
 * 生成涂鸦 API 签名
 * @param {string} accessToken - 业务请求时传入 token；获取 token 时传空字符串
 */
function generateSign(accessId, secret, t, nonce, method, path, body = '', accessToken = '') {
  const contentHash = crypto.createHash('sha256').update(body).digest('hex');
  const stringToSign = [method, contentHash, '', path].join('\n');
  // 关键区别：获取token → client_id + t + nonce；业务请求 → client_id + access_token + t + nonce
  const signStr = accessId + (accessToken || '') + t + nonce + stringToSign;
  return crypto.createHmac('sha256', secret).update(signStr).digest('hex').toUpperCase();
}

/**
 * 获取 access token（自动缓存）
 */
async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;
  
  const t = Date.now().toString();
  const nonce = crypto.randomUUID();
  const path = '/v1.0/token?grant_type=1';
  const sign = generateSign(ACCESS_ID, SECRET, t, nonce, 'GET', path);
  
  const res = await axios.get(`${BASE_URL}${path}`, {
    headers: {
      'client_id': ACCESS_ID,
      'sign': sign,
      'sign_method': 'HMAC-SHA256',
      't': t,
      'nonce': nonce,
    },
    timeout: 10000,
  });
  
  if (!res.data.success) throw new Error(`Tuya token error: ${res.data.msg}`);
  
  cachedToken = res.data.result.access_token;
  tokenExpiry = Date.now() + res.data.result.expire_time * 1000 - 60000; // 提前1分钟续期
  return cachedToken;
}

/**
 * 发送指令到设备
 */
async function sendCommands(commands) {
  try {
    const token = await getToken();
    const t = Date.now().toString();
    const nonce = crypto.randomUUID();
    const path = `/v1.0/devices/${DEVICE_ID}/commands`;
    const body = JSON.stringify({ commands });
    // 业务请求签名必须包含 access_token
    const sign = generateSign(ACCESS_ID, SECRET, t, nonce, 'POST', path, body, token);
    
    const res = await axios.post(`${BASE_URL}${path}`, body, {
      headers: {
        'client_id': ACCESS_ID,
        'access_token': token,
        'sign': sign,
        'sign_method': 'HMAC-SHA256',
        't': t,
        'nonce': nonce,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });
    
    return res.data;
  } catch (err) {
    console.error('Tuya sendCommands error:', err.message);
    throw err;
  }
}

/**
 * 获取设备状态
 */
async function getDeviceStatus() {
  try {
    const token = await getToken();
    const t = Date.now().toString();
    const nonce = crypto.randomUUID();
    const path = `/v1.0/devices/${DEVICE_ID}/status`;
    // 业务请求签名必须包含 access_token
    const sign = generateSign(ACCESS_ID, SECRET, t, nonce, 'GET', path, '', token);
    
    const res = await axios.get(`${BASE_URL}${path}`, {
      headers: {
        'client_id': ACCESS_ID,
        'access_token': token,
        'sign': sign,
        'sign_method': 'HMAC-SHA256',
        't': t,
        'nonce': nonce,
      },
      timeout: 10000,
    });
    
    return res.data;
  } catch (err) {
    console.error('Tuya getDeviceStatus error:', err.message);
    throw err;
  }
}

/**
 * 启动鲜食机烹饪
 * @param {Object} params - { temperature, power, speed, cook_time }
 */
async function startCooking(params) {
  const { temperature, power, speed, cook_time } = params;
  
  // 正确顺序：先开机 → 设参数 → 选模式 → 启动
  const commands = [
    { code: 'power', value: true },
    { code: 'cook_temperature', value: temperature },
    { code: 'cook_mode_power', value: power },
    { code: 'cook_mode_speed', value: String(speed) },
    { code: 'cook_time', value: cook_time },
    { code: 'mode', value: 'diy' },
    { code: 'cook_s_p_r', value: 'start' },
  ];
  
  return sendCommands(commands);
}

/**
 * 暂停烹饪
 */
async function pauseCooking() {
  return sendCommands([{ code: 'cook_s_p_r', value: 'pause' }]);
}

/**
 * 停止/重置烹饪
 */
async function stopCooking() {
  return sendCommands([
    { code: 'cook_s_p_r', value: 'reset' },
    { code: 'power', value: false },
  ]);
}

module.exports = { startCooking, pauseCooking, stopCooking, getDeviceStatus };
