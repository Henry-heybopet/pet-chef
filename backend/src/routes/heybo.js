const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const store = require('../services/heybo_store');
const { createAnalyticsEvent } = require('../services/analytics_events');
const paymentService = require('../services/payment');
const { authMiddleware, generateToken, verifyToken } = require('../services/auth');
const { getEnvironment } = require('../config/region_config');
const {
  loginWithVerifiedPhone,
  completePhoneSignup,
  assertConsent,
} = require('../services/phone_auth');
const {
  sendCode,
  verifyCode,
  createRegistrationToken,
  verifyRegistrationToken,
} = require('../services/sms_verification');
const { getUserById, getDefaultHouseholdForUser, publicUser } = require('../services/user_repository');
const petRepository = require('../services/pet_repository');
const { buildFreshMatchAnalysis } = require('../services/fresh_match');
const { recognizeFreshCheck, buildFreshCheckAnalysis } = require('../services/fresh_check');
const { safeCacheId, cachedEnergyTarget } = require('../services/ai_recommendation');
const { translatePresentationFields } = require('../services/deepseek');
const { normalizeLocale, localizeSemanticResultWithAi } = require('../services/localization');
const { storeAnalysis, getAnalysis, getRendered, storeRendered } = require('../services/localization_cache');
const { avatarDir, avatarPublicUrl } = require('../config/uploads');

const router = express.Router();
const imageTypes = { png: 'png', jpeg: 'jpg', jpg: 'jpg', webp: 'webp' };
const maxAvatarBytes = 5 * 1024 * 1024;
const FRESH_CHECK_ERRORS = {
  dogOnly: ['鲜食验证仅支持犬类宠物档案','Fresh Check currently supports dog profiles only','Die Frischfutter-Prüfung unterstützt derzeit nur Hundeprofile','La validation des repas frais prend actuellement en charge uniquement les profils de chiens','La validación de comida fresca solo admite actualmente perfiles de perros','La verifica del cibo fresco supporta attualmente solo profili di cani','フレッシュフード検証は現在、犬のプロフィールのみ対応しています','신선식 검증은 현재 반려견 프로필만 지원합니다'],
  ingredientRequired: ['请至少填写一种食材及克重','Enter at least one ingredient and its weight','Geben Sie mindestens eine Zutat und ihr Gewicht ein','Indiquez au moins un ingrédient et son poids','Introduzca al menos un ingrediente y su peso','Inserisci almeno un ingrediente e il relativo peso','食材と重量を1つ以上入力してください','식재료와 중량을 하나 이상 입력하세요'],
  invalidIngredient: ['请检查食材名称和克重（每项需大于 0g）','Check the ingredient names and weights; each must be greater than 0 g','Prüfen Sie Zutaten und Gewichte; jeder Wert muss über 0 g liegen','Vérifiez les ingrédients et leur poids ; chaque valeur doit dépasser 0 g','Revise los ingredientes y los pesos; cada valor debe ser mayor que 0 g','Controlla ingredienti e pesi; ogni valore deve essere superiore a 0 g','食材名と重量を確認してください（各項目は0gより大きい必要があります）','식재료명과 중량을 확인하세요(각 항목은 0g보다 커야 합니다)'],
};
const localizedError = (key, locale) => FRESH_CHECK_ERRORS[key][['zh','en','de','fr','es','it','ja','ko'].indexOf(locale)] || FRESH_CHECK_ERRORS[key][0];

