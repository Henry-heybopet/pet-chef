const crypto = require('crypto');
const store = require('./heybo_store');
const auth = require('./auth');
const {
  getAccountPolicy,
  assertPrimaryProvider,
  assertAuxiliaryProvider,
  normalizeRegion,
} = require('../config/account_policy');

const SMS_TTL_MS = 5 * 60 * 1000;
const EMAIL_TTL_MS = 5 * 60 * 1000;
const SEND_INTERVAL_MS = 60 * 1000;
const TARGET_DAILY_SEND_LIMIT = 10;
const IP_MINUTE_SEND_LIMIT = 10;
const IP_DAILY_SEND_LIMIT = 30;
const MAX_ATTEMPTS = 5;
const FAILURE_WINDOW_MS = 10 * 60 * 1000;
const FAILURE_LOCK_MS = 30 * 60 * 1000;
const TARGET_FAILURE_LIMIT = 10;

function normalizePhone(phone) {
  return String(phone || '').replace(/[^\d]/g, '');
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function generateCode() {
  if (process.env.NODE_ENV !== 'production' && process.env.AUTH_TEST_CODE) return process.env.AUTH_TEST_CODE;
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function codeHash(target, code) {
  return store.hash(`${target}:${code}`);
}

function requestIp(req) {
  return String(req?.ip || req?.get?.('x-forwarded-for') || '').split(',')[0].trim();
}

function verificationSendRecords() {
  return [
    ...store.ensureCollection('sms_verification_codes'),
    ...store.ensureCollection('email_verification_codes'),
  ];
}

function countSince(records, predicate, sinceMs) {
  return records.filter(record =>
    predicate(record) &&
    new Date(record.created_at).getTime() >= sinceMs
  ).length;
}

function assertCanSend({ targetHash, region, req }) {
  const records = verificationSendRecords();
  const nowMs = Date.now();
  const ip = requestIp(req);
  const targetRecords = records.filter(item =>
    item.region === region &&
    (item.target_hash === targetHash || item.phone_hash === targetHash || item.email_hash === targetHash)
  );
  const latest = targetRecords
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  if (latest && Date.now() - new Date(latest.created_at).getTime() < SEND_INTERVAL_MS) {
    throw new Error('Verification code can only be sent once per minute');
  }
  if (countSince(targetRecords, () => true, nowMs - 24 * 60 * 60 * 1000) >= TARGET_DAILY_SEND_LIMIT) {
    throw new Error('Daily verification code send limit exceeded');
  }
  if (ip) {
    const sameIp = record => record.region === region && record.send_ip === ip;
    if (countSince(records, sameIp, nowMs - 60 * 1000) >= IP_MINUTE_SEND_LIMIT) {
      throw new Error('IP verification code send rate limit exceeded');
    }
    if (countSince(records, sameIp, nowMs - 24 * 60 * 60 * 1000) >= IP_DAILY_SEND_LIMIT) {
      throw new Error('IP daily verification code send limit exceeded');
    }
  }
}

function assertTargetNotLocked({ region, targetHash }) {
  const failures = store.ensureCollection('verification_failures')
    .filter(item => item.region === region && item.target_hash === targetHash)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const latest = failures[0];
  if (!latest) return;
  const nowMs = Date.now();
  const recentCount = failures.filter(item =>
    new Date(item.created_at).getTime() >= nowMs - FAILURE_WINDOW_MS
  ).length;
  if (recentCount >= TARGET_FAILURE_LIMIT) {
    const lockedUntilMs = new Date(latest.created_at).getTime() + FAILURE_LOCK_MS;
    if (lockedUntilMs > nowMs) {
      throw new Error('Verification target locked due to repeated failures');
    }
  }
}

function recordVerificationFailure({ region, targetHash, reason, req }) {
  store.ensureCollection('verification_failures').push({
    id: store.id('vfa'),
    region,
    target_hash: targetHash,
    reason,
    ip: requestIp(req),
    user_agent: req?.get?.('user-agent') || '',
    created_at: store.now(),
  });
  store.saveDb();
}

function failVerification(context, reason, message) {
  recordVerificationFailure({ ...context, reason });
  throw new Error(message);
}

function sendSmsCode({ region, countryCode = '86', phone, scene = 'login', req }) {
  const policy = assertPrimaryProvider(region, 'phone');
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) throw new Error('phone is required');
  const target = `${countryCode}:${normalizedPhone}`;
  const targetHash = store.hash(target);
  const collection = store.ensureCollection('sms_verification_codes');
  assertCanSend({ targetHash, region: policy.region, req });
  const code = generateCode();
  const record = {
    id: store.id('sms'),
    region: policy.region,
    country_code: countryCode,
    phone: normalizedPhone,
    phone_hash: targetHash,
    target_hash: targetHash,
    scene,
    code_hash: codeHash(target, code),
    expires_at: new Date(Date.now() + SMS_TTL_MS).toISOString(),
    used_at: '',
    attempt_count: 0,
    send_ip: requestIp(req),
    user_agent: req?.get?.('user-agent') || '',
    created_at: store.now(),
  };
  collection.push(record);
  store.saveDb();
  return {
    success: true,
    expires_in_seconds: Math.floor(SMS_TTL_MS / 1000),
    ...(process.env.NODE_ENV === 'production' ? {} : { debug_code: code }),
  };
}

function sendEmailCode({ region, email, scene = 'login', req }) {
  const policy = assertPrimaryProvider(region, 'email');
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) throw new Error('email is required');
  const targetHash = store.hash(normalizedEmail);
  const collection = store.ensureCollection('email_verification_codes');
  assertCanSend({ targetHash, region: policy.region, req });
  const code = generateCode();
  const record = {
    id: store.id('emc'),
    region: policy.region,
    email: normalizedEmail,
    email_hash: targetHash,
    target_hash: targetHash,
    scene,
    code_hash: codeHash(normalizedEmail, code),
    expires_at: new Date(Date.now() + EMAIL_TTL_MS).toISOString(),
    used_at: '',
    attempt_count: 0,
    send_ip: requestIp(req),
    user_agent: req?.get?.('user-agent') || '',
    created_at: store.now(),
  };
  collection.push(record);
  store.saveDb();
  return {
    success: true,
    expires_in_seconds: Math.floor(EMAIL_TTL_MS / 1000),
    ...(process.env.NODE_ENV === 'production' ? {} : { debug_code: code }),
  };
}

