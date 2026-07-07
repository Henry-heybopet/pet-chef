const assert = require('assert');
const store = require('./src/services/heybo_store');
const accountAuth = require('./src/services/account_auth');
const auth = require('./src/services/auth');

function mockReq(region = 'CN', ip = '127.0.0.1') {
  return {
    ip,
    body: {},
    query: {},
    get(name) {
      const headers = {
        'x-heybo-region': region,
        'user-agent': 'account-auth-test',
        'x-device-id': `test-device-${region}`,
        'x-platform': 'node-test',
      };
      return headers[String(name).toLowerCase()] || '';
    },
  };
}

function latestDebugCode(result) {
  assert.ok(result.success);
  assert.ok(result.debug_code);
  return result.debug_code;
}

function resetThrottle(collectionName) {
  store.db[collectionName].forEach(record => {
    record.created_at = new Date(Date.now() - 61000).toISOString();
  });
  store.saveDb();
}

function ageVerificationRecords(ms = 61000) {
  ['sms_verification_codes', 'email_verification_codes'].forEach(collectionName => {
    store.db[collectionName].forEach(record => {
      record.created_at = new Date(Date.now() - ms).toISOString();
    });
  });
  store.saveDb();
}

store.resetForTests();

const sms = accountAuth.sendSmsCode({ region: 'CN', countryCode: '86', phone: '138 0000 0001', req: mockReq('CN') });
const phoneLogin = accountAuth.loginWithPhone({
  region: 'CN',
  countryCode: '86',
  phone: '13800000001',
  code: latestDebugCode(sms),
  req: mockReq('CN'),
});
assert.ok(phoneLogin.access_token);
assert.equal(phoneLogin.user.region, 'CN');
assert.equal(phoneLogin.user.primary_phone, '13800000001');

const refreshed = auth.refreshSession(phoneLogin.refresh_token);
assert.ok(refreshed.accessToken);
auth.revokeSession(phoneLogin.refresh_token);
assert.throws(() => auth.refreshSession(phoneLogin.refresh_token), /Invalid refresh token/);

const wechat = accountAuth.auxiliaryLogin({
  region: 'CN',
  provider: 'wechat',
  credential: 'wechat-code-1',
  req: mockReq('CN'),
});
assert.equal(wechat.status, 'need_bind_phone');
resetThrottle('sms_verification_codes');
const bindSms = accountAuth.sendSmsCode({ region: 'CN', countryCode: '86', phone: '13800000001', scene: 'bind_wechat', req: mockReq('CN') });
const wechatBound = accountAuth.bindAuxiliaryWithPhone({
  bindToken: wechat.bind_token,
  countryCode: '86',
  phone: '13800000001',
  code: latestDebugCode(bindSms),
  req: mockReq('CN'),
});
assert.equal(wechatBound.user.id, phoneLogin.user.id);
assert.ok(store.getUserIdentities(phoneLogin.user.id).some(identity => identity.provider === 'wechat'));

const wechatAgain = accountAuth.auxiliaryLogin({
  region: 'CN',
  provider: 'wechat',
  credential: 'wechat-code-1',
  req: mockReq('CN'),
});
assert.equal(wechatAgain.user.id, phoneLogin.user.id);

const email = accountAuth.sendEmailCode({ region: 'US', email: 'Owner@HeyboPet.com', req: mockReq('US') });
const emailLogin = accountAuth.loginWithEmail({
  region: 'US',
  email: 'owner@heybopet.com',
  code: latestDebugCode(email),
  req: mockReq('US'),
});
assert.equal(emailLogin.user.region, 'US');
assert.equal(emailLogin.user.primary_email, 'owner@heybopet.com');

const google = accountAuth.auxiliaryLogin({
  region: 'US',
  provider: 'google',
  credential: 'google-id-token-1',
  req: mockReq('US'),
});
assert.equal(google.status, 'need_bind_email');
resetThrottle('email_verification_codes');
const bindEmail = accountAuth.sendEmailCode({ region: 'US', email: 'owner@heybopet.com', scene: 'bind_google', req: mockReq('US') });
const googleBound = accountAuth.bindAuxiliaryWithEmail({
  bindToken: google.bind_token,
  email: 'owner@heybopet.com',
  code: latestDebugCode(bindEmail),
  req: mockReq('US'),
});
assert.equal(googleBound.user.id, emailLogin.user.id);

