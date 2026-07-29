import React, { useEffect, useState, useMemo } from 'react';
import {
  REGIONS,
  MEDICINE_REGISTRY,
  mockRecipes,
  mockProducts,
  mockOrders,
  mockMedicalRecords,
  mockDoctorReviews,
  mockFaultLogs
} from './mockData';

const API_BASE = import.meta.env.VITE_API_URL || '';

function prettyJson(value, fallback = {}) {
  return JSON.stringify(value || fallback, null, 2);
}

function parseJsonField(label, value) {
  try {
    return value?.trim() ? JSON.parse(value) : {};
  } catch {
    throw new Error(`${label} 不是合法 JSON`);
  }
}

function recipeNutrition(recipe) {
  const n = recipe.nutrition_snapshot || {};
  return {
    protein: n.protein || n.protein_pct || recipe.protein_pct || '-',
    fat: n.fat || n.fat_pct || recipe.fat_pct || '-',
    moisture: n.moisture || n.water_content_pct || recipe.water_content_pct || '-',
    caloric_density: n.caloric_density || n.calories_per_100g || '-',
  };
}

function recipeCookingProfile(recipe) {
  return recipe.cooking_profile || recipe.cooking_base || {};
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    return value.split(/[,，、;；\s]+/).map(item => item.trim()).filter(Boolean);
  }
  return [];
}

const STATUS_OPTIONS = [
  { label: 'Active', value: 'active' },
  { label: 'Draft', value: 'draft' },
  { label: 'Archived', value: 'archived' },
];

const CATEGORY_OPTIONS = ['幼犬通用', '控钙幼犬（大型幼犬）', '成犬通用', '老年犬通用', '美毛护肤', '低敏单一蛋白', '护肝'];
const LIFE_STAGE_OPTIONS = ['幼犬', '成年犬', '老年犬'];
const PROTEIN_GROUP_OPTIONS = [
  { label: '鸡肉', value: 'chicken' },
  { label: '鸭肉', value: 'duck' },
  { label: '牛肉', value: 'beef' },
  { label: '鱼肉', value: 'fish' },
  { label: '兔肉', value: 'rabbit' },
  { label: '其它肉', value: 'other' },
];
const POWER_OPTIONS = Array.from({ length: 11 }, (_, index) => ({ label: `${index * 100}瓦`, value: String(index * 100) }));
const SPEED_OPTIONS = Array.from({ length: 11 }, (_, index) => ({ label: `${index}档`, value: String(index) }));
const WATER_RATIO_OPTIONS = [
  { label: '10%', value: '10' },
  { label: '15%', value: '15' },
  { label: '20%', value: '20' },
];
const PACKAGE_WEIGHT_OPTIONS = [100, 200, 300, 400, 500].map(value => ({ label: `${value}克`, value: String(value) }));
const TEXTURE_OPTIONS = [
  '原切块状 / 清晰颗粒感',
  '软烩饭 / 湿润软烂型',
  '颗粒饭团型 / 松散成团型',
  '肉泥慕斯型 / 细腻糊状',
  '炒饭 / 偏干香颗粒型',
];

const ADMIN_TOKEN_KEY = 'heybo_admin_token';
const ADMIN_MODULES = [
  { key: 'dashboard', label: '📊 运行大盘 Dashboard' },
  { key: 'users', label: '👤 用户管理 Users' },
  { key: 'pets', label: '🐶 宠物档案 Pets' },
  { key: 'devices', label: '🔌 智能设备 Devices' },
  { key: 'recipes', label: '🍲 食谱配方 Recipes' },
  { key: 'products', label: '🛒 商品 & 溯源 Mall' },
  { key: 'orders', label: '📦 订单对账 Orders' },
  { key: 'medical', label: '🏥 医疗病例 Medical' },
  { key: 'doctors', label: '🩺 医生 & 处方 Doctors' },
  { key: 'faults', label: '⚠️ 故障诊断 Fault Logs' },
  { key: 'subadmins', label: '🔐 子管理员管理' },
];

const NUTRITION_FIELDS = [
  ['protein_pct', '粗蛋白：≥', '%'],
  ['fat_pct', '粗脂肪：≥', '%'],
  ['fiber_pct', '粗纤维：≤', '%'],
  ['water_content_pct', '水分：≤', '%'],
  ['ash_pct', '粗灰分：≤', '%'],
  ['calcium_pct', '钙：≥', '%'],
  ['phosphorus_pct', '总磷：≥', '%'],
  ['chloride_pct', '水溶性氯化物：≥', '%'],
  ['lysine_pct', '赖氨酸：≥', '%'],
  ['calories_per_100g', '100克能量密度', '千卡'],
];

const NUTRITION_FALLBACK_KEYS = {
  protein_pct: ['protein_pct', 'protein'],
  fat_pct: ['fat_pct', 'fat'],
  fiber_pct: ['fiber_pct', 'fiber'],
  water_content_pct: ['water_content_pct', 'moisture'],
  calories_per_100g: ['calories_per_100g', 'caloric_density'],
};

function objectToRows(value) {
  return Object.entries(value || {}).map(([name, percent]) => ({ name, percent: String(percent ?? '') }));
}

function bPackToRows(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return objectToRows(value);
  if (typeof value !== 'string') return [];
  return value.split('/').map((part, index) => {
    const clean = part.trim();
    const match = clean.match(/^(.*?)(\d+(?:\.\d+)?)\s*$/);
    if (!match) return { name: clean, percent: '' };
    const rawName = match[1].trim().replace(/^[^：:]+[：:]\s*/, index === 0 ? '' : '');
    return { name: rawName || clean, percent: match[2] };
  }).filter(row => row.name);
}

function rowsToObject(rows) {
  return rows.reduce((acc, row) => {
    const name = row.name.trim();
    if (name) acc[name] = Number(row.percent) || 0;
    return acc;
  }, {});
}

function sumRows(rows) {
  return rows.reduce((sum, row) => sum + (Number(row.percent) || 0), 0);
}

function sortRecipesById(items) {
  return [...items].sort((a, b) => String(a.id).localeCompare(String(b.id), 'en', { numeric: true }));
}

function normalizeSearchText(value) {
  return String(value || '').trim().toLowerCase();
}

function isRecipeDraftDirty(recipe, draft) {
  return JSON.stringify(draft) !== JSON.stringify(toRecipeDraft(recipe));
}

function toSubadminDraft(account = {}) {
  return {
    username: account.username || '',
    password: account.password || '',
    regions: Array.isArray(account.regions) ? account.regions : [],
    modules: Array.isArray(account.modules) ? account.modules : [],
    isNew: Boolean(account.isNew),
  };
}

function isSubadminDraftDirty(account, draft) {
  return JSON.stringify(toSubadminDraft(account)) !== JSON.stringify(draft);
}

function getNutritionValue(recipe, nutrition, key) {
  const keys = NUTRITION_FALLBACK_KEYS[key] || [key];
  for (const candidate of keys) {
    if (nutrition?.[candidate] !== undefined && nutrition?.[candidate] !== null) return nutrition[candidate];
    if (recipe?.[candidate] !== undefined && recipe?.[candidate] !== null) return recipe[candidate];
  }
  return '';
}

function normalizePowerWatts(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '800';
  return String(num <= 10 ? num * 100 : num);
}

function normalizeWaterRatioPercent(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return '15';
  return String(num <= 1 ? Math.round(num * 100) : num);
}

function toRecipeDraft(recipe) {
  const nutrition = recipe.nutrition_snapshot || {};
  const cookingProfile = recipeCookingProfile(recipe);
  const bPackValue = nutrition.b_pack || recipe.b_pack || {};
  const nutritionFields = NUTRITION_FIELDS.reduce((acc, [key]) => {
    acc[key] = String(getNutritionValue(recipe, nutrition, key) ?? '');
    return acc;
  }, {});

  return {
    img: recipe.img || '',
    name: recipe.name || '',
    category: recipe.category || CATEGORY_OPTIONS[0],
    life_stage: recipe.life_stage || LIFE_STAGE_OPTIONS[1],
    status: recipe.status || 'active',
    version: recipe.version || 1,
    health_tags: asArray(recipe.health_tags || recipe.tags).join('、'),
    ingredientsRows: objectToRows(recipe.ingredients || {}),
    bPackRows: bPackToRows(bPackValue),
    nutritionFields,
    nutritionSnapshot: nutrition,
    cookingProfile,
    cookingParams: {
      protein_group: cookingProfile.protein_group || 'other',
      temperature: String(cookingProfile.temperature ?? 85),
      powerWatts: normalizePowerWatts(cookingProfile.power),
      speed: String(cookingProfile.speed ?? 1),
      waterRatioPercent: normalizeWaterRatioPercent(cookingProfile.water_ratio),
      preheatMinutes: String(cookingProfile.preheat_minutes ?? 3),
      cookMinutes: String(cookingProfile.cook_minutes ?? 8),
      packageWeightGrams: String(cookingProfile.cook_weight_grams ?? cookingProfile.package_weight_grams ?? 200),
      textureProfile: cookingProfile.texture_profile || TEXTURE_OPTIONS[0],
    },
  };
}

function buildRecipePayload(draft) {
  const bPackObject = rowsToObject(draft.bPackRows);
  const nutritionValues = Object.fromEntries(
    Object.entries(draft.nutritionFields).map(([key, value]) => [key, value === '' ? null : Number(value)])
  );
  const nutritionSnapshot = {
    ...(draft.nutritionSnapshot || {}),
    ...nutritionValues,
    b_pack: bPackObject,
  };
  const cookingProfile = {
    ...(draft.cookingProfile || {}),
    mode: draft.cookingProfile?.mode || 'diy',
    protein_group: draft.cookingParams.protein_group,
    temperature: Number(draft.cookingParams.temperature) || 85,
    power: Math.round((Number(draft.cookingParams.powerWatts) || 0) / 100),
    speed: String(draft.cookingParams.speed ?? '1'),
    water_ratio: (Number(draft.cookingParams.waterRatioPercent) || 15) / 100,
    preheat_minutes: Number(draft.cookingParams.preheatMinutes) || 0,
    cook_minutes: Number(draft.cookingParams.cookMinutes) || 0,
    cook_weight_grams: Number(draft.cookingParams.packageWeightGrams) || 200,
    texture_profile: draft.cookingParams.textureProfile || TEXTURE_OPTIONS[0],
  };

  return {
    name: draft.name.trim(),
    category: draft.category,
    life_stage: draft.life_stage,
    status: draft.status,
    version: Number(draft.version) || 1,
    health_tags: draft.health_tags.split(/[、,，;；\s]+/).map(item => item.trim()).filter(Boolean),
    ingredients: rowsToObject(draft.ingredientsRows),
    b_pack: Object.entries(bPackObject).map(([name, percent]) => `${name} ${percent}`).join(' / '),
    ...nutritionValues,
    nutrition_snapshot: nutritionSnapshot,
    cooking_profile: cookingProfile,
  };
}