function verifyCode({ collectionName, region, target, code, req }) {
  const targetHash = store.hash(target);
  assertTargetNotLocked({ region, targetHash });
  const failureContext = { region, targetHash, req };
  const collection = store.ensureCollection(collectionName);
  const record = collection
    .filter(item => item.region === region && item.target_hash === targetHash && !item.used_at)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
  if (!record) failVerification(failureContext, 'not_found', 'Invalid verification code');
  if (new Date(record.expires_at).getTime() < Date.now()) {
    failVerification(failureContext, 'expired', 'Verification code expired');
  }
  if (record.attempt_count >= MAX_ATTEMPTS) {
    failVerification(failureContext, 'attempt_limit', 'Verification code attempt limit exceeded');
  }
  record.attempt_count += 1;
  if (record.code_hash !== codeHash(target, code)) {
    store.saveDb();
    failVerification(failureContext, 'code_mismatch', 'Invalid verification code');
  }
  record.used_at = store.now();
  store.saveDb();
  return record;
}

function loginResponse({ user, region, provider, req }) {
  const sessionResult = auth.createSession({ userId: user.id, region, provider, req });
  return {
    success: true,
    user: store.publicUser(user),
    household: store.ensureDefaultHousehold(user.id),
    tuyaMapping: store.ensureTuyaMapping(user.id),
    access_token: sessionResult.accessToken,
    refresh_token: sessionResult.refreshToken,
    token: sessionResult.accessToken,
    session: { id: sessionResult.session.id, expires_at: sessionResult.session.expires_at },
  };
}