const euEmail = accountAuth.sendEmailCode({ region: 'EU', email: 'owner@heybopet.com', req: mockReq('EU') });
const euLogin = accountAuth.loginWithEmail({
  region: 'EU',
  email: 'owner@heybopet.com',
  code: latestDebugCode(euEmail),
  req: mockReq('EU'),
});
assert.equal(euLogin.user.region, 'EU');
assert.notEqual(euLogin.user.id, emailLogin.user.id);

const apple = accountAuth.auxiliaryLogin({
  region: 'EU',
  provider: 'apple',
  credential: 'apple-identity-token-1',
  req: mockReq('EU'),
});
assert.equal(apple.status, 'need_bind_email');

const googleIdentity = store.getUserIdentities(emailLogin.user.id).find(identity => identity.provider === 'google');
const unbound = accountAuth.unbindIdentity({ userId: emailLogin.user.id, identityId: googleIdentity.id });
assert.equal(unbound.provider, 'google');
assert.ok(store.db.account_merge_logs.length >= 2);

store.resetForTests();

for (let i = 0; i < 10; i += 1) {
  accountAuth.sendSmsCode({
    region: 'CN',
    countryCode: '86',
    phone: '13900000001',
    req: mockReq('CN', '10.0.0.1'),
  });
  ageVerificationRecords();
}
assert.throws(() => accountAuth.sendSmsCode({
  region: 'CN',
  countryCode: '86',
  phone: '13900000001',
  req: mockReq('CN', '10.0.0.1'),
}), /Daily verification code send limit exceeded/);

store.resetForTests();

for (let i = 0; i < 10; i += 1) {
  accountAuth.sendSmsCode({
    region: 'CN',
    countryCode: '86',
    phone: `139000001${String(i).padStart(2, '0')}`,
    req: mockReq('CN', '10.0.0.2'),
  });
}
assert.throws(() => accountAuth.sendSmsCode({
  region: 'CN',
  countryCode: '86',
  phone: '13900000200',
  req: mockReq('CN', '10.0.0.2'),
}), /IP verification code send rate limit exceeded/);

store.resetForTests();

for (let i = 0; i < 30; i += 1) {
  accountAuth.sendSmsCode({
    region: 'CN',
    countryCode: '86',
    phone: `1390001${String(i).padStart(4, '0')}`,
    req: mockReq('CN', '10.0.0.3'),
  });
  ageVerificationRecords();
}
assert.throws(() => accountAuth.sendSmsCode({
  region: 'CN',
  countryCode: '86',
  phone: '13900019999',
  req: mockReq('CN', '10.0.0.3'),
}), /IP daily verification code send limit exceeded/);

store.resetForTests();

const attemptSms = accountAuth.sendSmsCode({
  region: 'CN',
  countryCode: '86',
  phone: '13900000002',
  req: mockReq('CN', '10.0.0.4'),
});
assert.ok(attemptSms.debug_code);
for (let i = 0; i < 5; i += 1) {
  assert.throws(() => accountAuth.loginWithPhone({
    region: 'CN',
    countryCode: '86',
    phone: '13900000002',
    code: '000000',
    req: mockReq('CN', '10.0.0.4'),
  }), /Invalid verification code/);
}
assert.throws(() => accountAuth.loginWithPhone({
  region: 'CN',
  countryCode: '86',
  phone: '13900000002',
  code: '000000',
  req: mockReq('CN', '10.0.0.4'),
}), /Verification code attempt limit exceeded/);

store.resetForTests();

accountAuth.sendSmsCode({
  region: 'CN',
  countryCode: '86',
  phone: '13900000003',
  req: mockReq('CN', '10.0.0.5'),
});
for (let i = 0; i < 10; i += 1) {
  assert.throws(() => accountAuth.loginWithPhone({
    region: 'CN',
    countryCode: '86',
    phone: '13900000003',
    code: '000000',
    req: mockReq('CN', '10.0.0.5'),
  }), /Invalid verification code|Verification code attempt limit exceeded/);
}
assert.throws(() => accountAuth.loginWithPhone({
  region: 'CN',
  countryCode: '86',
  phone: '13900000003',
  code: latestDebugCode({ success: true, debug_code: 'unused' }),
  req: mockReq('CN', '10.0.0.5'),
}), /Verification target locked due to repeated failures/);

console.log('account auth tests passed');
