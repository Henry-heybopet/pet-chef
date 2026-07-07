const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const store = require('../services/heybo_store');
const { createAnalyticsEvent } = require('../services/analytics_events');
const paymentService = require('../services/payment');
const { authMiddleware, generateToken, verifyToken } = require('../services/auth');
const { getEnvironment } = require('../config/region_config');
const { accountLogin, completePhoneSignup } = require('../services/phone_auth');
const { getUserById, getDefaultHouseholdForUser, publicUser } = require('../services/user_repository');
const petRepository = require('../services/pet_repository');
const { buildFreshMatchAnalysis } = require('../services/fresh_match');

const router = express.Router();
const avatarDir = path.resolve(__dirname, '../../public/uploads/avatars');
const imageTypes = { png: 'png', jpeg: 'jpg', jpg: 'jpg', webp: 'webp' };

function asyncHandler(fn) {
  return (req, res) => Promise.resolve(fn(req, res)).catch(error => {
    const status = error.status || (error.message === 'Unauthorized' ? 401 : 400);
    res.status(status).json({ success: false, error: error.message });
  });
}

async function requireUser(req) {
  const userId = req.user ? req.user.id : null;
  if (!userId) throw new Error('Unauthorized');
  let user = null;
  try {
    user = await getUserById(userId);
  } catch (error) {
    if (getEnvironment() === 'production') throw error;
  }
  if (!user && getEnvironment() !== 'production') user = store.getUser(userId);
  if (!user) throw new Error('Unauthorized');
  return user;
}

router.post('/auth/mock-login', asyncHandler(async (req, res) => {
  const { login, password, provider, display_name } = req.body || {};
  if (!login) return res.status(400).json({ success: false, error: 'login is required' });

  // 硬件工厂测试账号特定密码验证
  if (login === '13501578655') {
    if (!password) {
      return res.status(400).json({ success: false, error: 'password is required for this test account' });
    }
    if (password !== '13501578665') {
      return res.status(401).json({ success: false, error: 'Incorrect password for test account' });
    }
  } else if (login === '18757129405') {
    if (!password) {
      return res.status(400).json({ success: false, error: 'password is required for this test account' });
    }
    if (password !== '18757129405') {
      return res.status(401).json({ success: false, error: 'Incorrect password for test account' });
    }
  }

  const result = store.loginOrCreateUser({
    login,
    provider: provider || (String(login).includes('@') ? 'email' : 'phone'),
    displayName: login === '18757129405' ? '工厂测试账号2' : (login === '13501578655' ? '工厂测试账号' : display_name),
  });


  // 签发真实 JWT Token
  const token = generateToken(result.user.id);

  res.json({
    success: true,
    user: result.user,
    household: result.household,
    tuyaMapping: result.tuyaMapping,
    token: token,
  });
}));

router.post('/auth/phone-login', asyncHandler(async (req, res) => {
  const result = await accountLogin(req.body || {});
  if (result.needsUsername) {
    return res.json({
      success: true,
      needsUsername: true,
      phone: result.phone,
      maskedPhone: result.maskedPhone,
    });
  }
  res.json({
    success: true,
    user: result.user,
    household: result.household,
    token: generateToken(result.user.id),
  });
}));

router.post('/auth/phone-signup', asyncHandler(async (req, res) => {
  const result = await completePhoneSignup(req.body || {});
  res.json({
    success: true,
    user: result.user,
    token: generateToken(result.user.id),
  });
}));

router.get('/users/me', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const household = await getDefaultHouseholdForUser(user.id);
  res.json({
    success: true,
    user: publicUser(user),
    household: household || store.ensureDefaultHousehold(user.id),
    tuyaMapping: store.ensureTuyaMapping(user.id),
    token: generateToken(user.id),
  });
}));

router.post('/uploads/avatar', authMiddleware, asyncHandler(async (req, res) => {
  await requireUser(req);
  const dataUrl = String(req.body?.data_url || '');
  const match = dataUrl.match(/^data:image\/(png|jpe?g|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return res.status(400).json({ success: false, error: 'Invalid avatar image' });

  const buffer = Buffer.from(match[2], 'base64');
  if (buffer.length > 2 * 1024 * 1024) {
    return res.status(413).json({ success: false, error: 'Avatar image is too large' });
  }

  fs.mkdirSync(avatarDir, { recursive: true });
  const filename = `${crypto.randomUUID()}.${imageTypes[match[1]]}`;
  fs.writeFileSync(path.join(avatarDir, filename), buffer);
  const avatar_url = `${req.protocol}://${req.get('host')}/uploads/avatars/${filename}`;
  res.json({ success: true, avatar_url });
}));

router.post('/households/default', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const household = await getDefaultHouseholdForUser(user.id);
  res.json({ success: true, household: household || store.ensureDefaultHousehold(user.id) });
}));

router.get('/pets', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const pets = await petRepository.listPetsForUser(user.id);
  res.json({ success: true, pets, source: 'pg' });
}));

router.get('/pets/:id', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const pet = await petRepository.getPetForUser(user.id, req.params.id);
  if (!pet) return res.status(404).json({ success: false, error: 'Pet not found' });
  res.json({ success: true, pet, source: 'pg' });
}));

router.post('/fresh-match/analyze', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const pet = await petRepository.getPetForUser(user.id, req.body?.pet_id);
  if (!pet) return res.status(404).json({ success: false, error: 'Pet not found' });
  if (pet.species && pet.species !== 'dog') return res.status(400).json({ success: false, error: 'Fresh Match 仅支持犬类宠物档案' });
  const result = await buildFreshMatchAnalysis({ pet, ingredients: req.body?.ingredients || {} });
  res.json({ success: true, ...result });
}));