function loginWithPhone({ region, countryCode = '86', phone, code, req }) {
  const policy = assertPrimaryProvider(region, 'phone');
  const normalizedPhone = normalizePhone(phone);
  const target = `${countryCode}:${normalizedPhone}`;
  verifyCode({ collectionName: 'sms_verification_codes', region: policy.region, target, code, req });
  const identity = store.findIdentityByLogin(target, 'phone', policy.region)
    || store.findIdentityByLogin(normalizedPhone, 'phone', policy.region);
  let user = identity ? store.getUser(identity.user_id) : null;
  if (!user) {
    user = store.createUserWithIdentity({
      login: target,
      provider: 'phone',
      displayName: `用户${normalizedPhone.slice(-4)}`,
      region: policy.region,
      countryCode,
    });
    user.primary_phone = normalizedPhone;
    store.saveDb();
  }
  user.last_login_at = store.now();
  user.updated_at = store.now();
  store.saveDb();
  return loginResponse({ user, region: policy.region, provider: 'phone', req });
}

function loginWithEmail({ region, email, code, req }) {
  const policy = assertPrimaryProvider(region, 'email');
  const normalizedEmail = normalizeEmail(email);
  verifyCode({ collectionName: 'email_verification_codes', region: policy.region, target: normalizedEmail, code, req });
  const identity = store.findIdentityByLogin(normalizedEmail, 'email', policy.region);
  let user = identity ? store.getUser(identity.user_id) : null;
  if (!user) {
    user = store.createUserWithIdentity({
      login: normalizedEmail,
      provider: 'email',
      displayName: normalizedEmail,
      region: policy.region,
      countryCode: policy.countryCode,
    });
  }
  user.last_login_at = store.now();
  user.updated_at = store.now();
  store.saveDb();
  return loginResponse({ user, region: policy.region, provider: 'email', req });
}

function mockProviderIdentity(provider, codeOrToken) {
  const value = String(codeOrToken || '').trim();
  if (!value) throw new Error(`${provider} credential is required`);
  if (provider === 'wechat') {
    return {
      provider_user_id: value.startsWith('openid_') ? value : `openid_${store.hash(value).slice(0, 16)}`,
      provider_union_id: `union_${store.hash(value).slice(0, 16)}`,
      provider_payload: { mock: true },
    };
  }
  return {
    provider_user_id: `${provider}_${store.hash(value).slice(0, 24)}`,
    provider_union_id: '',
    provider_payload: { mock: true },
  };
}

function auxiliaryLogin({ region, provider, credential, req }) {
  const policy = assertAuxiliaryProvider(region, provider);
  const providerIdentity = mockProviderIdentity(provider, credential);
  const identity = store.findIdentity(provider, providerIdentity.provider_user_id, policy.region);
  if (identity) {
    const user = store.getUser(identity.user_id);
    if (!user) throw new Error('Bound user not found');
    user.last_login_at = store.now();
    user.updated_at = store.now();
    store.saveDb();
    return loginResponse({ user, region: policy.region, provider, req });
  }
  const bindToken = auth.generateBindToken({
    region: policy.region,
    provider,
    provider_user_id: providerIdentity.provider_user_id,
    provider_union_id: providerIdentity.provider_union_id,
    provider_payload: providerIdentity.provider_payload,
    require_bind: policy.bindRequirement,
  });
  return {
    success: true,
    status: policy.bindRequirement === 'phone' ? 'need_bind_phone' : 'need_bind_email',
    bind_token: bindToken,
  };
}

