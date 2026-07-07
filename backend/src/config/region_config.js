// Pet Chef v3.0 — Region Configuration
// region_config.js — 中心化区域配置，环境变量驱动
//
// 所有区域差异化行为集中在此文件管理。
// 后端其余代码通过 getRegionConfig() 获取当前区域参数。

const REGIONS = Object.freeze({
  CN: 'cn',
  US: 'us',
  EU: 'eu',
});

const REGION_CONFIGS = Object.freeze({
  // ========== 中国区 ==========
  [REGIONS.CN]: {
    id: 'cn',
    name: '中国',
    name_en: 'China',

    // --- Tuya IoT ---
    tuya: {
      base_url: 'https://openapi.tuyacn.com',
      data_center: 'CN',
    },

    // --- 支付 ---
    payment: {
      providers: ['wechat_pay'],
      planned_providers: ['bank_card', 'wechat_pay', 'alipay'],
      first_stage_provider: 'wechat_pay',
      currency: 'CNY',
      bank_card_enabled: false,
      wechat_pay_enabled: true,
      alipay_enabled: false,
      stripe_enabled: false,
      paypal_enabled: false,
    },

    // --- 认证 ---
    auth: {
      social_providers: ['wechat', 'apple'],
      sms_provider: 'aliyun',  // 阿里云短信
      sms_country_code: '86',
    },

    // --- 推送通知 ---
    push: {
      provider: 'jpush',  // 极光推送 (中国)
    },

    // --- 存储 ---
    storage: {
      provider: 'aliyun_oss',
      cdn_domain: process.env.CN_CDN_DOMAIN || 'cdn.petchef.cn',
      bucket: process.env.CN_OSS_BUCKET || 'petchef-cn',
    },

    // --- 数据库 ---
    database: {
      url: process.env.CN_DATABASE_URL || process.env.DATABASE_URL || '',
    },

    // --- API ---
    api: {
      base_url: process.env.CN_API_BASE_URL || 'https://api.petchef.cn',
      cors_origins: [
        'https://petchef.cn',
        'https://www.petchef.cn',
        'https://admin.petchef.cn',
      ],
    },

    // --- 合规 ---
    compliance: {
      data_residency: 'CN',
      privacy_law: 'PIPL',
      requires_icp: true,
      requires_real_name: false,  // 暂不需要实名认证
    },

    // --- 本地化 ---
    locale: {
      default_language: 'zh',
      default_timezone: 'Asia/Shanghai',
      supported_languages: ['zh', 'en'],
    },

    // --- Gemini AI ---
    ai: {
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
      api_key_env: 'GEMINI_API_KEY',
    },
  },

  // ========== 美国区 ==========
  [REGIONS.US]: {
    id: 'us',
    name: '美国',
    name_en: 'United States',

    tuya: {
      base_url: 'https://openapi.tuyaus.com',
      data_center: 'US',
    },

    payment: {
      providers: ['stripe'],
      planned_providers: ['stripe', 'apple_pay', 'google_pay', 'paypal'],
      first_stage_provider: 'stripe',
      currency: 'USD',
      stripe_enabled: true,
      apple_pay_enabled: false,
      google_pay_enabled: false,
      paypal_enabled: false,
    },

    auth: {
      social_providers: ['google', 'apple'],
      sms_provider: 'twilio',
      sms_country_code: '1',
    },

    push: {
      provider: 'fcm',  // Firebase Cloud Messaging
    },

    storage: {
      provider: 'gcs',  // Google Cloud Storage
      cdn_domain: process.env.US_CDN_DOMAIN || 'cdn-us.petchef.com',
      bucket: process.env.US_GCS_BUCKET || 'petchef-us',
    },

    database: {
      url: process.env.US_DATABASE_URL || process.env.DATABASE_URL || '',
    },

    api: {
      base_url: process.env.US_API_BASE_URL || 'https://api-us.petchef.com',
      cors_origins: [
        'https://petchef.com',
        'https://www.petchef.com',
        'https://admin.petchef.com',
      ],
    },

    compliance: {
      data_residency: 'US',
      privacy_law: 'CCPA',  // California Consumer Privacy Act
      requires_icp: false,
      requires_real_name: false,
    },

    locale: {
      default_language: 'en',
      default_timezone: 'America/New_York',
      supported_languages: ['en', 'es', 'pt', 'fr'],
    },

    ai: {
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
      api_key_env: 'GEMINI_API_KEY',
    },
  },

  // ========== 欧洲区 ==========
  [REGIONS.EU]: {
    id: 'eu',
    name: '欧洲',
    name_en: 'Europe',

    tuya: {
      base_url: 'https://openapi.tuyaeu.com',
      data_center: 'EU',
    },

    payment: {
      providers: ['stripe'],
      planned_providers: ['stripe', 'apple_pay', 'google_pay', 'paypal'],
      first_stage_provider: 'stripe',
      currency: 'EUR',
      stripe_enabled: true,
      apple_pay_enabled: false,
      google_pay_enabled: false,
      paypal_enabled: false,
    },

    auth: {
      social_providers: ['google', 'apple'],
      sms_provider: 'twilio',
      sms_country_code: '44',  // UK default
    },

    push: {
      provider: 'fcm',
    },

    storage: {
      provider: 'gcs',
      cdn_domain: process.env.EU_CDN_DOMAIN || 'cdn-eu.petchef.com',
      bucket: process.env.EU_GCS_BUCKET || 'petchef-eu',
    },

    database: {
      url: process.env.EU_DATABASE_URL || process.env.DATABASE_URL || '',
    },

    api: {
      base_url: process.env.EU_API_BASE_URL || 'https://api-eu.petchef.com',
      cors_origins: [
        'https://petchef.com',
        'https://www.petchef.com',
        'https://admin.petchef.com',
      ],
    },

    compliance: {
      data_residency: 'EU',
      privacy_law: 'GDPR',
      requires_icp: false,
      requires_real_name: false,
      requires_cookie_consent: true,
      requires_data_deletion_api: true,  // GDPR Right to Erasure
    },

    locale: {
      default_language: 'en',
      default_timezone: 'Europe/Berlin',
      supported_languages: ['en', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'ar'],
    },

    ai: {
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
      api_key_env: 'GEMINI_API_KEY',
    },
  },
});