router.post('/pets', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const pet = await petRepository.createPetForUser(user.id, req.body || {});
  res.json({ success: true, pet, source: 'pg' });
}));

router.patch('/pets/:id', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const pet = await petRepository.updatePetForUser(user.id, req.params.id, req.body || {});
  if (!pet) return res.status(404).json({ success: false, error: 'Pet not found' });
  res.json({ success: true, pet, user: publicUser(user), source: 'pg' });
}));

router.get('/devices', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const household = store.ensureDefaultHousehold(user.id);
  res.json({
    success: true,
    devices: store.listByHousehold('devices', user.id, household.id),
    bindings: store.db.device_pet_bindings,
  });
}));

router.post('/devices', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const device = store.upsertDevice(user.id, req.body || {});
  res.json({ success: true, device });
}));

router.post('/devices/:id/pets', authMiddleware, asyncHandler(async (req, res) => {
  await requireUser(req);
  const { pet_id, is_default } = req.body || {};
  if (!pet_id) return res.status(400).json({ success: false, error: 'pet_id is required' });
  store.bindDevicePet(req.params.id, pet_id, is_default);
  res.json({ success: true });
}));

router.get('/operations/cooking', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const household = store.ensureDefaultHousehold(user.id);
  res.json({
    success: true,
    operations: store.listByHousehold('cooking_operations', user.id, household.id),
  });
}));

router.post('/operations/cooking', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const operation = store.createCookingOperation(user.id, req.body || {});
  res.json({ success: true, operation });
}));

router.get('/feeding-records', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const household = store.ensureDefaultHousehold(user.id);
  res.json({ success: true, records: store.listByHousehold('feeding_records', user.id, household.id) });
}));

router.post('/feeding-records', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const record = store.createRecord('feeding_records', user.id, req.body || {});
  res.json({ success: true, record });
}));

router.get('/health-records', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const household = store.ensureDefaultHousehold(user.id);
  let records = store.listByHousehold('health_records', user.id, household.id);
  if (req.query.pet_id) records = records.filter(record => record.pet_id === req.query.pet_id);
  res.json({ success: true, records });
}));

router.post('/health-records', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const record = store.createRecord('health_records', user.id, req.body || {});
  res.json({ success: true, record });
}));

router.get('/medical-records', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const household = store.ensureDefaultHousehold(user.id);
  let records = store.listByHousehold('medical_records', user.id, household.id);
  if (req.query.pet_id) records = records.filter(record => record.pet_id === req.query.pet_id);
  res.json({ success: true, records });
}));

router.post('/medical-records', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const record = store.createRecord('medical_records', user.id, req.body || {});
  res.json({ success: true, record });
}));

router.get('/products', (req, res) => {
  let products = store.db.products.filter(product => product.status === 'active');
  if (req.query.pet_id) {
    const pet = store.db.pets.find(item => item.id === req.query.pet_id);
    const tags = new Set(pet?.health_tags || []);
    products = products
      .map(product => ({
        ...product,
        match_score: (product.target_tags || []).filter(tag => tags.has(tag)).length,
      }))
      .sort((a, b) => b.match_score - a.match_score);
  }
  res.json({ success: true, products });
});

router.get('/orders', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const household = store.ensureDefaultHousehold(user.id);
  const orders = store.listByHousehold('orders', user.id, household.id)
    .map(order => ({ ...order, items: store.db.order_items.filter(item => item.order_id === order.id) }));
  res.json({ success: true, orders });
}));

router.post('/orders', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const result = store.createOrder(user.id, req.body || {});
  res.json({ success: true, ...result });
}));

router.get('/payments/providers', (req, res) => {
  res.json({ success: true, providers: paymentService.listProviderReadiness() });
});

router.get('/payments', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  res.json({ success: true, payments: store.listPaymentsForUser(user.id) });
}));

router.get('/payments/:id', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const payment = store.getPayment(req.params.id);
  if (!payment || payment.user_id !== user.id) {
    return res.status(404).json({ success: false, error: 'Payment not found' });
  }
  res.json({ success: true, payment, order: store.getOrder(payment.order_id) });
}));

router.post('/payments', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const { order_id, provider } = req.body || {};
  if (!order_id) return res.status(400).json({ success: false, error: 'order_id is required' });
  if (!provider) return res.status(400).json({ success: false, error: 'provider is required' });

  const result = paymentService.createPayment({
    userId: user.id,
    orderId: order_id,
    provider,
    idempotencyKey: req.get('idempotency-key'),
  });
  res.status(result.readiness.configured ? 201 : 503).json({ success: result.readiness.configured, ...result });
}));

// Development-only callback. Production callbacks must use provider-specific
// signature verification and the unmodified raw request body.
router.post('/payments/mock-callback', asyncHandler(async (req, res) => {
  const result = paymentService.applyDevelopmentCallback(req);
  res.json({ success: true, ...result });
}));

router.post('/analytics/events', asyncHandler(async (req, res) => {
  // 尝试解析 Authorization header 中的 JWT
  let userId = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const env = getEnvironment();
    if (env !== 'production' && token.startsWith('dev_')) {
      userId = token.replace('dev_', '');
    } else {
      const decoded = verifyToken(token);
      if (decoded) {
        userId = decoded.sub;
      }
    }
  }

  const user = userId ? store.getUser(userId) : null;
  const { event_name, payload = {} } = req.body || {};
  if (!event_name) return res.status(400).json({ success: false, error: 'event_name is required' });

  const event = createAnalyticsEvent(event_name, {
    source: 'backend',
    user_id: user?.id || payload.user_id,
    ...payload,
  });
  const record = store.appendAnalyticsEvent(event);
  res.json({ success: true, event: record });
}));

module.exports = router;