function asyncHandler(fn) {
  return (req, res) => Promise.resolve(fn(req, res)).catch(error => {
    const status = error.status || (error.message === 'Unauthorized' ? 401 : 400);
    if (error.retryAfterSeconds) res.set('Retry-After', String(error.retryAfterSeconds));
    res.status(status).json({
      success: false,
      error: error.message,
      ...(error.code ? { code: error.code } : {}),
      ...(error.retryAfterSeconds ? { retry_after_seconds: error.retryAfterSeconds } : {}),
    });
  });
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

router.get('/app-releases/android', (req, res) => {
  const latestVersionCode = positiveInteger(process.env.ANDROID_LATEST_VERSION_CODE, 2);
  const minimumSupportedVersionCode = Math.min(
    positiveInteger(process.env.ANDROID_MINIMUM_VERSION_CODE, 1),
    latestVersionCode,
  );
  const releaseNotes = String(process.env.ANDROID_RELEASE_NOTES || '')
    .split('|')
    .map(note => note.trim())
    .filter(Boolean);

  res.set('Cache-Control', 'no-store');
  res.json({
    success: true,
    platform: 'android',
    upgrade_capability_since_version_code: 2,
    upgrade_capability_since_version_name: '2.0.0',
    latest_version_code: latestVersionCode,
    minimum_supported_version_code: minimumSupportedVersionCode,
    version_name: process.env.ANDROID_LATEST_VERSION_NAME || '2.0.0',
    update_url: process.env.ANDROID_UPDATE_URL || '',
    release_notes: releaseNotes,
  });
});

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

router.post('/auth/sms/send', asyncHandler(async (req, res) => {
  assertConsent(req.body?.accepted_terms, req.body?.accepted_privacy);
  const result = await sendCode({
    phone: req.body?.phone,
    ip: req.ip,
    deviceId: req.get('x-device-id') || req.body?.device_id,
  });
  res.json({
    success: true,
    cooldown_seconds: result.cooldownSeconds,
    expires_in_seconds: result.expiresInSeconds,
  });
}));

router.post('/auth/sms/verify', asyncHandler(async (req, res) => {
  const {
    phone,
    code,
    accepted_terms: acceptedTerms,
    accepted_privacy: acceptedPrivacy,
  } = req.body || {};
  assertConsent(acceptedTerms, acceptedPrivacy);
  const verification = await verifyCode({ phone, code });
  const result = await loginWithVerifiedPhone({
    phone: verification.phone,
    acceptedTerms,
    acceptedPrivacy,
  });
  if (result.needsUsername) {
    return res.json({
      success: true,
      needsUsername: true,
      maskedPhone: result.maskedPhone,
      registrationToken: createRegistrationToken({
        phone: verification.phone,
        challengeId: verification.challengeId,
      }),
    });
  }
  res.json({
    success: true,
    user: result.user,
    household: result.household,
    tuyaMapping: store.ensureTuyaMapping(result.user.id),
    token: generateToken(result.user.id),
  });
}));

router.post('/auth/phone-signup', asyncHandler(async (req, res) => {
  const {
    registrationToken,
    username,
    accepted_terms: acceptedTerms,
    accepted_privacy: acceptedPrivacy,
  } = req.body || {};
  const registration = verifyRegistrationToken(registrationToken);
  const result = await completePhoneSignup({
    phone: registration.phone,
    challengeId: registration.challengeId,
    username,
    acceptedTerms,
    acceptedPrivacy,
  });
  res.json({
    success: true,
    user: result.user,
    tuyaMapping: store.ensureTuyaMapping(result.user.id),
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
  if (buffer.length > maxAvatarBytes) {
    return res.status(413).json({ success: false, error: 'Avatar image is too large' });
  }

  fs.mkdirSync(avatarDir, { recursive: true });
  const filename = `${crypto.randomUUID()}.${imageTypes[match[1]]}`;
  fs.writeFileSync(path.join(avatarDir, filename), buffer);
  const avatar_url = avatarPublicUrl(filename);
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
  const analysis_id = storeAnalysis({ userId: user.id, kind: 'fresh-match', result });
  const locale = normalizeLocale(req.body?.locale || req.body?.lang);
  const localized = await localizeSemanticResultWithAi(result, locale, translatePresentationFields);
  storeRendered({ analysisId: analysis_id, userId: user.id, kind: 'fresh-match', locale, localized });
  res.json({ success: true, analysis_id, ...localized });
}));

router.post('/fresh-check/recognize', authMiddleware, asyncHandler(async (req, res) => {
  await requireUser(req);
  const result = await recognizeFreshCheck({ text: req.body?.text });
  const locale = normalizeLocale(req.body?.locale || req.body?.lang);
  res.json({ success: true, locale, translation_status: locale === 'zh' ? 'source' : 'not_applicable', ...result });
}));

router.post('/fresh-check/analyze', authMiddleware, asyncHandler(async (req, res) => {
  const locale = normalizeLocale(req.body?.locale || req.body?.lang);
  const user = await requireUser(req);
  const pet = await petRepository.getPetForUser(user.id, req.body?.pet_id);
  if (!pet) return res.status(404).json({ success: false, error: 'Pet not found' });
  if (pet.species && pet.species !== 'dog') return res.status(400).json({ success: false, error: localizedError('dogOnly', locale) });
  const ingredients = Array.isArray(req.body?.ingredients) ? req.body.ingredients : [];
  if (!ingredients.length) return res.status(400).json({ success: false, error: localizedError('ingredientRequired', locale) });
  const household = store.ensureDefaultHousehold(user.id);
  const feedbackCount = store.listByHousehold('feeding_records', user.id, household.id).filter(record => String(record.pet_id) === String(pet.id)).length;
  let energyTarget = null;
  try {
    const cachePath = path.resolve(__dirname, '../../.data', `compare_cache_${safeCacheId(`${user.id}_${pet.id}`)}.json`);
    if (fs.existsSync(cachePath)) energyTarget = cachedEnergyTarget(JSON.parse(fs.readFileSync(cachePath, 'utf8')), { petUpdatedAt: pet.updated_at, feedbackCount });
  } catch (_) { /* Fresh Check safely falls back to the shared deterministic formula. */ }
  const result = await buildFreshCheckAnalysis({ pet: energyTarget ? { ...pet, energy_target_kcal: energyTarget } : pet, ingredients, meal_intent: req.body?.meal_intent, pack_id: req.body?.pack_id, b_pack_category: req.body?.b_pack_category });
  if (!result.recipe.ingredients.length) return res.status(400).json({ success: false, error: localizedError('invalidIngredient', locale) });
  const analysis_id = storeAnalysis({ userId: user.id, kind: 'fresh-check', result });
  const localized = await localizeSemanticResultWithAi(result, locale, translatePresentationFields);
  storeRendered({ analysisId: analysis_id, userId: user.id, kind: 'fresh-check', locale, localized });
  res.json({ success: true, analysis_id, ...localized });
}));

router.post('/localization/render', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const kind = req.body?.kind;
  if (!['fresh-check', 'fresh-match'].includes(kind)) return res.status(400).json({ success: false, error: 'Invalid localization kind' });
  const locale = normalizeLocale(req.body?.locale || req.body?.lang);
  const cached = getRendered({ analysisId: req.body?.analysis_id, userId: user.id, kind, locale });
  if (cached) return res.json({ success: true, analysis_id: req.body.analysis_id, ...cached });
  const result = getAnalysis({ analysisId: req.body?.analysis_id, userId: user.id, kind });
  if (!result) return res.status(404).json({ success: false, error: 'Analysis expired or not found; run the analysis again' });
  const localized = await localizeSemanticResultWithAi(result, locale, translatePresentationFields);
  storeRendered({ analysisId: req.body.analysis_id, userId: user.id, kind, locale, localized });
  res.json({ success: true, analysis_id: req.body.analysis_id, ...localized });
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

router.delete('/pets/:id', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const deleted = await petRepository.deletePetForUser(user.id, req.params.id);
  if (!deleted) return res.status(404).json({ success: false, error: 'Pet not found' });
  store.deletePetData(req.params.id);
  res.json({ success: true });
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

router.post('/devices/:id/dp-sync', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const device = store.syncDeviceDp(user.id, req.params.id, req.body || {});
  res.json({ success: true, device });
}));

router.post('/devices/:id/communication-log', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const logs = store.createDeviceCommunicationLogs(user.id, req.params.id, req.body || {});
  res.json({ success: true, logs });
}));

router.delete('/devices/:id', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const device = store.unbindDevice(user.id, req.params.id);
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
  const payload = req.body || {};
  if (payload.pet_id) {
    const pet = await petRepository.getPetForUser(user.id, payload.pet_id);
    if (!pet) return res.status(404).json({ success: false, error: 'Pet not found' });
  }
  const operation = store.createCookingOperation(user.id, payload, {
    petOwnershipVerified: Boolean(payload.pet_id),
  });
  res.status(201).json({ success: true, operation });
}));