// --- 运行时区域检测 ---

/**
 * 获取当前区域 ID
 * 优先级: PETCHEF_REGION env > 默认 'cn'
 * @returns {'cn'|'us'|'eu'}
 */
function getCurrentRegion() {
  const region = (process.env.PETCHEF_REGION || 'cn').toLowerCase();
  if (!REGION_CONFIGS[region]) {
    console.warn(`[RegionConfig] Unknown region "${region}", falling back to "cn"`);
    return REGIONS.CN;
  }
  return region;
}

/**
 * 获取当前区域配置对象
 * @returns {object} 区域配置
 */
function getRegionConfig() {
  return REGION_CONFIGS[getCurrentRegion()];
}

/**
 * 检查当前区域是否为指定区域
 * @param {'cn'|'us'|'eu'} regionId
 * @returns {boolean}
 */
function isRegion(regionId) {
  return getCurrentRegion() === regionId;
}

/**
 * 获取当前区域的 Tuya 配置
 */
function getTuyaConfig() {
  const config = getRegionConfig();
  return {
    base_url: process.env.TUYA_BASE_URL || config.tuya.base_url,
    access_id: process.env.TUYA_ACCESS_ID || '',
    secret: process.env.TUYA_SECRET || '',
    device_id: process.env.TUYA_DEVICE_ID || '',
    data_center: config.tuya.data_center,
  };
}

/**
 * 获取当前区域的支付配置
 */
function getPaymentConfig() {
  return getRegionConfig().payment;
}

/**
 * 获取当前区域的数据库 URL
 */
function getDatabaseUrl() {
  return getRegionConfig().database.url;
}

/**
 * 获取当前区域的 CORS 配置
 */
function getCorsOrigins() {
  const config = getRegionConfig();
  const envOrigins = process.env.CORS_ORIGINS;
  if (envOrigins) {
    return envOrigins.split(',').map(o => o.trim());
  }
  // Capacitor apps always load the web layer from a local native origin.
  const origins = [
    ...config.api.cors_origins,
    'capacitor://localhost',
    'https://localhost',
  ];
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:3000', 'http://localhost:5173', 'http://localhost:8080');
  }
  return origins;
}

/**
 * 获取当前环境标识
 * @returns {'local'|'test'|'production'}
 */
function getEnvironment() {
  if (process.env.NODE_ENV === 'production') return 'production';
  if (process.env.PETCHEF_ENV === 'test') return 'test';
  return 'local';
}

/**
 * 打印当前区域配置摘要（启动时调用）
 */
function printRegionSummary() {
  const config = getRegionConfig();
  const env = getEnvironment();
  console.log('┌─────────────────────────────────────────┐');
  console.log(`│  Pet Chef v3.0 — ${config.name_en} (${config.id.toUpperCase()})`.padEnd(42) + '│');
  console.log(`│  Environment: ${env}`.padEnd(42) + '│');
  console.log(`│  Tuya:    ${config.tuya.data_center} (${config.tuya.base_url.replace('https://', '')})`.padEnd(42) + '│');
  console.log(`│  Payment: ${config.payment.providers.join(', ')}`.padEnd(42) + '│');
  console.log(`│  Auth:    ${config.auth.social_providers.join(', ')}`.padEnd(42) + '│');
  console.log(`│  Push:    ${config.push.provider}`.padEnd(42) + '│');
  console.log(`│  DB:      ${config.database.url ? '✅ Connected' : '❌ Not configured'}`.padEnd(42) + '│');
  console.log(`│  Compliance: ${config.compliance.privacy_law}`.padEnd(42) + '│');
  console.log('└─────────────────────────────────────────┘');
}

module.exports = {
  REGIONS,
  REGION_CONFIGS,
  getCurrentRegion,
  getRegionConfig,
  isRegion,
  getTuyaConfig,
  getPaymentConfig,
  getDatabaseUrl,
  getCorsOrigins,
  getEnvironment,
  printRegionSummary,
};