function bindAuxiliaryWithPhone({ bindToken, countryCode = '86', phone, code, req }) {
  const bind = auth.verifyBindToken(bindToken);
  if (!bind || bind.require_bind !== 'phone') throw new Error('Invalid bind token');
  const policy = getAccountPolicy(bind.region);
  const normalizedPhone = normalizePhone(phone);
  const target = `${countryCode}:${normalizedPhone}`;
  verifyCode({ collectionName: 'sms_verification_codes', region: policy.region, target, code, req });

  const existingAux = store.findIdentity(bind.provider, bind.provider_user_id, policy.region);
  if (existingAux) throw new Error(`${bind.provider} identity already bound`);

  const phoneIdentity = store.findIdentityByLogin(target, 'phone', policy.region)
    || store.findIdentityByLogin(normalizedPhone, 'phone', policy.region);
  let user = phoneIdentity ? store.getUser(phoneIdentity.user_id) : null;
  if (!user) {
    user = store.createUserWithIdentity({
      login: target,
      provider: 'phone',
      displayName: `用户${normalizedPhone.slice(-4)}`,
      region: policy.region,
      countryCode,
    });
    user.primary_phone = normalizedPhone;
  }
  const identity = store.addIdentity(user.id, {
    provider: bind.provider,
    providerUserId: bind.provider_user_id,
    providerUnionId: bind.provider_union_id,
    region: policy.region,
    isPrimary: false,
    providerPayload: bind.provider_payload,
  });
  store.appendAccountMergeLog({
    region: policy.region,
    source_user_id: '',
    target_user_id: user.id,
    identity_id: identity.id,
    merge_type: 'bind_auxiliary_to_primary',
    reason: `${bind.provider}_bind_phone`,
    operator_type: 'user',
    operator_id: user.id,
    before_snapshot: {},
    after_snapshot: { provider: bind.provider, phone: normalizedPhone },
  });
  user.last_login_at = store.now();
  user.updated_at = store.now();
  store.saveDb();
  return loginResponse({ user, region: policy.region, provider: bind.provider, req });
}

function bindAuxiliaryWithEmail({ bindToken, email, code, req }) {
  const bind = auth.verifyBindToken(bindToken);
  if (!bind || bind.require_bind !== 'email') throw new Error('Invalid bind token');
  const policy = getAccountPolicy(bind.region);
  const normalizedEmail = normalizeEmail(email);
  verifyCode({ collectionName: 'email_verification_codes', region: policy.region, target: normalizedEmail, code, req });

  const existingAux = store.findIdentity(bind.provider, bind.provider_user_id, policy.region);
  if (existingAux) throw new Error(`${bind.provider} identity already bound`);

  const emailIdentity = store.findIdentityByLogin(normalizedEmail, 'email', policy.region);
  let user = emailIdentity ? store.getUser(emailIdentity.user_id) : null;
  if (!user) {
    user = store.createUserWithIdentity({
      login: normalizedEmail,
      provider: 'email',
      displayName: normalizedEmail,
      region: policy.region,
      countryCode: policy.countryCode,
    });
  }
  const identity = store.addIdentity(user.id, {
    provider: bind.provider,
    providerUserId: bind.provider_user_id,
    providerUnionId: bind.provider_union_id,
    region: policy.region,
    isPrimary: false,
    providerPayload: bind.provider_payload,
  });
  store.appendAccountMergeLog({
    region: policy.region,
    source_user_id: '',
    target_user_id: user.id,
    identity_id: identity.id,
    merge_type: 'bind_auxiliary_to_primary',
    reason: `${bind.provider}_bind_email`,
    operator_type: 'user',
    operator_id: user.id,
    before_snapshot: {},
    after_snapshot: { provider: bind.provider, email: normalizedEmail },
  });
  user.last_login_at = store.now();
  user.updated_at = store.now();
  store.saveDb();
  return loginResponse({ user, region: policy.region, provider: bind.provider, req });
}

function unbindIdentity({ userId, identityId }) {
  const identity = store.unbindIdentity(identityId, userId);
  if (!identity) throw new Error('Identity not found');
  store.appendAccountMergeLog({
    region: identity.region,
    source_user_id: userId,
    target_user_id: userId,
    identity_id: identity.id,
    merge_type: 'unbind_identity',
    reason: `${identity.provider}_unbind`,
    operator_type: 'user',
    operator_id: userId,
    before_snapshot: { provider: identity.provider },
    after_snapshot: { unbound_at: identity.unbound_at },
  });
  return identity;
}

module.exports = {
  normalizeRegion,
  normalizePhone,
  normalizeEmail,
  sendSmsCode,
  sendEmailCode,
  loginWithPhone,
  loginWithEmail,
  auxiliaryLogin,
  bindAuxiliaryWithPhone,
  bindAuxiliaryWithEmail,
  unbindIdentity,
};