router.get('/feeding-records', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const household = store.ensureDefaultHousehold(user.id);
  res.json({ success: true, records: store.listByHousehold('feeding_records', user.id, household.id) });
}));

router.get('/feeding-records/daily-energy', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const petId = String(req.query.pet_id || '').trim();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date || '')) ? String(req.query.date) : undefined;
  const pet = await petRepository.getPetForUser(user.id, petId);
  if (!pet) return res.status(404).json({ success: false, error: 'Pet not found' });
  res.json({ success: true, ...store.getDailyFeedingEnergy(user.id, pet.id, date) });
}));

router.post('/feeding-records', authMiddleware, asyncHandler(async (req, res) => {
  const user = await requireUser(req);
  const payload = { ...(req.body || {}) };
  let pet = await petRepository.getPetForUser(user.id, payload.pet_id);
  if (!pet && !payload.pet_id && String(payload.pet_name || '').trim()) {
    const matches = (await petRepository.listPetsForUser(user.id))
      .filter(item => String(item.name || '').trim() === String(payload.pet_name).trim());
    if (matches.length === 1) {
      [pet] = matches;
      payload.pet_id = pet.id;
    }
  }
  if (!pet) return res.status(404).json({ success: false, error: 'Pet not found' });
  const record = store.createFeedingRecord(user.id, payload, { petOwnershipVerified: true });
  res.status(201).json({ success: true, record, daily_energy: store.getDailyFeedingEnergy(user.id, pet.id) });
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
  let userId = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (decoded) {
      userId = decoded.sub;
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