function normalizePet(pet) {
  return {
    ...pet,
    allergens: asArray(pet.allergens),
    food_restrictions: asArray(pet.food_restrictions),
    health_tags: asArray(pet.health_tags),
    allergy_symptoms: asArray(pet.allergy_symptoms),
    avatar_url: pet.avatar_url || '',
  };
}

function normalizeUser(user) {
  return {
    ...user,
    display_name: user.display_name || user.primary_phone || user.id,
    avatar_url: user.avatar_url || '',
  };
}

function fmt(value) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? '是' : '否';
  return String(value);
}

function fmtDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('zh-CN');
}

function DetailRow({ label, value }) {
  return (
    <div className="pet-detail-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function App() {
  // 1. 全局状态
  const [activeRegion, setActiveRegion] = useState('CN'); // CN, US, EU
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, users, pets, devices, recipes, products, orders, medical, doctors, faults
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem(ADMIN_TOKEN_KEY) || '');
  const [adminSession, setAdminSession] = useState(null);
  const [adminAuthLoading, setAdminAuthLoading] = useState(Boolean(adminToken));
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminLoginForm, setAdminLoginForm] = useState({ username: 'Heybopetadmin', password: '' });
  const [subadmins, setSubadmins] = useState([]);
  const [subadminDrafts, setSubadminDrafts] = useState({});
  const [subadminError, setSubadminError] = useState('');
  const [savingSubadmin, setSavingSubadmin] = useState('');
  const [visiblePasswords, setVisiblePasswords] = useState({});
  
  // 详情模态框/侧边抽屉状态
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedMedical, setSelectedMedical] = useState(null);
  const [selectedFault, setSelectedFault] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipeForm, setRecipeForm] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [recipeSource, setRecipeSource] = useState('loading');
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [recipeError, setRecipeError] = useState('');
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [recipeDrafts, setRecipeDrafts] = useState({});
  const [recipeRowErrors, setRecipeRowErrors] = useState({});
  const [recipeSearch, setRecipeSearch] = useState('');
  const [uploadingRecipeId, setUploadingRecipeId] = useState('');
  const [pets, setPets] = useState([]);
  const [petSource, setPetSource] = useState('loading');
  const [petError, setPetError] = useState('');
  const [users, setUsers] = useState([]);
  const [userSource, setUserSource] = useState('loading');
  const [userError, setUserError] = useState('');
  const [devices, setDevices] = useState([]);
  const [deviceSource, setDeviceSource] = useState('loading');
  const [deviceError, setDeviceError] = useState('');

  // 处方药品维护列表状态
  const [medicines, setMedicines] = useState(MEDICINE_REGISTRY);
  const [newMedName, setNewMedName] = useState('');
  const [newMedIngredient, setNewMedIngredient] = useState('');
  const [newMedDisorder, setNewMedDisorder] = useState('');

  // 医生审核处理
  const [doctors, setDoctors] = useState(mockDoctorReviews);

  const canAccessModule = (key) => adminSession?.role === 'superadmin' || adminSession?.modules?.includes(key);
  const canAccessRegion = (code) => adminSession?.role === 'superadmin' || adminSession?.regions?.includes(code);
  const allowedRegions = useMemo(() => REGIONS.filter(region => canAccessRegion(region.code)), [adminSession]);
  const visibleModules = useMemo(() => ADMIN_MODULES.filter(module => canAccessModule(module.key)), [adminSession]);

  const adminFetch = async (path, options = {}) => {
    const token = adminToken || localStorage.getItem(ADMIN_TOKEN_KEY) || '';
    const headers = {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    return fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'same-origin',
      headers,
    });
  };

  const clearAdminSession = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdminToken('');
    setAdminSession(null);
  };

  const loadAdminSession = async (token = adminToken) => {
    if (!token) {
      setAdminAuthLoading(false);
      return;
    }
    setAdminAuthLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/auth/session`, {
        credentials: 'same-origin',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || '登录已失效');
      setAdminSession(data.profile);
      setAdminToken(token);
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
      setAdminLoginError('');
    } catch (error) {
      clearAdminSession();
      setAdminLoginError(error.message);
    } finally {
      setAdminAuthLoading(false);
    }
  };

  const handleAdminLogin = async (event) => {
    event.preventDefault();
    setAdminAuthLoading(true);
    setAdminLoginError('');
    try {
      const res = await fetch(`${API_BASE}/api/admin/auth/login`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminLoginForm),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || '登录失败');
      setAdminToken(data.token);
      setAdminSession(data.profile);
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
    } catch (error) {
      clearAdminSession();
      setAdminLoginError(error.message);
    } finally {
      setAdminAuthLoading(false);
    }
  };

  // 当前区域的配置信息
  const currentRegionConfig = useMemo(() => {
    return REGIONS.find(r => r.code === activeRegion) || REGIONS[0];
  }, [activeRegion]);

  // ==========================================
  // 数据过滤逻辑（按当前选择的区域隔离）
  // ==========================================
  const filteredUsers = useMemo(() => {
    return users.filter(u => u.region === activeRegion);
  }, [activeRegion, users]);

  const filteredPets = useMemo(() => {
    return petSource === 'pg' ? pets : [];
  }, [pets, petSource]);

  const filteredDevices = useMemo(() => {
    return deviceSource === 'heybo_store' ? devices.filter(d => (d.region || 'CN') === activeRegion) : [];
  }, [activeRegion, devices, deviceSource]);

  const filteredProducts = useMemo(() => {
    // 料包做区域隔离，配件全局显示
    return mockProducts.filter(p => p.id.includes(activeRegion) || p.category !== '鲜食料包');
  }, [activeRegion]);

  const filteredOrders = useMemo(() => {
    return mockOrders.filter(o => o.region === activeRegion);
  }, [activeRegion]);

  const filteredRecipes = useMemo(() => {
    const query = normalizeSearchText(recipeSearch);
    if (!query) return recipes;
    return recipes.filter(recipe => {
      const draft = recipeDrafts[recipe.id] || toRecipeDraft(recipe);
      return [
        draft.name,
        draft.category,
        draft.health_tags,
        draft.life_stage,
      ].some(value => normalizeSearchText(value).includes(query));
    });
  }, [recipes, recipeDrafts, recipeSearch]);

  const filteredMedical = useMemo(() => {
    const petIds = new Set(filteredPets.map(p => p.id));
    return mockMedicalRecords.filter(m => petIds.has(m.pet_id));
  }, [filteredPets]);

  const filteredFaults = useMemo(() => {
    const devIds = new Set(filteredDevices.map(d => d.id));
    return mockFaultLogs.filter(f => devIds.has(f.device_id));
  }, [filteredDevices]);

  // ==========================================
  // 仪表盘核心指标统计
  // ==========================================
  const dashboardStats = useMemo(() => {
    const onlineDevs = filteredDevices.filter(d => d.telemetry?.online).length;
    const activeUsrs = filteredUsers.filter(u => u.status === 'active').length;
    const totalRevenue = filteredOrders
      .filter(o => o.payment_status === 'success')
      .reduce((sum, o) => sum + o.total_cents, 0) / 100;

    return [
      { label: '活跃用户 (区内)', value: activeUsrs, note: `总账号: ${filteredUsers.length}个`, color: '#0ea5b7' },
      { label: '智能设备在线率', value: `${onlineDevs}/${filteredDevices.length}`, note: `离线设备: ${filteredDevices.length - onlineDevs}台`, color: '#10b981' },
      { label: '当期商城流水', value: `${currentRegionConfig.symbol}${totalRevenue.toFixed(2)}`, note: `已付款订单: ${filteredOrders.length}笔`, color: '#f59e0b' },
      { label: '设备告警/故障', value: filteredFaults.filter(f => f.status === 'unresolved').length, note: '待处理客服单', color: '#ef4444' }
    ];
  }, [filteredUsers, filteredDevices, filteredOrders, filteredFaults, currentRegionConfig]);

  const loadRecipes = async () => {
    setRecipesLoading(true);
    setRecipeError('');
    try {
      const res = await adminFetch('/api/admin/recipes');
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || '加载食谱失败');
      const nextRecipes = sortRecipesById(data.recipes || []);
      setRecipes(nextRecipes);
      setRecipeDrafts(Object.fromEntries(nextRecipes.map(recipe => [recipe.id, toRecipeDraft(recipe)])));
      setRecipeSource(data.source || 'pg');
    } catch (error) {
      setRecipes([]);
      setRecipeSource('pg_error');
      setRecipeError(error.message);
    } finally {
      setRecipesLoading(false);
    }
  };

  const loadPets = async () => {
    setPetError('');
    try {
      const res = await adminFetch('/api/admin/pets');
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || '加载宠物档案失败');
      setPets((data.pets || []).map(normalizePet));
      setPetSource(data.source || 'pg');
    } catch (error) {
      setPets([]);
      setPetSource('pg_error');
      setPetError(error.message);
    }
  };

  const loadUsers = async () => {
    setUserError('');
    try {
      const res = await adminFetch('/api/admin/users');
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || '加载用户失败');
      setUsers((data.users || []).map(normalizeUser));
      setUserSource(data.source || 'pg');
    } catch (error) {
      setUsers([]);
      setUserSource('pg_error');
      setUserError(error.message);
    }
  };

  const loadDevices = async () => {
    setDeviceError('');
    try {
      const res = await adminFetch('/api/admin/devices');
      const data = await res.json();
      if (!data?.success) throw new Error(data?.error || '加载设备失败');
      setDevices(data.devices || []);
      setDeviceSource(data.source || 'heybo_store');
    } catch (error) {
      setDevices([]);
      setDeviceSource('store_error');
      setDeviceError(error.message);
    }
  };

  const loadSubadmins = async () => {
    if (!canAccessModule('subadmins')) return;
    setSubadminError('');
    try {
      const res = await adminFetch('/api/admin/subadmins');
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || '加载子管理员失败');
      const rows = data.subadmins || [];
      setSubadmins(rows);
      setSubadminDrafts(Object.fromEntries(rows.map(account => [account.username, toSubadminDraft(account)])));
    } catch (error) {
      setSubadminError(error.message);
    }
  };

  useEffect(() => {
    loadAdminSession(adminToken);
  }, []);

  useEffect(() => {
    if (!adminSession) return;
    if (!allowedRegions.some(region => region.code === activeRegion)) {
      setActiveRegion(allowedRegions[0]?.code || 'CN');
    }
    if (!visibleModules.some(module => module.key === activeTab)) {
      setActiveTab(visibleModules[0]?.key || 'dashboard');
    }
  }, [adminSession, allowedRegions, activeRegion, visibleModules, activeTab]);

  useEffect(() => {
    if (!adminSession) return;
    if (canAccessModule('users')) loadUsers();
    if (canAccessModule('recipes')) loadRecipes();
    if (canAccessModule('pets')) loadPets();
    if (canAccessModule('devices')) loadDevices();
    if (canAccessModule('subadmins')) loadSubadmins();
  }, [adminSession]);

  const openRecipeEditor = (recipe) => {
    const cookingProfile = recipeCookingProfile(recipe);
    setSelectedRecipe(recipe);
    setRecipeForm({
      name: recipe.name || '',
      category: recipe.category || '',
      life_stage: recipe.life_stage || '',
      status: recipe.status || 'active',
      version: recipe.version || 1,
      health_tags: Array.isArray(recipe.health_tags) ? recipe.health_tags.join(', ') : (recipe.tags || []).join(', '),
      ingredients: prettyJson(recipe.ingredients, {}),
      nutrition_snapshot: prettyJson(recipe.nutrition_snapshot, {}),
      cooking_profile: prettyJson(cookingProfile, {}),
    });
  };

  const handleRecipeFormChange = (field, value) => {
    setRecipeForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveRecipe = async (e) => {
    e.preventDefault();
    if (!selectedRecipe || !recipeForm) return;
    setSavingRecipe(true);
    setRecipeError('');
    try {
      const payload = {
        name: recipeForm.name.trim(),
        category: recipeForm.category.trim(),
        life_stage: recipeForm.life_stage.trim() || null,
        status: recipeForm.status,
        version: Number(recipeForm.version) || 1,
        health_tags: recipeForm.health_tags.split(/[,，、;；\s]+/).map(item => item.trim()).filter(Boolean),
        ingredients: parseJsonField('食材配比', recipeForm.ingredients),
        nutrition_snapshot: parseJsonField('营养快照', recipeForm.nutrition_snapshot),
        cooking_profile: parseJsonField('鲜食机控制参数', recipeForm.cooking_profile),
      };
      const res = await adminFetch(`/api/admin/recipes/${selectedRecipe.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || '保存失败');
      setRecipes(prev => sortRecipesById(prev.map(recipe => recipe.id === data.recipe.id ? data.recipe : recipe)));
      setRecipeSource(data.source || 'pg');
      setSelectedRecipe(null);
      setRecipeForm(null);
    } catch (error) {
      setRecipeError(error.message);
    } finally {
      setSavingRecipe(false);
    }
  };

  const resolveRecipeImage = (img) => {
    if (!img) return '';
    if (/^https?:\/\//i.test(img) || img.startsWith('data:')) return img;
    return `${API_BASE}${img.startsWith('/') ? img : `/${img}`}`;
  };

  const updateRecipeDraft = (recipeId, updater) => {
    setRecipeDrafts(prev => {
      const current = prev[recipeId] || toRecipeDraft(recipes.find(recipe => recipe.id === recipeId) || {});
      return {
        ...prev,
        [recipeId]: typeof updater === 'function' ? updater(current) : { ...current, ...updater },
      };
    });
  };

  const updateRecipeRow = (recipeId, listKey, index, field, value) => {
    updateRecipeDraft(recipeId, draft => ({
      ...draft,
      [listKey]: draft[listKey].map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row),
    }));
  };

  const addRecipeRow = (recipeId, listKey) => {
    updateRecipeDraft(recipeId, draft => ({
      ...draft,
      [listKey]: [...draft[listKey], { name: '', percent: '' }],
    }));
  };

  const removeRecipeRow = (recipeId, listKey, index) => {
    updateRecipeDraft(recipeId, draft => ({
      ...draft,
      [listKey]: draft[listKey].filter((_, rowIndex) => rowIndex !== index),
    }));
  };

  const validateRecipeDraft = (draft) => {
    if (!draft.name.trim()) return '食谱名字不能为空';
    return '';
  };

  const saveRecipeRow = async (recipe) => {
    const draft = recipeDrafts[recipe.id] || toRecipeDraft(recipe);
    const validationError = validateRecipeDraft(draft);
    setRecipeRowErrors(prev => ({ ...prev, [recipe.id]: validationError }));
    if (validationError) return;

    setSavingRecipe(recipe.id);
    setRecipeError('');
    try {
      const res = await adminFetch(`/api/admin/recipes/${recipe.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRecipePayload(draft)),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || '保存失败');
      setRecipes(prev => sortRecipesById(prev.map(item => item.id === data.recipe.id ? data.recipe : item)));
      setRecipeDrafts(prev => ({ ...prev, [data.recipe.id]: toRecipeDraft(data.recipe) }));
      setRecipeSource(data.source || 'pg');
      setRecipeRowErrors(prev => ({ ...prev, [recipe.id]: '' }));
    } catch (error) {
      setRecipeRowErrors(prev => ({ ...prev, [recipe.id]: error.message }));
    } finally {
      setSavingRecipe(false);
    }
  };

  const uploadRecipeImage = async (recipe, file) => {
    if (!file) return;
    setUploadingRecipeId(recipe.id);
    setRecipeRowErrors(prev => ({ ...prev, [recipe.id]: '' }));
    try {
      const imageData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('读取图片失败'));
        reader.readAsDataURL(file);
      });
      const res = await adminFetch(`/api/admin/recipes/${recipe.id}/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: imageData, filename: file.name }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || '上传图片失败');
      setRecipes(prev => sortRecipesById(prev.map(item => item.id === data.recipe.id ? data.recipe : item)));
      setRecipeDrafts(prev => ({ ...prev, [data.recipe.id]: toRecipeDraft(data.recipe) }));
    } catch (error) {
      setRecipeRowErrors(prev => ({ ...prev, [recipe.id]: error.message }));
    } finally {
      setUploadingRecipeId('');
    }
  };

  const addRecipe = async () => {
    setSavingRecipe('new');
    setRecipeError('');
    try {
      const res = await adminFetch('/api/admin/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || '新增食谱失败');
      setRecipes(prev => sortRecipesById([...prev, data.recipe]));
      setRecipeDrafts(prev => ({ ...prev, [data.recipe.id]: toRecipeDraft(data.recipe) }));
      setRecipeSource(data.source || 'pg');
    } catch (error) {
      setRecipeError(error.message);
    } finally {
      setSavingRecipe(false);
    }
  };

  const addSubadminDraft = () => {
    const tempId = `new_${Date.now()}`;
    const draft = toSubadminDraft({
      username: '',
      password: '',
      regions: ['CN'],
      modules: ['dashboard'],
      isNew: true,
    });
    setSubadmins(prev => [...prev, { ...draft, username: tempId, displayUsername: '', isNew: true }]);
    setSubadminDrafts(prev => ({ ...prev, [tempId]: draft }));
  };

  const updateSubadminDraft = (key, updater) => {
    setSubadminDrafts(prev => {
      const current = prev[key] || toSubadminDraft(subadmins.find(item => item.username === key) || {});
      return {
        ...prev,
        [key]: typeof updater === 'function' ? updater(current) : { ...current, ...updater },
      };
    });
  };

  const toggleSubadminListValue = (key, listKey, value) => {
    updateSubadminDraft(key, draft => {
      const current = new Set(draft[listKey] || []);
      if (current.has(value)) current.delete(value);
      else current.add(value);
      return { ...draft, [listKey]: [...current] };
    });
  };

  const saveSubadminRow = async (account) => {
    const key = account.username;
    const draft = subadminDrafts[key] || toSubadminDraft(account);
    const username = draft.username.trim();
    if (!username) {
      setSubadminError('子管理员帐号不能为空');
      return;
    }
    if (!draft.password) {
      setSubadminError('子管理员密码不能为空');
      return;
    }
    if (!draft.regions.length || !draft.modules.length) {
      setSubadminError('区域和板块权限至少各选择一项');
      return;
    }
    setSavingSubadmin(key);
    setSubadminError('');
    try {
      const res = await adminFetch(account.isNew ? '/api/admin/subadmins' : `/api/admin/subadmins/${encodeURIComponent(account.username)}`, {
        method: account.isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || '保存子管理员失败');
      const saved = data.subadmin;
      setSubadmins(prev => {
        const withoutCurrent = prev.filter(item => item.username !== key);
        return [...withoutCurrent, saved].sort((a, b) => a.username.localeCompare(b.username));
      });
      setSubadminDrafts(prev => {
        const next = { ...prev };
        delete next[key];
        next[saved.username] = toSubadminDraft(saved);
        return next;
      });
    } catch (error) {
      setSubadminError(error.message);
    } finally {
      setSavingSubadmin('');
    }
  };

  const deleteSubadminRow = async (account) => {
    if (account.isNew) {
      setSubadmins(prev => prev.filter(item => item.username !== account.username));
      setSubadminDrafts(prev => {
        const next = { ...prev };
        delete next[account.username];
        return next;
      });
      return;
    }
    if (!window.confirm(`确认删除子管理员 ${account.username}？`)) return;
    setSavingSubadmin(account.username);
    setSubadminError('');
    try {
      const res = await adminFetch(`/api/admin/subadmins/${encodeURIComponent(account.username)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || '删除子管理员失败');
      setSubadmins(prev => prev.filter(item => item.username !== account.username));
      setSubadminDrafts(prev => {
        const next = { ...prev };
        delete next[account.username];
        return next;
      });
    } catch (error) {
      setSubadminError(error.message);
    } finally {
      setSavingSubadmin('');
    }
  };

  // 处理添加药品逻辑
  const handleAddMedicine = (e) => {
    e.preventDefault();
    if (!newMedName || !newMedIngredient) return;
    const newMed = {
      id: `MED-00${medicines.length + 1}`,
      name: newMedName,
      ingredient: newMedIngredient,
      targetDisorder: newMedDisorder || '通用调理'
    };
    setMedicines([...medicines, newMed]);
    setNewMedName('');
    setNewMedIngredient('');
    setNewMedDisorder('');
  };

  // 处理医生状态流转
  const handleApproveDoctor = (id, newStatus) => {
    setDoctors(doctors.map(doc => {
      if (doc.id === id) {
        return { ...doc, status: newStatus, reviewed_by: 'SuperAdmin-Platform' };
      }
      return doc;
    }));
  };

  const moduleLabel = (module) => {
    if (module.key === 'users') return `👤 用户管理 Users (${filteredUsers.length}/${users.length})`;
    if (module.key === 'pets') return `🐶 宠物档案 Pets (${filteredPets.length}/${pets.length})`;
    if (module.key === 'devices') return `🔌 智能设备 Devices (${filteredDevices.length})`;
    if (module.key === 'faults') return `⚠️ 故障诊断 Fault Logs (${filteredFaults.length}/${mockFaultLogs.length})`;
    return module.label;
  };

  if (adminAuthLoading && !adminSession) {
    return (
      <main className="admin-login-screen">
        <section className="admin-login-card">
          <div className="brand-mark">HB</div>
          <h1>Heybo Pet Admin</h1>
          <p>正在校验管理员登录状态...</p>
        </section>
      </main>
    );
  }

  if (!adminSession) {
    return (
      <main className="admin-login-screen">
        <form className="admin-login-card" onSubmit={handleAdminLogin}>
          <div className="brand-mark">HB</div>
          <h1>Heybo Pet Admin</h1>
          <p>请输入管理员账号和密码。</p>
          {adminLoginError && <div className="login-error">{adminLoginError}</div>}
          <label>
            <span>管理员帐号</span>
            <input
              value={adminLoginForm.username}
              onChange={e => setAdminLoginForm(prev => ({ ...prev, username: e.target.value }))}
              autoComplete="username"
            />
          </label>
          <label>
            <span>管理员密码</span>
            <input
              type="password"
              value={adminLoginForm.password}
              onChange={e => setAdminLoginForm(prev => ({ ...prev, password: e.target.value }))}
              autoComplete="current-password"
            />
          </label>
          <button className="action-btn" type="submit" disabled={adminAuthLoading}>
            {adminAuthLoading ? '登录中...' : '登录'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      {/* 侧边栏 */}
      <aside className="sidebar">
        <div>
          <div className="brand-mark">HB</div>
          <h1>Heybo Pet Admin</h1>
          <p className="subtitle">
            智能鲜食生态内部运营控制台 ({currentRegionConfig.name})
          </p>
          <div className="region-indicator">
            <span className="dot active"></span>
            <span>{adminSession.username} · {adminSession.role === 'superadmin' ? '主管理员' : '子管理员'}</span>
          </div>
        </div>
        <nav aria-label="核心管理板块" className="sidebar-nav">
          {visibleModules.map(module => (
            <button key={module.key} className={`nav-btn ${activeTab === module.key ? 'active' : ''}`} onClick={() => setActiveTab(module.key)}>
              <span>{moduleLabel(module)}</span>
            </button>
          ))}
        </nav>        <div className="sidebar-footer">
          <button className="logout-btn" type="button" onClick={clearAdminSession}>退出登录</button>
          <p>当前合规：{activeRegion === 'CN' ? 'PIPL 本地隔离存储' : activeRegion === 'EU' ? 'GDPR 本地隔离存储' : 'US HIPAA/CCPA'}</p>
          <p className="version">Vite Dev Server • v4.5</p>
        </div>
      </aside>

      {/* 右侧主工作区 */}
      <section className="workspace">
        {/* 顶部标题栏与区域切换器 */}
        <header className="workspace-header">
          <div>
            <span className="eyebrow">Heybo Smart Platform</span>
            <h2>{activeTab.toUpperCase()} - {currentRegionConfig.name}</h2>
          </div>

          <div className="top-actions">
            <span className="switch-label">切换管辖数据中心:</span>
            <div className="region-switch-group">
              {allowedRegions.map(r => (
                <button
                  key={r.code}
                  className={`region-switch-btn ${activeRegion === r.code ? 'active' : ''}`}
                  onClick={() => {
                    setActiveRegion(r.code);
                    // 切换区域时重置详情面板，防止数据错位
                    setSelectedUser(null);
                    setSelectedProduct(null);
                    setSelectedDevice(null);
                    setSelectedMedical(null);
                    setSelectedFault(null);
                  }}
                >
                  {r.name} ({r.code})
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* 仪表盘统计卡片 */}
        {activeTab === 'dashboard' && (
          <section className="dashboard-content">
            <section className="metric-grid" aria-label="数据中心健康度摘要">
              {dashboardStats.map(metric => (
                <article className="metric-card" key={metric.label}>
                  <span className="metric-label">{metric.label}</span>
                  <strong className="metric-value" style={{ color: metric.color }}>{metric.value}</strong>
                  <p className="metric-note">{metric.note}</p>
                </article>
              ))}
            </section>

            {/* 运营看板附加信息 */}
            <div className="dashboard-info-row">
              <div className="info-block">
                <h3>📌 区域合规与安全防御状态</h3>
                <ul className="info-list">
                  <li><strong>当前限流拦截率</strong>：0.00% (正常运行)</li>
                  <li><strong>API 敏感防护</strong>：对 <code>/ai-recipe</code> (Gemini) 网关施加限制 1分钟15次</li>
                  <li><strong>数据库合规状态</strong>：
                    {activeRegion === 'CN' ? ' 严格遵循中国 PIPL，数据库路由至上海 RDS PostgreSQL' :
                     activeRegion === 'EU' ? ' 严格遵循欧盟 GDPR，数据保存在法兰克福 Google Cloud SQL，支持被遗忘权' :
                     ' 遵循美利坚合规要求，数据存放于爱荷华州'}
                  </li>
                  <li><strong>跨域 CORS 来源</strong>：已绑定该区域专用子域名</li>
                </ul>
              </div>

              <div className="info-block">
                <h3>🍲 配方药品快捷统计</h3>
                <ul className="info-list">
                  <li><strong>注册处方药品</strong>：{medicines.length} 种</li>
                  <li><strong>平台认证执业兽医</strong>：{doctors.filter(d => d.status === 'approved').length} 位</li>
                  <li><strong>处方食谱标记率</strong>：{mockRecipes.filter(r => r.requires_vet_approval).length} 个</li>
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* 1. 用户管理模块 */}
        {activeTab === 'users' && (
          <section className="module-section">
            <div className="table-header">
              <h3>用户账户名录</h3>
              <p>
                数据源：{userSource}
                {userError ? ` 数据库加载失败：${userError}` : ` 仅展示 ${currentRegionConfig.name} 注册账号`}
              </p>
            </div>
            
            <div className="grid-list">
              {filteredUsers.map(user => (
                <article key={user.id} className="detail-card cursor-pointer" onClick={() => setSelectedUser(user)}>
                  <div className="card-header">
                    {user.avatar_url ? <img className="avatar" src={user.avatar_url} alt={user.display_name} /> : <div className="avatar avatar-fallback">👤</div>}
                    <div>
                      <h4>{user.display_name}</h4>
                      <span className="badge-id">{user.id}</span>
                    </div>
                  </div>
                  <div className="card-body">
                    <p><strong>电话:</strong> {user.primary_phone || '未绑定'}</p>
                    <p><strong>邮箱:</strong> {user.primary_email || '未绑定'}</p>
                    <p><strong>注册时间:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
                    <p><strong>状态:</strong> 
                      <span className={`status-tag ${user.status}`}>
                        {user.status === 'active' ? '正常' : user.status === 'suspended' ? '封禁' : '注销'}
                      </span>
                    </p>
                  </div>
                  <div className="card-footer">
                    <span>点击查看名下多智能设备与收货地址</span>
                  </div>
                </article>
              ))}
            </div>

            {/* 用户抽屉详情面板 */}
            {selectedUser && (
              <div className="detail-drawer-overlay" onClick={() => setSelectedUser(null)}>
                <div className="detail-drawer" onClick={e => e.stopPropagation()}>
                  <button className="close-btn" onClick={() => setSelectedUser(null)}>✕ 关闭</button>
                  <div className="drawer-header">
                    {selectedUser.avatar_url ? <img className="drawer-avatar" src={selectedUser.avatar_url} alt={selectedUser.display_name} /> : <div className="drawer-avatar avatar-fallback">👤</div>}
                    <h2>{selectedUser.display_name} 的详细档案</h2>
                    <span className="badge-id">{selectedUser.id}</span>
                  </div>

                  <div className="drawer-section">
                    <h3>账户核心指标</h3>
                    <div className="metric-row">
                      <div className="mini-card">
                        <span>登录频率</span>
                        <strong>{selectedUser.last_login_at ? '已登录' : '暂无登录记录'}</strong>
                      </div>
                      <div className="mini-card">
                        <span>认证提供商</span>
                        <strong>{selectedUser.provider || 'phone'}</strong>
                      </div>
                      <div className="mini-card">
                        <span>最后活跃时间</span>
                        <span>{selectedUser.last_login_at ? new Date(selectedUser.last_login_at).toLocaleString() : '-'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="drawer-section">
                    <h3>🏠 名下绑定智能设备</h3>
                    {filteredDevices.filter(d => d.owner_user_id === selectedUser.id).length === 0 ? (
                      <p className="muted-text">该用户名下暂未绑定智能设备。</p>
                    ) : (
                      <div className="device-mini-list">
                        {filteredDevices.filter(d => d.owner_user_id === selectedUser.id).map(dev => (
                          <div className="device-mini-item" key={dev.id} onClick={() => {
                            setSelectedDevice(dev);
                            setActiveTab('devices');
                            setSelectedUser(null);
                          }}>
                            <strong>{dev.device_name}</strong>
                            <span>类型: {dev.product_type} | 状态: {dev.status} (点击诊断)</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="drawer-section">
                    <h3>🛍️ 商城消费与首选项</h3>
                    <div className="purchase-preferences">
                      <p><strong>已支付交易总额:</strong> {currentRegionConfig.symbol}{(filteredOrders.filter(o => o.user_id === selectedUser.id && o.payment_status === 'success').reduce((sum, o) => sum + o.total_cents, 0) / 100).toFixed(2)}</p>
                      <p><strong>默认收货地址:</strong> 未接入正式地址表</p>
                      <p><strong>偏好食材类型:</strong> 暂无正式偏好数据</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* 2. 宠物档案模块 */}
        {activeTab === 'pets' && (
          <section className="module-section">
            <div className="table-header">
              <h3>爱宠健康档案</h3>
              <p>
                数据源：{petSource}
                {petError ? ` 当前为离线回退，不能代表正式数据库：${petError}` : ' 支持过敏原审核与医生营养备注查阅'}
              </p>
            </div>

            <div className="grid-list">
              {filteredPets.map(pet => {
                const ownerName = pet.owner_display_name || pet.owner_primary_phone || pet.owner_user_id;
                return (
                  <article key={pet.id} className="pet-card">
                    <div className="pet-card-main">
                      {pet.avatar_url ? (
                        <img className="pet-avatar" src={pet.avatar_url} alt={pet.name} />
                      ) : (
                        <div className="pet-avatar avatar-fallback">{pet.species === 'cat' ? '🐱' : '🐶'}</div>
                      )}
                      <div className="pet-info">
                        <h4>{pet.name} <span className="species-icon">{pet.species === 'dog' ? '🐶' : '🐱'}</span></h4>
                        <p>{pet.breed} | {pet.age_months} 个月</p>
                        <p><strong>主人:</strong> {ownerName}</p>
                      </div>
                    </div>

                    <div className="pet-health-details">
                      <div className="pet-detail-grid">
                        <DetailRow label="Pet ID" value={pet.id} />
                        <DetailRow label="Household ID" value={pet.household_id} />
                        <DetailRow label="Owner User ID" value={pet.owner_user_id} />
                        <DetailRow label="物种" value={fmt(pet.species)} />
                        <DetailRow label="性别" value={fmt(pet.sex)} />
                        <DetailRow label="已绝育" value={fmt(pet.neutered)} />
                        <DetailRow label="出生日期" value={fmtDate(pet.birth_date)} />
                        <DetailRow label="月龄" value={fmt(pet.age_months)} />
                        <DetailRow label="当前体重 kg" value={fmt(pet.current_weight_kg)} />
                        <DetailRow label="目标体重 kg" value={fmt(pet.target_weight_kg)} />
                        <DetailRow label="BCS 评分" value={fmt(pet.body_condition_score)} />
                        <DetailRow label="活动水平" value={fmt(pet.activity_level)} />
                        <DetailRow label="生命阶段" value={fmt(pet.life_stage)} />
                        <DetailRow label="喂养目标" value={fmt(pet.feeding_goal)} />
                        <DetailRow label="体型" value={fmt(pet.body_size)} />
                        <DetailRow label="喂养环境" value={fmt(pet.environment)} />
                        <DetailRow label="过敏程度" value={fmt(pet.allergy_severity)} />
                        <DetailRow label="特殊时期" value={fmt(pet.special_period)} />
                        <DetailRow label="创建时间" value={fmtDate(pet.created_at)} />
                        <DetailRow label="更新时间" value={fmtDate(pet.updated_at)} />
                      </div>

                      <div className="allergen-pill-group">
                        <span>过敏原:</span>
                        {pet.allergens.length === 0 ? <span className="pill green">无已知过敏原</span> : 
                          pet.allergens.map(a => <span key={a} className="pill red">{a}</span>)}
                      </div>
                      <div className="allergen-pill-group">
                        <span>食物限制:</span>
                        {pet.food_restrictions.length === 0 ? <span className="pill green">无</span> :
                          pet.food_restrictions.map(a => <span key={a} className="pill red">{a}</span>)}
                      </div>
                      <div className="health-tag-group">
                        <span>调理标签:</span>
                        {pet.health_tags.length === 0 ? <span className="pill green">无</span> :
                          pet.health_tags.map(t => <span key={t} className="pill orange">{t}</span>)}
                      </div>
                      <div className="health-tag-group">
                        <span>过敏表现:</span>
                        {pet.allergy_symptoms.length === 0 ? <span className="pill green">无</span> :
                          pet.allergy_symptoms.map(t => <span key={t} className="pill orange">{t}</span>)}
                      </div>
                    </div>

                    <div className="doctor-memo">
                      <h5>🩺 兽医专科调理意见</h5>
                      <p>{pet.doctor_notes || '暂无专属医生诊断笔记。'}</p>
                      <h5>📝 用户备注</h5>
                      <p>{pet.user_notes || '暂无用户备注。'}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* 3. 设备管理模块 */}
        {activeTab === 'devices' && (
          <section className="module-section">
            <div className="table-header">
              <h3>绑定设备一览与遥测监控</h3>
              <p>
                数据源：{deviceSource}
                {deviceError ? ` 设备加载失败：${deviceError}` : ' 读取真实账号绑定设备'}
              </p>
            </div>

            <div className="grid-list">
              {filteredDevices.length === 0 ? <p className="muted-text">暂无真实绑定设备。</p> : filteredDevices.map(dev => (
                <article key={dev.id} className="device-card cursor-pointer" onClick={() => setSelectedDevice(dev)}>
                  <div className="dev-header">
                    <div>
                      <h4>{dev.device_name}</h4>
                      <span className="badge-id">{dev.id}</span>
                      <span className="device-mac">MAC：{dev.mac_address || '未上报'}</span>
                    </div>
                    <span className={`dev-status ${dev.telemetry?.online === true ? 'online' : dev.telemetry?.online === false ? 'offline' : 'unknown'}`}>
                      {dev.telemetry?.online === true ? '在线' : dev.telemetry?.online === false ? '离线' : '状态未知'}
                    </span>
                  </div>

                  <div className="dev-meta">
                    <p><strong>硬件品类:</strong> 
                      <span className="type-badge">
                        {dev.product_type === 'pet_chef' ? '🍲 鲜食大师机' : 
                         dev.product_type === 'smart_litter_box' ? '🐈 净味猫砂盆' : 
                         dev.product_type === 'smart_feeder' ? '🍗 智能喂食器' : 
                         dev.product_type === 'smart_water_fountain' ? '💧 智能喂水器' : 
                         '📍 智能定位防丢器'}
                      </span>
                    </p>
                    <p><strong>固件版本:</strong> {dev.firmware_version || '未知'}</p>
                    <p><strong>最近上报时间:</strong> {new Date(dev.last_online_at).toLocaleString()}</p>
                  </div>

                  <div className="dev-telemetry-preview">
                    <h5>实时监测遥测 DP 指标：</h5>
                    {dev.product_type === 'pet_chef' && (
                      <div className="telemetry-grid">
                        <div>温度: <strong>{dev.telemetry.current_temp}</strong></div>
                        <div>搅拌转速: <strong>{dev.telemetry.motor_speed}</strong></div>
                        <div>出水箱: <strong>{dev.telemetry.water_tank_level}</strong></div>
                        <div>称重: <strong>{dev.telemetry.scale_weight}</strong></div>
                      </div>
                    )}
                    {dev.product_type === 'smart_litter_box' && (
                      <div className="telemetry-grid">
                        <div>猫猫体重: <strong>{dev.telemetry.pet_weight}</strong></div>
                        <div>今日如厕: <strong>{dev.telemetry.usage_count_today}次</strong></div>
                        <div>除臭液: <strong>{dev.telemetry.deodorizer_status}</strong></div>
                      </div>
                    )}
                    {dev.product_type === 'smart_feeder' && (
                      <div className="telemetry-grid">
                        <div>储粮剩余: <strong>{dev.telemetry.food_tank_level}</strong></div>
                        <div>今日投喂: <strong>{dev.telemetry.dispense_success_today}次</strong></div>
                      </div>
                    )}
                    {dev.product_type === 'smart_water_fountain' && (
                      <div className="telemetry-grid">
                        <div>温度: <strong>{dev.telemetry.water_temp}</strong></div>
                        <div>滤芯寿命: <strong>{dev.telemetry.filter_life_pct}</strong></div>
                        <div>状态: <strong style={{ color: 'red' }}>干烧警戒</strong></div>
                      </div>
                    )}
                    {dev.product_type === 'smart_tracker' && (
                      <div className="telemetry-grid">
                        <div>定位: <strong>{dev.telemetry.gps_lat_lng.split('(')[0]}</strong></div>
                        <div>今日运动: <strong>{dev.telemetry.step_count_today}步</strong></div>
                        <div>电量: <strong>{dev.telemetry.battery_pct}</strong></div>
                      </div>
                    )}
                  </div>
                  <div className="card-footer">
                    <span>点击进入深度远程控制与调试面板</span>
                  </div>
                </article>
              ))}
            </div>

            {/* 设备实时控制台模态窗 */}
            {selectedDevice && (
              <div className="modal-overlay" onClick={() => setSelectedDevice(null)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <header className="modal-header">
                    <h3>🛠️ 涂鸦远程设备调测控制台</h3>
                    <button className="close-btn" onClick={() => setSelectedDevice(null)}>✕</button>
                  </header>
                  <div className="modal-body">
                    <div className="device-diag-title">
                      <h4>{selectedDevice.device_name}</h4>
                      <p>Tuya ID: <code>{selectedDevice.tuya_device_id}</code> | PID: <code>{selectedDevice.tuya_pid}</code></p>
                    </div>

                    <div className="diag-layout">
                      <div className="diag-column">
                        <h5>远程测试动作</h5>
                        <div className="btn-stack">
                          {selectedDevice.product_type === 'pet_chef' && (
                            <>
                              <button className="action-btn" onClick={() => alert('启动设备加热模拟指令已发送')}>🔥 下发 85°C 加热烹饪</button>
                              <button className="action-btn" onClick={() => alert('水泵自清洗指令已下发')}>🚿 加水出料自清洁</button>
                            </>
                          )}
                          {selectedDevice.product_type === 'smart_litter_box' && (
                            <button className="action-btn" onClick={() => alert('正在下发清理滚筒复位指令')}>🔄 下发滚筒回零复位</button>
                          )}
                          {selectedDevice.product_type === 'smart_feeder' && (
                            <button className="action-btn" onClick={() => alert('远程手动出粮 50g 指令已发送')}>🍖 手动出粮 50g</button>
                          )}
                          {selectedDevice.product_type === 'smart_water_fountain' && (
                            <button className="action-btn" onClick={() => alert('水泵滤芯更换重置成功')}>♻️ 滤芯寿命计数重置</button>
                          )}
                          {selectedDevice.product_type === 'smart_tracker' && (
                            <button className="action-btn" onClick={() => alert('高精度 GPS 实时唤醒定位指令已发送')}>📍 实时高频寻宠定位</button>
                          )}
                          <button className="action-btn danger" onClick={() => alert('强制重启设备指令已下发')}>🔌 强制远程复位重启</button>
                        </div>
                      </div>

                      <div className="diag-column">
                        <h5>设备状态快照表 (Tuya DPs)</h5>
                        <table className="telemetry-table">
                          <thead>
                            <tr>
                              <th>DP 键</th>
                              <th>遥测描述</th>
                              <th>上报数值</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(selectedDevice.telemetry).map(([key, val]) => (
                              <tr key={key}>
                                <td><code>{key}</code></td>
                                <td>{key === 'online' ? '通信状态' : key === 'error_code' ? '故障自检码' : '传感器上报'}</td>
                                <td><strong style={{ color: val.toString().includes('E') ? 'red' : 'inherit' }}>{val.toString()}</strong></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* 4. 食谱管理模块 */}
        {activeTab === 'recipes' && (
          <section className="module-section">
            <div className="table-header">
              <div>
                <h3>定制食谱配方目录</h3>
                <p>
                  正式表 recipes：{recipes.length} 个 · 数据源：{recipeSource}
                  {recipeSource !== 'pg' && <span className="inline-warning"> 当前数据库加载失败，不能保存正式数据库</span>}
                </p>
                {recipeError && <p className="inline-error">{recipeError}</p>}
              </div>
              <div className="table-actions">
                <label className="recipe-search-box">
                  <span>检索</span>
                  <input
                    value={recipeSearch}
                    onChange={e => setRecipeSearch(e.target.value)}
                    placeholder="食谱名字 / 分类 / 健康标签 / 生命阶段"
                  />
                  <em>{filteredRecipes.length}/{recipes.length}</em>
                </label>
                <button className="action-btn" onClick={loadRecipes} disabled={recipesLoading}>
                  {recipesLoading ? '加载中...' : '刷新正式食谱'}
                </button>
                <button className="action-btn secondary" onClick={addRecipe} disabled={savingRecipe === 'new' || recipeSource !== 'pg'}>
                  {savingRecipe === 'new' ? '新增中...' : '增加食谱'}
                </button>
              </div>
            </div>

            <div className="recipe-table-scroll">
              <div className="recipe-edit-table">
                <div className="recipe-edit-head">
                  <span>食谱照片</span>
                  <span>食谱详情</span>
                  <span>食材配比</span>
                  <span>配套全价营养包B</span>
                  <span>营养成份</span>
                  <span>低温烹饪参数</span>
                </div>

                {filteredRecipes.map(recipe => {
                  const draft = recipeDrafts[recipe.id] || toRecipeDraft(recipe);
                  const isDirty = isRecipeDraftDirty(recipe, draft);
                  const imageUrl = resolveRecipeImage(draft.img);
                  const ingredientTotal = sumRows(draft.ingredientsRows);
                  const bPackTotal = sumRows(draft.bPackRows);
                  const rowError = recipeRowErrors[recipe.id];
                return (
                  <article key={recipe.id} className="recipe-edit-row">
                    <div className="recipe-photo-cell">
                      {imageUrl ? (
                        <img src={imageUrl} alt={draft.name || recipe.id} />
                      ) : (
                        <div className="recipe-image-placeholder">无图片</div>
                      )}
                      <label className="small-action-btn upload-btn">
                        {uploadingRecipeId === recipe.id ? '上传中...' : '上传新图片'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          disabled={uploadingRecipeId === recipe.id || recipeSource !== 'pg'}
                          onChange={e => uploadRecipeImage(recipe, e.target.files?.[0])}
                        />
                      </label>
                      <button type="button" className={`action-btn recipe-photo-save ${isDirty ? 'unsaved' : ''}`} disabled={savingRecipe === recipe.id || recipeSource !== 'pg'} onClick={() => saveRecipeRow(recipe)}>
                        {savingRecipe === recipe.id ? '保存中...' : isDirty ? '请点击保存' : '已保存'}
                      </button>
                      {rowError && <p className="inline-error">{rowError}</p>}
                    </div>

                    <div className="recipe-detail-cell">
                      <span>recipe_id</span><code>{recipe.id}</code>
                      <label><span>食谱名字</span><input value={draft.name} onChange={e => updateRecipeDraft(recipe.id, { name: e.target.value })} /></label>
                      <label>
                        <span>食谱状态</span>
                        <select value={draft.status} onChange={e => updateRecipeDraft(recipe.id, { status: e.target.value })}>
                          {STATUS_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                      <label>
                        <span>食谱分类</span>
                        <select value={draft.category} onChange={e => updateRecipeDraft(recipe.id, { category: e.target.value })}>
                          {CATEGORY_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </label>
                      <label>
                        <span>生命阶段</span>
                        <select value={draft.life_stage} onChange={e => updateRecipeDraft(recipe.id, { life_stage: e.target.value })}>
                          {LIFE_STAGE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </label>
                      <label><span>健康标签</span><input value={draft.health_tags} onChange={e => updateRecipeDraft(recipe.id, { health_tags: e.target.value })} placeholder="美毛、低敏" /></label>
                    </div>

                    <div className="recipe-list-cell">
                      <div className={Math.abs(ingredientTotal - 100) > 0.01 ? 'ratio-total error' : 'ratio-total'}>合计 {ingredientTotal.toFixed(1)}%</div>
                      {draft.ingredientsRows.map((row, index) => (
                        <div className="ratio-row" key={`${recipe.id}-ingredient-${index}`}>
                          <input value={row.name} onChange={e => updateRecipeRow(recipe.id, 'ingredientsRows', index, 'name', e.target.value)} placeholder="食材名" />
                          <input type="number" step="0.1" value={row.percent} onChange={e => updateRecipeRow(recipe.id, 'ingredientsRows', index, 'percent', e.target.value)} placeholder="%" />
                          <button type="button" onClick={() => removeRecipeRow(recipe.id, 'ingredientsRows', index)}>−</button>
                        </div>
                      ))}
                      <button type="button" className="small-action-btn" onClick={() => addRecipeRow(recipe.id, 'ingredientsRows')}>增加一行</button>
                    </div>

                    <div className="recipe-list-cell">
                      <div className={Math.abs(bPackTotal - 10) > 0.01 ? 'ratio-total error' : 'ratio-total'}>合计 {bPackTotal.toFixed(1)}%</div>
                      {draft.bPackRows.map((row, index) => (
                        <div className="ratio-row" key={`${recipe.id}-bpack-${index}`}>
                          <input value={row.name} onChange={e => updateRecipeRow(recipe.id, 'bPackRows', index, 'name', e.target.value)} placeholder="营养素名称" />
                          <input type="number" step="0.1" value={row.percent} onChange={e => updateRecipeRow(recipe.id, 'bPackRows', index, 'percent', e.target.value)} placeholder="%" />
                          <button type="button" onClick={() => removeRecipeRow(recipe.id, 'bPackRows', index)}>−</button>
                        </div>
                      ))}
                      <button type="button" className="small-action-btn" onClick={() => addRecipeRow(recipe.id, 'bPackRows')}>增加一行</button>
                    </div>

                    <div className="recipe-nutrition-cell">
                      {NUTRITION_FIELDS.map(([key, label, unit]) => (
                        <label key={key}>
                          <span>{label}</span>
                          <input value={draft.nutritionFields[key]} onChange={e => updateRecipeDraft(recipe.id, current => ({
                            ...current,
                            nutritionFields: { ...current.nutritionFields, [key]: e.target.value },
                          }))} />
                          <em>{unit}</em>
                        </label>
                      ))}
                    </div>

                    <div className="recipe-cooking-cell">
                      <label>
                        <span>主蛋白食材：</span>
                        <select value={draft.cookingParams.protein_group} onChange={e => updateRecipeDraft(recipe.id, current => ({
                          ...current,
                          cookingParams: { ...current.cookingParams, protein_group: e.target.value },
                        }))}>
                          {PROTEIN_GROUP_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                      <label>
                        <span>烹饪温度：</span>
                        <div className="unit-input"><input value={draft.cookingParams.temperature} onChange={e => updateRecipeDraft(recipe.id, current => ({
                          ...current,
                          cookingParams: { ...current.cookingParams, temperature: e.target.value },
                        }))} /><em>℃</em></div>
                      </label>
                      <label>
                        <span>烹饪功率：</span>
                        <select value={draft.cookingParams.powerWatts} onChange={e => updateRecipeDraft(recipe.id, current => ({
                          ...current,
                          cookingParams: { ...current.cookingParams, powerWatts: e.target.value },
                        }))}>
                          {POWER_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                      <label>
                        <span>烹饪转速：</span>
                        <select value={draft.cookingParams.speed} onChange={e => updateRecipeDraft(recipe.id, current => ({
                          ...current,
                          cookingParams: { ...current.cookingParams, speed: e.target.value },
                        }))}>
                          {SPEED_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                      <label>
                        <span>建议加水比例：</span>
                        <select value={draft.cookingParams.waterRatioPercent} onChange={e => updateRecipeDraft(recipe.id, current => ({
                          ...current,
                          cookingParams: { ...current.cookingParams, waterRatioPercent: e.target.value },
                        }))}>
                          {WATER_RATIO_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                      <label>
                        <span>预热时长：</span>
                        <div className="unit-input"><input type="number" min="0" step="0.5" value={draft.cookingParams.preheatMinutes} onChange={e => updateRecipeDraft(recipe.id, current => ({
                          ...current,
                          cookingParams: { ...current.cookingParams, preheatMinutes: e.target.value },
                        }))} /><em>分钟</em></div>
                      </label>
                      <label>
                        <span>烹饪时长：</span>
                        <div className="unit-input"><input type="number" min="0" step="0.5" value={draft.cookingParams.cookMinutes} onChange={e => updateRecipeDraft(recipe.id, current => ({
                          ...current,
                          cookingParams: { ...current.cookingParams, cookMinutes: e.target.value },
                        }))} /><em>分钟</em></div>
                      </label>
                      <label>
                        <span>食材包克重：</span>
                        <select value={draft.cookingParams.packageWeightGrams} onChange={e => updateRecipeDraft(recipe.id, current => ({
                          ...current,
                          cookingParams: { ...current.cookingParams, packageWeightGrams: e.target.value },
                        }))}>
                          {PACKAGE_WEIGHT_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                      </label>
                      <label>
                        <span>烹饪口感：</span>
                        <select value={draft.cookingParams.textureProfile} onChange={e => updateRecipeDraft(recipe.id, current => ({
                          ...current,
                          cookingParams: { ...current.cookingParams, textureProfile: e.target.value },
                        }))}>
                          {TEXTURE_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </label>
                    </div>
                  </article>
                );
              })}
              </div>
            </div>
          </section>
        )}

        {/* 5. 商品与商城溯源管理模块 */}
        {activeTab === 'products' && (
          <section className="module-section">
            <div className="table-header">
              <h3>商品物料与食材溯源库</h3>
              <p>支持查看食材原料源头、生产/消费全链条节点，以及过敏与过期安全锁</p>
            </div>

            <div className="grid-list">
              {filteredProducts.map(prod => (
                <article key={prod.id} className="product-card cursor-pointer" onClick={() => setSelectedProduct(prod)}>
                  <div className="prod-header-row">
                    <h4>{prod.name}</h4>
                    <span className="prod-cat">{prod.category}</span>
                  </div>
                  <p className="prod-desc">{prod.description}</p>
                  
                  <div className="prod-sku-box">
                    {prod.skus.map(sku => (
                      <div className="sku-item" key={sku.id}>
                        <span>规格: {sku.spec} | 条码: <code>{sku.sku_code}</code></span>
                        <strong>售价: {currentRegionConfig.symbol}{(sku.price_cents / 100).toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>

                  {prod.category === '鲜食料包' && prod.traceability && (
                    <div className="allergen-warning-box">
                      <span>过敏原声明：</span>
                      {prod.allergen_ingredients.map(a => <span key={a} className="allergen-tag">{a}</span>)}
                    </div>
                  )}

                  {prod.category === '鲜食料包' && prod.traceability && prod.traceability.is_expired && (
                    <div className="alert-banner-red">
                      ⚠️ 检测该批次在出厂30天后已过期。已激活设备锁，鲜食机拒绝加工烹饪！
                    </div>
                  )}

                  <div className="card-footer">
                    <span>点击查看食材生命周期全链条溯源及安全控制</span>
                  </div>
                </article>
              ))}
            </div>

            {/* 食材包溯源详情弹出框 */}
            {selectedProduct && selectedProduct.traceability && (
              <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
                <div className="modal-content max-width-600" onClick={e => e.stopPropagation()}>
                  <header className="modal-header">
                    <h3>📦 鲜食包生产流通全链条追溯系统</h3>
                    <button className="close-btn" onClick={() => setSelectedProduct(null)}>✕</button>
                  </header>
                  <div className="modal-body">
                    <div className="trace-info-title">
                      <h4>{selectedProduct.name}</h4>
                      <p>追溯批号: <code>{selectedProduct.traceability.batch_no}</code></p>
                    </div>

                    <div className="trace-section">
                      <h5>1. 原料原产地与工厂</h5>
                      <p><strong>原材料采摘/养殖基地:</strong> {selectedProduct.traceability.raw_material_origin}</p>
                      <p><strong>深加工装配工厂:</strong> {selectedProduct.traceability.factory_location}</p>
                    </div>

                    <div className="trace-section">
                      <h5>2. 全生命周期时序节点时间线</h5>
                      <div className="trace-timeline-vertical">
                        <div className="timeline-step done">
                          <span className="dot"></span>
                          <div>
                            <strong>1. 生产出厂</strong>
                            <p>{new Date(selectedProduct.traceability.manufactured_at).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="timeline-step done">
                          <span className="dot"></span>
                          <div>
                            <strong>2. 商城上架</strong>
                            <p>{new Date(selectedProduct.traceability.listed_at).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="timeline-step done">
                          <span className="dot"></span>
                          <div>
                            <strong>3. 订单发货</strong>
                            <p>{new Date(selectedProduct.traceability.shipped_at).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="timeline-step done">
                          <span className="dot"></span>
                          <div>
                            <strong>4. 客户签收</strong>
                            <p>{new Date(selectedProduct.traceability.received_at).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className={`timeline-step ${selectedProduct.traceability.consumed_at ? 'done' : 'pending'}`}>
                          <span className="dot"></span>
                          <div>
                            <strong>5. 鲜食烹饪消耗</strong>
                            <p>{selectedProduct.traceability.consumed_at ? new Date(selectedProduct.traceability.consumed_at).toLocaleString() : '尚未消耗烹饪'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="trace-section border-top">
                      <h5>3. 设备级安全控制 (过期与过敏拦截)</h5>
                      <div className="safety-locks">
                        <p><strong>保质期截至时间:</strong> <span style={{ color: selectedProduct.traceability.is_expired ? 'red' : 'green', fontWeight: 'bold' }}>{new Date(selectedProduct.traceability.expired_at).toLocaleDateString()} ({selectedProduct.traceability.is_expired ? '已过期' : '保质期内'})</span></p>
                        
                        {selectedProduct.traceability.is_expired ? (
                          <div className="danger-alert-box">
                            <strong>🚫 智能鲜食机强制拒绝烹饪锁定 (ACTIVE)</strong>
                            <p>本品包含 RFID 条码在扫码录入时，由于超过过期时限，下位机核心主板拒绝接受启动加热参数，自动顶出料包，保证宠物安全！</p>
                          </div>
                        ) : (
                          <div className="success-alert-box">
                            <strong>✅ 智能鲜食机安全通行中 (PASS)</strong>
                            <p>保质期内食材，可正常拉取工艺曲线启动烹饪。</p>
                          </div>
                        )}

                        <div className="allergen-test-run">
                          <strong>过敏原交叉比对模拟：</strong>
                          <p>若用户给患有 <strong>[鸭肉]</strong> 过敏的宠物 <strong>(麦芬)</strong> 扫码加工本包：</p>
                          <div className="danger-alert-box-mini">
                            🚨 警报：检测到食材过敏成分 [鸭肉] 与爱宠过敏原匹配！App 将弹出橙色过敏吞咽警告。
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* 6. 订单及网关流水模块 */}
        {activeTab === 'orders' && (
          <section className="module-section">
            <div className="table-header">
              <h3>订单支付与对账流水表</h3>
              <p>查阅微信、支付宝、Stripe、PayPal 网关交易详情</p>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>订单交易 ID</th>
                  <th>购买者ID</th>
                  <th>付款金额</th>
                  <th>支付网关</th>
                  <th>第三方交易流水号</th>
                  <th>下单时间</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => (
                  <tr key={order.id}>
                    <td><code>{order.id}</code></td>
                    <td>{order.user_id}</td>
                    <td>{currentRegionConfig.symbol}{(order.total_cents / 100).toFixed(2)}</td>
                    <td><span className="gateway-badge">{order.payment.provider.toUpperCase()}</span></td>
                    <td><code>{order.payment.provider_payment_id || '未产生网关单号'}</code></td>
                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                    <td>
                      <span className={`status-tag ${order.status}`}>
                        {order.status === 'paid' ? '已支付' : order.status === 'shipped' ? '已发货' : '待付款'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* 7. 医疗资料模块 */}
        {activeTab === 'medical' && (
          <section className="module-section">
            <div className="table-header">
              <h3>对接合作医院病历记录 (ID 双重对照对照)</h3>
              <p>为了打通异构宠物医院系统，本页提供平台健康 SN 与医院病例号的完整映射</p>
            </div>

            <div className="grid-list">
              {filteredMedical.map(rec => (
                <article key={rec.id} className="medical-card-v2 cursor-pointer" onClick={() => setSelectedMedical(rec)}>
                  <div className="med-header">
                    <div>
                      <h4>{rec.pet_name}</h4>
                      <p className="med-sn">平台流水 SN: <strong>{rec.id}</strong></p>
                    </div>
                    <span className="record-type-badge">{rec.record_type}</span>
                  </div>

                  <div className="hospital-id-compare">
                    <h5>🏥 合作医院系统对照 ID：</h5>
                    <div className="compare-grid">
                      <div>医院名: <strong>{rec.clinic_name}</strong></div>
                      <div>医院登记ID: <code>{rec.hospital_id}</code></div>
                      <div>病宠医院ID: <code>{rec.hospital_pet_id}</code></div>
                      <div><strong>就诊病历单号: <code>{rec.hospital_case_no}</code></strong></div>
                    </div>
                  </div>

                  <div className="med-summary-box">
                    <p><strong>诊断摘要:</strong> {rec.summary}</p>
                  </div>
                  <div className="card-footer">
                    <span>点击查阅原始处方及化验单附件档案</span>
                  </div>
                </article>
              ))}
            </div>

            {/* 病历附件模态框 */}
            {selectedMedical && (
              <div className="modal-overlay" onClick={() => setSelectedMedical(null)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <header className="modal-header">
                    <h3>🏥 宠物医疗处方与原始病历附件</h3>
                    <button className="close-btn" onClick={() => setSelectedMedical(null)}>✕</button>
                  </header>
                  <div className="modal-body">
                    <h4>{selectedMedical.pet_name} - {selectedMedical.record_type}</h4>
                    <p>就诊医生: {selectedMedical.vet_name} | 就诊时间: {new Date(selectedMedical.occurred_at).toLocaleString()}</p>
                    
                    <div className="diag-section border-top">
                      <h5>病历诊断主诉：</h5>
                      <p className="summary-text">{selectedMedical.summary}</p>
                    </div>

                    <div className="diag-section">
                      <h5>医院对接对比核验：</h5>
                      <p><strong>医院病历单号 (Hospital Case No):</strong> <code>{selectedMedical.hospital_case_no}</code></p>
                      <p><strong>统一健康档案序列号 (Platform SN):</strong> <code>{selectedMedical.id}</code></p>
                      <p className="success-text">✅ 数据已在 {currentRegionConfig.name} 服务器与合作宠物医院网关核对无误，两端病历一致。</p>
                    </div>

                    <div className="attachments-list">
                      <h5>原始病历/化验/影像附件：</h5>
                      {selectedMedical.attachments.map(att => (
                        <a key={att.name} href="#download" onClick={(e) => { e.preventDefault(); alert(`模拟下载病历附件: ${att.name}`); }} className="attachment-item">
                          <span>📄 {att.name}</span>
                          <span className="download-icon">⬇️ 下载</span>
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* 8. 医生审核及动态处方药维护模块 */}
        {activeTab === 'doctors' && (
          <section className="module-section">
            <div className="table-header">
              <h3>兽医资质审核与处方药品管理</h3>
              <p>维护平台医生申请流，并随时配置/更新处方以及处方限制关联药品库</p>
            </div>

            <div className="doctor-management-split">
              {/* 左侧：医生资质审核队列 */}
              <div className="left-pane">
                <h4>兽医入驻执照审核队列</h4>
                <div className="doctor-queue">
                  {doctors.map(doc => (
                    <div className="doctor-review-card" key={doc.id}>
                      <div className="doc-review-header">
                        <h5>{doc.display_name}</h5>
                        <span className={`status-tag ${doc.status}`}>{doc.status === 'approved' ? '审核通过' : doc.status === 'pending' ? '待审核' : '已拒绝'}</span>
                      </div>
                      <p><strong>头衔:</strong> {doc.title}</p>
                      <p><strong>所属医院:</strong> {doc.hospital_name}</p>
                      <p><strong>执业证书号:</strong> {doc.license_no}</p>
                      <p><strong>提交申请时间:</strong> {new Date(doc.created_at).toLocaleDateString()}</p>
                      {doc.reviewed_by && <p className="reviewed-by"><strong>审计人:</strong> {doc.reviewed_by}</p>}
                      {doc.notes && <p className="notes-box"><strong>审核意见:</strong> {doc.notes}</p>}

                      {doc.status === 'pending' && (
                        <div className="action-row-doctor">
                          <button className="approve-btn" onClick={() => handleApproveDoctor(doc.id, 'approved')}>✔️ 审批通过</button>
                          <button className="reject-btn" onClick={() => {
                            const reason = prompt('请输入拒绝原因：');
                            if (reason) {
                              setDoctors(doctors.map(d => d.id === doc.id ? { ...d, status: 'rejected', notes: reason } : d));
                            }
                          }}>✕ 拒绝入驻</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* 右侧：动态处方药品更新面板 */}
              <div className="right-pane">
                <h4>💊 平台处方药品维护中心</h4>
                <div className="add-medicine-form">
                  <h5>添加新药品/处方定义：</h5>
                  <form onSubmit={handleAddMedicine} className="inline-form">
                    <input
                      type="text"
                      placeholder="药品名称 (如：益生菌颗粒)"
                      value={newMedName}
                      onChange={e => setNewMedName(e.target.value)}
                      required
                    />
                    <input
                      type="text"
                      placeholder="主要成分 (如：双歧杆菌)"
                      value={newMedIngredient}
                      onChange={e => setNewMedIngredient(e.target.value)}
                      required
                    />
                    <input
                      type="text"
                      placeholder="对应适应症 (如：急性腹泻)"
                      value={newMedDisorder}
                      onChange={e => setNewMedDisorder(e.target.value)}
                    />
                    <button type="submit" className="action-btn">➕ 新增发布至数据库</button>
                  </form>
                </div>

                <div className="medicine-list-box">
                  <h5>药品清单：</h5>
                  <table className="telemetry-table">
                    <thead>
                      <tr>
                        <th>药品 ID</th>
                        <th>名称</th>
                        <th>有效活性成分</th>
                        <th>适用调理病症</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {medicines.map(med => (
                        <tr key={med.id}>
                          <td><code>{med.id}</code></td>
                          <td><strong>{med.name}</strong></td>
                          <td>{med.ingredient}</td>
                          <td><span className="pill orange">{med.targetDisorder}</span></td>
                          <td>
                            <button className="delete-text-btn" onClick={() => setMedicines(medicines.filter(m => m.id !== med.id))}>删除</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* 9. 故障与运维日志模块 */}
        {activeTab === 'faults' && (
          <section className="module-section">
            <div className="table-header">
              <h3>设备告警与故障诊断日志</h3>
              <p>接收 Tuya IoT 上报的报警事件，为售后和设备研发排查提供完整上下文</p>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>故障 ID</th>
                  <th>设备 ID/SN</th>
                  <th>设备名称</th>
                  <th>设备品类</th>
                  <th>故障代码</th>
                  <th>故障描述</th>
                  <th>故障级别</th>
                  <th>发生时间</th>
                  <th>工单状态</th>
                </tr>
              </thead>
              <tbody>
                {filteredFaults.map(fault => (
                  <tr key={fault.id} className="cursor-pointer" onClick={() => setSelectedFault(fault)}>
                    <td><code>{fault.id}</code></td>
                    <td><code>{fault.device_id}</code></td>
                    <td>{fault.device_name}</td>
                    <td>
                      <span className="type-badge">
                        {fault.product_type === 'pet_chef' ? '鲜食机' : '智能水泉'}
                      </span>
                    </td>
                    <td><strong style={{ color: 'red' }}>{fault.error_code}</strong></td>
                    <td>{fault.error_desc}</td>
                    <td>
                      <span className={`severity-badge ${fault.severity}`}>
                        {fault.severity === 'critical' ? '🔴 严重' : '🟡 警告'}
                      </span>
                    </td>
                    <td>{new Date(fault.occurred_at).toLocaleString()}</td>
                    <td>
                      <span className={`status-tag ${fault.status}`}>
                        {fault.status === 'unresolved' ? '未解决' : fault.status === 'investigating' ? '排查中' : '已解决'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* 故障上下文诊断浮窗 */}
            {selectedFault && (
              <div className="modal-overlay" onClick={() => setSelectedFault(null)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <header className="modal-header">
                    <h3>🚨 硬件故障深度诊断上下文</h3>
                    <button className="close-btn" onClick={() => setSelectedFault(null)}>✕</button>
                  </header>
                  <div className="modal-body">
                    <div className="fault-title">
                      <h4>{selectedFault.device_name} ({selectedFault.error_code})</h4>
                      <p>报警时间: {new Date(selectedFault.occurred_at).toLocaleString()}</p>
                    </div>

                    <div className="diag-section border-top">
                      <h5>故障具体描述：</h5>
                      <p><strong>{selectedFault.error_desc}</strong></p>
                      <p>故障安全状态：
                        <span className={`severity-badge ${selectedFault.severity}`}>
                          {selectedFault.severity === 'critical' ? '平台熔断/需要人工派单' : '警告/已自动推送自查指导'}
                        </span>
                      </p>
                    </div>

                    {selectedFault.cooking_context && (
                      <div className="diag-section">
                        <h5>上报的烹饪阶段环境 (发生时状态)：</h5>
                        <ul className="info-list">
                          {selectedFault.cooking_context.recipe_name && <li>正在加工食谱: <strong>{selectedSelectedRecipe(selectedFault.cooking_context.recipe_name)}</strong></li>}
                          {selectedFault.cooking_context.total_grams && <li>设定食材克数: {selectedFault.cooking_context.total_grams}</li>}
                          {selectedFault.cooking_context.stage_at && <li>报错时所处阶段: {selectedFault.cooking_context.stage_at}</li>}
                          {selectedFault.cooking_context.temp_at && <li>舱门内温度: {selectedFault.cooking_context.temp_at}</li>}
                          {selectedFault.cooking_context.motor_current && <li>马达瞬间电流: <span style={{ color: 'red' }}>{selectedFault.cooking_context.motor_current}</span></li>}
                          {selectedFault.cooking_context.action_taken && <li>设备自动安全决策: <strong>{selectedFault.cooking_context.action_taken}</strong></li>}
                        </ul>
                      </div>
                    )}

                    <div className="diag-section">
                      <h5>工单处理跟踪：</h5>
                      <p>跟进处理人: <code>{selectedFault.assigned_support_id || '未指派'}</code></p>
                      <p><strong>工单处理记录:</strong></p>
                      <textarea
                        className="notes-textarea"
                        defaultValue={selectedFault.notes}
                        onChange={(e) => {
                          selectedFault.notes = e.target.value;
                        }}
                      />
                      <div className="action-row-doctor">
                        <button className="approve-btn" onClick={() => {
                          selectedFault.status = 'resolved';
                          alert('工单状态已变更为: Resolved (已解决)');
                          setSelectedFault(null);
                        }}>✔️ 设为已解决并结单</button>
                        <button className="reject-btn" onClick={() => {
                          selectedFault.status = 'investigating';
                          alert('工单状态已变更为: Investigating (排查中)');
                          setSelectedFault(null);
                        }}>🔍 派发至售后小组排查</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* 10. 子管理员管理模块 */}
        {activeTab === 'subadmins' && (
          <section className="module-section">
            <div className="table-header">
              <div>
                <h3>子管理员管理</h3>
                <p>由主管理员设置区域分类和板块分类授权，子管理员最终权限由两类勾选项共同决定。</p>
                {subadminError && <p className="inline-error">{subadminError}</p>}
              </div>
              <div className="table-actions">
                <button className="action-btn" type="button" onClick={addSubadminDraft}>新增子管理员</button>
              </div>
            </div>

            <div className="subadmin-table">
              <div className="subadmin-head">
                <span>子管理员帐号</span>
                <span>子管理员密码</span>
                <span>区域分类授权</span>
                <span>板块分类授权</span>
                <span>保存</span>
              </div>
              {subadmins.length === 0 && <div className="empty-row">暂无子管理员，点击“新增子管理员”创建。</div>}
              {subadmins.map(account => {
                const key = account.username;
                const draft = subadminDrafts[key] || toSubadminDraft(account);
                const isDirty = account.isNew || isSubadminDraftDirty(account, draft);
                return (
                  <article className="subadmin-row" key={key}>
                    <div className="subadmin-account-cell">
                      <input
                        value={draft.username}
                        disabled={!account.isNew}
                        onChange={e => updateSubadminDraft(key, { username: e.target.value })}
                        placeholder="例如：operator_cn"
                      />
                    </div>
                    <div className="password-cell">
                      <input
                        type={visiblePasswords[key] ? 'text' : 'password'}
                        value={draft.password}
                        onChange={e => updateSubadminDraft(key, { password: e.target.value })}
                        placeholder="设置初始密码"
                      />
                      <button type="button" onClick={() => setVisiblePasswords(prev => ({ ...prev, [key]: !prev[key] }))}>
                        {visiblePasswords[key] ? '隐藏' : '显示'}
                      </button>
                    </div>
                    <div className="checkbox-group">
                      {REGIONS.map(region => (
                        <label key={region.code}>
                          <input
                            type="checkbox"
                            checked={draft.regions.includes(region.code)}
                            onChange={() => toggleSubadminListValue(key, 'regions', region.code)}
                          />
                          <span>{region.name} ({region.code})</span>
                        </label>
                      ))}
                    </div>
                    <div className="checkbox-group module-checkboxes">
                      {ADMIN_MODULES.filter(module => module.key !== 'subadmins').map(module => (
                        <label key={module.key}>
                          <input
                            type="checkbox"
                            checked={draft.modules.includes(module.key)}
                            onChange={() => toggleSubadminListValue(key, 'modules', module.key)}
                          />
                          <span>{module.label}</span>
                        </label>
                      ))}
                    </div>
                    <div className="subadmin-save-cell">
                      <button
                        className={`action-btn ${isDirty ? 'unsaved' : ''}`}
                        type="button"
                        disabled={savingSubadmin === key}
                        onClick={() => saveSubadminRow(account)}
                      >
                        {savingSubadmin === key ? '保存中...' : isDirty ? '未保存' : '保存'}
                      </button>
                      <button
                        className="delete-text-btn"
                        type="button"
                        disabled={savingSubadmin === key}
                        onClick={() => deleteSubadminRow(account)}
                      >
                        删除
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

// 辅助方法，防止食谱名称未匹配
function selectedSelectedRecipe(name) {
  return name || '未识别食谱';
}

export default App;
