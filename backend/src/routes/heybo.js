const express = require('express');
const store = require('../services/heybo_store');
const { createAnalyticsEvent } = require('../services/analytics_events');

const router = express.Router();

function asyncHandler(fn) {
  return (req, res) => Promise.resolve(fn(req, res)).catch(error => {
    const status = error.message === 'Unauthorized' ? 401 : 400;
    res.status(status).json({ success: false, error: error.message });
  });
}

function getUserIdFromRequest(req) {
  const auth = req.get('authorization') || '';
  if (auth.startsWith('Bearer dev_')) return auth.replace('Bearer dev_', '');
  if (req.get('x-heybo-user-id')) return req.get('x-heybo-user-id');
  if (req.body?.user_id) return req.body.user_id;
  if (req.query?.user_id) return req.query.user_id;
  return '';
}

function requireUser(req) {
  const userId = getUserIdFromRequest(req);
  const user = store.getUser(userId);
  if (!user) throw new Error('Unauthorized');
  return user;
}

router.post('/auth/mock-login', asyncHandler(async (req, res) => {
  const { login, provider, display_name } = req.body || {};
  if (!login) return res.status(400).json({ success: false, error: 'login is required' });
  const result = store.loginOrCreateUser({
    login,
    provider: provider || (String(login).includes('@') ? 'email' : 'phone'),
    displayName: display_name,
  });
  res.json({ success: true, ...result });
}));

router.get('/users/me', asyncHandler(async (req, res) => {
  const user = requireUser(req);
  res.json({
    success: true,
    user: store.publicUser(user),
    household: store.ensureDefaultHousehold(user.id),
    tuyaMapping: store.ensureTuyaMapping(user.id),
  });
}));

router.post('/households/default', asyncHandler(async (req, res) => {
  const user = requireUser(req);
  res.json({ success: true, household: store.ensureDefaultHousehold(user.id) });
}));

router.get('/pets', asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const household = store.ensureDefaultHousehold(user.id);
  res.json({ success: true, pets: store.listByHousehold('pets', user.id, household.id) });
}));

router.post('/pets', asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const pet = store.createPet(user.id, req.body || {});
  res.json({ success: true, pet });
}));

router.patch('/pets/:id', asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const pet = store.updateById('pets', req.params.id, req.body || {});
  if (!pet) return res.status(404).json({ success: false, error: 'Pet not found' });
  res.json({ success: true, pet, user: store.publicUser(user) });
}));

router.get('/devices', asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const household = store.ensureDefaultHousehold(user.id);
  res.json({
    success: true,
    devices: store.listByHousehold('devices', user.id, household.id),
    bindings: store.db.device_pet_bindings,
  });
}));

router.post('/devices', asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const device = store.upsertDevice(user.id, req.body || {});
  res.json({ success: true, device });
}));

router.post('/devices/:id/pets', asyncHandler(async (req, res) => {
  requireUser(req);
  const { pet_id, is_default } = req.body || {};
  if (!pet_id) return res.status(400).json({ success: false, error: 'pet_id is required' });
  store.bindDevicePet(req.params.id, pet_id, is_default);
  res.json({ success: true });
}));

router.get('/operations/cooking', asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const household = store.ensureDefaultHousehold(user.id);
  res.json({
    success: true,
    operations: store.listByHousehold('device_operation_records', user.id, household.id),
  });
}));

router.post('/operations/cooking', asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const operation = store.createRecord('device_operation_records', user.id, {
    operation_type: 'start_cooking',
    result: 'success',
    ...req.body,
  });
  res.json({ success: true, operation });
}));

router.get('/feeding-records', asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const household = store.ensureDefaultHousehold(user.id);
  res.json({ success: true, records: store.listByHousehold('feeding_records', user.id, household.id) });
}));

router.post('/feeding-records', asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const record = store.createRecord('feeding_records', user.id, req.body || {});
  res.json({ success: true, record });
}));

router.get('/health-records', asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const household = store.ensureDefaultHousehold(user.id);
  let records = store.listByHousehold('health_records', user.id, household.id);
  if (req.query.pet_id) records = records.filter(record => record.pet_id === req.query.pet_id);
  res.json({ success: true, records });
}));

router.post('/health-records', asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const record = store.createRecord('health_records', user.id, req.body || {});
  res.json({ success: true, record });
}));

router.get('/medical-records', asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const household = store.ensureDefaultHousehold(user.id);
  let records = store.listByHousehold('medical_records', user.id, household.id);
  if (req.query.pet_id) records = records.filter(record => record.pet_id === req.query.pet_id);
  res.json({ success: true, records });
}));

router.post('/medical-records', asyncHandler(async (req, res) => {
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

router.get('/orders', asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const household = store.ensureDefaultHousehold(user.id);
  const orders = store.listByHousehold('orders', user.id, household.id)
    .map(order => ({ ...order, items: store.db.order_items.filter(item => item.order_id === order.id) }));
  res.json({ success: true, orders });
}));

router.post('/orders', asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const result = store.createOrder(user.id, req.body || {});
  res.json({ success: true, ...result });
}));

router.post('/analytics/events', asyncHandler(async (req, res) => {
  const userId = getUserIdFromRequest(req);
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
