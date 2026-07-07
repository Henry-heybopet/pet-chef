const express = require('express');
const store = require('../services/heybo_store');
const { createAnalyticsEvent } = require('../services/analytics_events');
const paymentService = require('../services/payment');
const { authMiddleware, generateToken, verifyToken } = require('../services/auth');
const { getEnvironment } = require('../config/region_config');

const router = express.Router();

function asyncHandler(fn) {
  return (req, res) => Promise.resolve(fn(req, res)).catch(error => {
    const status = error.message === 'Unauthorized' ? 401 : 400;
    res.status(status).json({ success: false, error: error.message });
  });
}

function requireUser(req) {
  const userId = req.user ? req.user.id : null;
  if (!userId) throw new Error('Unauthorized');
  const user = store.getUser(userId);
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

router.get('/users/me', authMiddleware, asyncHandler(async (req, res) => {
  const user = requireUser(req);
  res.json({
    success: true,
    user: store.publicUser(user),
    household: store.ensureDefaultHousehold(user.id),
    tuyaMapping: store.ensureTuyaMapping(user.id),
  });
}));

router.post('/households/default', authMiddleware, asyncHandler(async (req, res) => {
  const user = requireUser(req);
  res.json({ success: true, household: store.ensureDefaultHousehold(user.id) });
}));

router.get('/pets', authMiddleware, asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const household = store.ensureDefaultHousehold(user.id);
  res.json({ success: true, pets: store.listByHousehold('pets', user.id, household.id) });
}));

router.post('/pets', authMiddleware, asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const pet = store.createPet(user.id, req.body || {});
  res.json({ success: true, pet });
}));

router.patch('/pets/:id', authMiddleware, asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const pet = store.updateById('pets', req.params.id, req.body || {});
  if (!pet) return res.status(404).json({ success: false, error: 'Pet not found' });
  res.json({ success: true, pet, user: store.publicUser(user) });
}));

router.get('/devices', authMiddleware, asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const household = store.ensureDefaultHousehold(user.id);
  res.json({
    success: true,
    devices: store.listByHousehold('devices', user.id, household.id),
    bindings: store.db.device_pet_bindings,
  });
}));

router.post('/devices', authMiddleware, asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const device = store.upsertDevice(user.id, req.body || {});
  res.json({ success: true, device });
}));

router.post('/devices/:id/pets', authMiddleware, asyncHandler(async (req, res) => {
  requireUser(req);
  const { pet_id, is_default } = req.body || {};
  if (!pet_id) return res.status(400).json({ success: false, error: 'pet_id is required' });
  store.bindDevicePet(req.params.id, pet_id, is_default);
  res.json({ success: true });
}));

router.get('/operations/cooking', authMiddleware, asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const household = store.ensureDefaultHousehold(user.id);
  res.json({
    success: true,
    operations: store.listByHousehold('device_operation_records', user.id, household.id),
  });
}));

router.post('/operations/cooking', authMiddleware, asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const operation = store.createRecord('device_operation_records', user.id, {
    operation_type: 'start_cooking',
    result: 'success',
    ...req.body,
  });
  res.json({ success: true, operation });
}));

router.get('/feeding-records', authMiddleware, asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const household = store.ensureDefaultHousehold(user.id);
  res.json({ success: true, records: store.listByHousehold('feeding_records', user.id, household.id) });
}));

router.post('/feeding-records', authMiddleware, asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const record = store.createRecord('feeding_records', user.id, req.body || {});
  res.json({ success: true, record });
}));

router.get('/health-records', authMiddleware, asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const household = store.ensureDefaultHousehold(user.id);
  let records = store.listByHousehold('health_records', user.id, household.id);
  if (req.query.pet_id) records = records.filter(record => record.pet_id === req.query.pet_id);
  res.json({ success: true, records });
}));

router.post('/health-records', authMiddleware, asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const record = store.createRecord('health_records', user.id, req.body || {});
  res.json({ success: true, record });
}));

router.get('/medical-records', authMiddleware, asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const household = store.ensureDefaultHousehold(user.id);
  let records = store.listByHousehold('medical_records', user.id, household.id);
  if (req.query.pet_id) records = records.filter(record => record.pet_id === req.query.pet_id);
  res.json({ success: true, records });
}));

router.post('/medical-records', authMiddleware, asyncHandler(async (req, res) => {
  const user = requireUser(req);
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
  const user = requireUser(req);
  const household = store.ensureDefaultHousehold(user.id);
  const orders = store.listByHousehold('orders', user.id, household.id)
    .map(order => ({ ...order, items: store.db.order_items.filter(item => item.order_id === order.id) }));
  res.json({ success: true, orders });
}));

router.post('/orders', authMiddleware, asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const result = store.createOrder(user.id, req.body || {});
  res.json({ success: true, ...result });
}));

router.get('/payments/providers', (req, res) => {
  res.json({ success: true, providers: paymentService.listProviderReadiness() });
});

router.get('/payments', authMiddleware, asyncHandler(async (req, res) => {
  const user = requireUser(req);
  res.json({ success: true, payments: store.listPaymentsForUser(user.id) });
}));

router.get('/payments/:id', authMiddleware, asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const payment = store.getPayment(req.params.id);
  if (!payment || payment.user_id !== user.id) {
    return res.status(404).json({ success: false, error: 'Payment not found' });
  }
  res.json({ success: true, payment, order: store.getOrder(payment.order_id) });
}));

router.post('/payments', authMiddleware, asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const { order_id, provider } = req.body || {};
  if (!order_id) return res.status(400).json({ success: false, error: 'order_id is required' });
  if (!provider) return res.status(400).json({ success: false, error: 'provider is required' });

  const result = await paymentService.createPayment({
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

router.post('/payments/wechat/notify', (req, res) => {
  try {
    paymentService.applyWechatNotification(req);
    res.json({ code: 'SUCCESS', message: '成功' });
  } catch (error) {
    res.status(400).json({ code: 'FAIL', message: error.message });
  }
});

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
