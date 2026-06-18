const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataDir = path.resolve(__dirname, '../../.data');
const dataFile = path.join(dataDir, 'heybo-db.json');

const seedProducts = [
  {
    id: 'test_meat_pack_1',
    name: '测试肉包1',
    category: 'meat_pack',
    target_tags: ['protein_pack', 'test_sku'],
    price_cents: 100,
    currency: 'CNY',
    status: 'active',
  },
  {
    id: 'test_meat_pack_2',
    name: '测试肉包2',
    category: 'meat_pack',
    target_tags: ['protein_pack', 'test_sku'],
    price_cents: 100,
    currency: 'CNY',
    status: 'active',
  },
  {
    id: 'test_meat_pack_3',
    name: '测试肉包3',
    category: 'meat_pack',
    target_tags: ['protein_pack', 'test_sku'],
    price_cents: 100,
    currency: 'CNY',
    status: 'active',
  },
  {
    id: 'test_vegetable_pack_1',
    name: '测试菜包1',
    category: 'vegetable_pack',
    target_tags: ['vegetable_pack', 'test_sku'],
    price_cents: 100,
    currency: 'CNY',
    status: 'active',
  },
  {
    id: 'test_vegetable_pack_2',
    name: '测试菜包2',
    category: 'vegetable_pack',
    target_tags: ['vegetable_pack', 'test_sku'],
    price_cents: 100,
    currency: 'CNY',
    status: 'active',
  },
  {
    id: 'test_vegetable_pack_3',
    name: '测试菜包3',
    category: 'vegetable_pack',
    target_tags: ['vegetable_pack', 'test_sku'],
    price_cents: 100,
    currency: 'CNY',
    status: 'active',
  },
  {
    id: 'test_nutrition_pack_1',
    name: '测试营养包1',
    category: 'nutrition_pack',
    target_tags: ['nutrition_pack', 'test_sku'],
    price_cents: 100,
    currency: 'CNY',
    status: 'active',
  },
  {
    id: 'test_nutrition_pack_2',
    name: '测试营养包2',
    category: 'nutrition_pack',
    target_tags: ['nutrition_pack', 'test_sku'],
    price_cents: 100,
    currency: 'CNY',
    status: 'active',
  },
  {
    id: 'test_nutrition_pack_3',
    name: '测试营养包3',
    category: 'nutrition_pack',
    target_tags: ['nutrition_pack', 'test_sku'],
    price_cents: 100,
    currency: 'CNY',
    status: 'active',
  },
  {
    id: 'test_bundle_bone_1',
    name: '组合包1-增强骨骼套餐',
    category: 'bundle',
    target_tags: ['bundle', 'bone_support', 'joint_support', 'test_sku'],
    price_cents: 100,
    currency: 'CNY',
    status: 'active',
  },
  {
    id: 'test_bundle_skin_coat_2',
    name: '组合包2-美毛美肤套餐',
    category: 'bundle',
    target_tags: ['bundle', 'skin_coat', 'omega_support', 'test_sku'],
    price_cents: 100,
    currency: 'CNY',
    status: 'active',
  },
  {
    id: 'test_bundle_sensitive_stomach_3',
    name: '组合包3-肠胃敏感套餐',
    category: 'bundle',
    target_tags: ['bundle', 'sensitive_stomach', 'digestive_support', 'test_sku'],
    price_cents: 100,
    currency: 'CNY',
    status: 'active',
  },
];

const initialDb = {
  seed_version: 3,
  users: [],
  user_identities: [],
  households: [],
  household_members: [],
  tuya_user_mappings: [],
  pets: [],
  devices: [],
  device_pet_bindings: [],
  device_operation_records: [],
  feeding_records: [],
  health_records: [],
  medical_records: [],
  vet_reviews: [],
  products: seedProducts,
  orders: [],
  order_items: [],
  payments: [],
  analytics_events: [],
};

let db = loadDb();

function now() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 18)}`;
}

function normalizeLogin(login) {
  return String(login || '').trim().toLowerCase();
}

function hash(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function loadDb() {
  try {
    if (!fs.existsSync(dataFile)) return structuredClone(initialDb);
    const parsed = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    const merged = { ...structuredClone(initialDb), ...parsed };
    if (!parsed.seed_version || parsed.seed_version < initialDb.seed_version) {
      merged.products = seedProducts;
      merged.seed_version = initialDb.seed_version;
    }
    return merged;
  } catch (error) {
    console.warn('Heybo store fallback to memory:', error.message);
    return structuredClone(initialDb);
  }
}

function saveDb() {
  try {
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(dataFile, JSON.stringify(db, null, 2));
  } catch (error) {
    console.warn('Heybo store save skipped:', error.message);
  }
}

function publicUser(user) {
  if (!user) return null;
  const { deleted_at, ...safeUser } = user;
  return safeUser;
}

function findUserByLogin(login, provider = 'phone') {
  const normalized = normalizeLogin(login);
  const loginHash = hash(normalized);
  const identity = db.user_identities.find(item =>
    item.provider === provider &&
    (item.login_hash === loginHash || item.provider_user_id === normalized)
  );
  if (!identity) return null;
  return db.users.find(user => user.id === identity.user_id) || null;
}

function createUserWithIdentity({ login, provider = 'phone', displayName }) {
  const normalized = normalizeLogin(login);
  const user = {
    id: id('usr'),
    display_name: displayName || (provider === 'phone' ? `用户${normalized.slice(-4)}` : normalized),
    avatar_url: '',
    primary_phone: provider === 'phone' ? normalized : '',
    primary_email: provider === 'email' ? normalized : '',
    country_code: '86',
    region: 'CN',
    language: 'zh',
    timezone: 'Asia/Shanghai',
    status: 'active',
    created_at: now(),
    updated_at: now(),
    last_login_at: now(),
  };

  const identity = {
    id: id('idt'),
    user_id: user.id,
    provider,
    provider_user_id: normalized,
    login_hash: hash(normalized),
    phone_country_code: provider === 'phone' ? '86' : '',
    is_primary: true,
    verified_at: now(),
    created_at: now(),
  };

  db.users.push(user);
  db.user_identities.push(identity);
  ensureDefaultHousehold(user.id);
  ensureTuyaMapping(user.id);
  saveDb();
  return user;
}

function loginOrCreateUser({ login, provider = 'phone', displayName }) {
  let user = findUserByLogin(login, provider);
  if (!user) user = createUserWithIdentity({ login, provider, displayName });
  user.last_login_at = now();
  user.updated_at = now();
  const household = ensureDefaultHousehold(user.id);
  const tuyaMapping = ensureTuyaMapping(user.id);
  saveDb();
  return {
    user: publicUser(user),
    household,
    tuyaMapping,
    token: `dev_${user.id}`,
  };
}

function getUser(userId) {
  return db.users.find(user => user.id === userId && user.status !== 'deleted') || null;
}

function ensureDefaultHousehold(userId) {
  let membership = db.household_members.find(item => item.user_id === userId && item.role === 'owner');
  if (membership) return db.households.find(item => item.id === membership.household_id);

  const household = {
    id: id('hhd'),
    name: '我的家庭',
    owner_user_id: userId,
    region: 'CN',
    address_id: '',
    created_at: now(),
    updated_at: now(),
  };
  membership = {
    id: id('hhm'),
    household_id: household.id,
    user_id: userId,
    role: 'owner',
    status: 'active',
    invited_by: '',
    joined_at: now(),
  };
  db.households.push(household);
  db.household_members.push(membership);
  saveDb();
  return household;
}

function ensureTuyaMapping(userId) {
  let mapping = db.tuya_user_mappings.find(item => item.user_id === userId);
  if (mapping) return mapping;
  mapping = {
    id: id('tym'),
    user_id: userId,
    tuya_uid: `heybo_${userId}`,
    tuya_country_code: '86',
    tuya_region: 'CN',
    tuya_home_ids: [],
    created_at: now(),
    updated_at: now(),
  };
  db.tuya_user_mappings.push(mapping);
  saveDb();
  return mapping;
}

function userOwnsHousehold(userId, householdId) {
  return db.household_members.some(item =>
    item.user_id === userId &&
    item.household_id === householdId &&
    item.status === 'active'
  );
}

function listByHousehold(table, userId, householdId) {
  return db[table].filter(item =>
    item.household_id === householdId &&
    userOwnsHousehold(userId, householdId)
  );
}

function createPet(userId, payload) {
  const household = payload.household_id
    ? db.households.find(item => item.id === payload.household_id)
    : ensureDefaultHousehold(userId);
  if (!household || !userOwnsHousehold(userId, household.id)) throw new Error('Invalid household');

  const pet = {
    id: id('pet'),
    household_id: household.id,
    owner_user_id: userId,
    name: payload.name || '我的爱犬',
    species: payload.species || 'dog',
    breed: payload.breed || '',
    sex: payload.sex || '',
    neutered: Boolean(payload.neutered),
    birth_date: payload.birth_date || '',
    age_months: Number(payload.age_months || 0),
    current_weight_kg: Number(payload.current_weight_kg || payload.weight || 0),
    target_weight_kg: Number(payload.target_weight_kg || 0),
    body_condition_score: payload.body_condition_score || '',
    activity_level: payload.activity_level || 'medium',
    life_stage: payload.life_stage || 'adult',
    allergens: payload.allergens || [],
    food_restrictions: payload.food_restrictions || [],
    health_tags: payload.health_tags || [],
    doctor_notes: payload.doctor_notes || '',
    user_notes: payload.user_notes || '',
    avatar_url: payload.avatar_url || '',
    created_at: now(),
    updated_at: now(),
  };
  db.pets.push(pet);
  saveDb();
  return pet;
}

function updateById(table, idValue, patch) {
  const item = db[table].find(row => row.id === idValue);
  if (!item) return null;
  Object.assign(item, patch, { updated_at: now() });
  saveDb();
  return item;
}

function upsertDevice(userId, payload) {
  const household = payload.household_id
    ? db.households.find(item => item.id === payload.household_id)
    : ensureDefaultHousehold(userId);
  if (!household || !userOwnsHousehold(userId, household.id)) throw new Error('Invalid household');

  let device = db.devices.find(item =>
    item.household_id === household.id &&
    item.tuya_device_id === payload.tuya_device_id
  );

  if (!device) {
    device = {
      id: id('dev'),
      household_id: household.id,
      owner_user_id: userId,
      tuya_device_id: payload.tuya_device_id,
      tuya_home_id: payload.tuya_home_id || '',
      tuya_pid: payload.tuya_pid || payload.productId || '',
      product_type: payload.product_type || 'pet_chef',
      device_name: payload.device_name || payload.name || 'Pet Chef',
      status: payload.status || 'active',
      firmware_version: payload.firmware_version || '',
      bound_at: now(),
      last_online_at: payload.last_online_at || now(),
      created_at: now(),
      updated_at: now(),
    };
    db.devices.push(device);
  } else {
    Object.assign(device, {
      tuya_home_id: payload.tuya_home_id || device.tuya_home_id,
      tuya_pid: payload.tuya_pid || payload.productId || device.tuya_pid,
      device_name: payload.device_name || payload.name || device.device_name,
      status: payload.status || device.status,
      last_online_at: payload.last_online_at || now(),
      updated_at: now(),
    });
  }

  if (Array.isArray(payload.pet_ids)) {
    payload.pet_ids.forEach(petId => bindDevicePet(device.id, petId));
  }

  saveDb();
  return device;
}

function bindDevicePet(deviceId, petId, isDefault = false) {
  if (!db.device_pet_bindings.some(item => item.device_id === deviceId && item.pet_id === petId)) {
    db.device_pet_bindings.push({
      id: id('dpb'),
      device_id: deviceId,
      pet_id: petId,
      is_default: Boolean(isDefault),
      created_at: now(),
    });
  }
}

function createRecord(table, userId, payload) {
  const household = payload.household_id
    ? db.households.find(item => item.id === payload.household_id)
    : ensureDefaultHousehold(userId);
  if (!household || !userOwnsHousehold(userId, household.id)) throw new Error('Invalid household');

  const record = {
    id: id(table.slice(0, 3)),
    user_id: userId,
    household_id: household.id,
    ...payload,
    created_at: now(),
  };
  db[table].push(record);
  saveDb();
  return record;
}

function createOrder(userId, payload) {
  const household = payload.household_id
    ? db.households.find(item => item.id === payload.household_id)
    : ensureDefaultHousehold(userId);
  if (!household || !userOwnsHousehold(userId, household.id)) throw new Error('Invalid household');

  const items = Array.isArray(payload.items) ? payload.items : [];
  const orderItems = items.map(item => {
    const product = db.products.find(p => p.id === item.product_id);
    const quantity = Math.max(1, Number(item.quantity || 1));
    return {
      id: id('ori'),
      product_id: item.product_id,
      product_name: product?.name || item.product_name || item.product_id,
      quantity,
      unit_price_cents: product?.price_cents || Number(item.unit_price_cents || 0),
    };
  });
  const total = orderItems.reduce((sum, item) => sum + item.quantity * item.unit_price_cents, 0);
  const order = {
    id: id('ord'),
    user_id: userId,
    household_id: household.id,
    pet_id: payload.pet_id || '',
    status: 'created',
    total_cents: total,
    currency: 'CNY',
    shipping_address: payload.shipping_address || null,
    payment_status: 'pending',
    created_at: now(),
    updated_at: now(),
  };
  db.orders.push(order);
  orderItems.forEach(item => db.order_items.push({ ...item, order_id: order.id, created_at: now() }));
  saveDb();
  return { order, items: orderItems };
}

function getOrder(orderId) {
  return db.orders.find(order => order.id === orderId) || null;
}

function createPayment({ userId, order, provider, idempotencyKey, status = 'pending' }) {
  const normalizedKey = String(idempotencyKey || '').trim();
  if (normalizedKey) {
    const existing = db.payments.find(payment =>
      payment.user_id === userId && payment.idempotency_key === normalizedKey
    );
    if (existing) return existing;
  }

  const activePayment = db.payments.find(payment =>
    payment.order_id === order.id &&
    payment.provider === provider &&
    ['configuration_pending', 'pending', 'authorized'].includes(payment.status)
  );
  if (activePayment) return activePayment;

  const payment = {
    id: id('pay'),
    order_id: order.id,
    user_id: userId,
    provider,
    provider_payment_id: '',
    amount_cents: order.total_cents,
    currency: order.currency,
    status,
    idempotency_key: normalizedKey,
    paid_at: '',
    failure_reason: '',
    created_at: now(),
    updated_at: now(),
  };
  db.payments.push(payment);
  saveDb();
  return payment;
}

function getPayment(paymentId) {
  return db.payments.find(payment => payment.id === paymentId) || null;
}

function listPaymentsForUser(userId) {
  return db.payments.filter(payment => payment.user_id === userId);
}

function updatePaymentStatus(paymentId, status, { providerPaymentId = '', failureReason = '' } = {}) {
  const payment = getPayment(paymentId);
  if (!payment) throw new Error('Payment not found');

  payment.status = status;
  payment.provider_payment_id = providerPaymentId || payment.provider_payment_id;
  payment.failure_reason = failureReason;
  payment.updated_at = now();
  if (status === 'paid') payment.paid_at = now();

  const order = getOrder(payment.order_id);
  if (order) {
    if (status === 'paid') {
      order.payment_status = 'paid';
      order.status = 'paid';
    } else if (status === 'failed') {
      order.payment_status = 'failed';
    }
    order.updated_at = now();
  }
  saveDb();
  return { payment, order };
}

function appendAnalyticsEvent(event) {
  const record = {
    id: id('evt'),
    ...event,
    created_at: now(),
  };
  db.analytics_events.push(record);
  saveDb();
  return record;
}

function resetForTests() {
  db = structuredClone(initialDb);
  saveDb();
}

module.exports = {
  db,
  id,
  now,
  loginOrCreateUser,
  getUser,
  publicUser,
  ensureDefaultHousehold,
  ensureTuyaMapping,
  listByHousehold,
  createPet,
  updateById,
  upsertDevice,
  bindDevicePet,
  createRecord,
  createOrder,
  getOrder,
  createPayment,
  getPayment,
  listPaymentsForUser,
  updatePaymentStatus,
  appendAnalyticsEvent,
  resetForTests,
};
