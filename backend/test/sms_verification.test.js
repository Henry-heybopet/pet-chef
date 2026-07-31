const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.SMS_VERIFICATION_SECRET = 'sms-verification-test-secret-32-bytes-minimum';
if (process.env.SMS_TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.SMS_TEST_DATABASE_URL;
}

const { getPool } = require('../src/data/pg_client');
const {
  createSmsVerificationService,
  normalizePhone,
  normalizeDeviceId,
  shanghaiDayStart,
  secondsUntilShanghaiTomorrow,
} = require('../src/services/sms_verification');
const {
  loginWithVerifiedPhone,
  completePhoneSignup,
} = require('../src/services/phone_auth');
const { generateToken, verifyToken } = require('../src/services/auth');

const hasDatabase = Boolean(process.env.SMS_TEST_DATABASE_URL);
const TEST_SECRET = () => process.env.SMS_VERIFICATION_SECRET;

test.after(async () => {
  if (hasDatabase) await getPool()?.end();
});

function assertErrorCode(expectedCode) {
  return error => {
    assert.equal(error.code, expectedCode);
    return true;
  };
}

async function resetDatabase() {
  const pool = getPool();
  await pool.query(`
    TRUNCATE TABLE
      sms_verification_challenges,
      household_members,
      households,
      user_identities,
      users
    CASCADE
  `);
}

function testHarness({ sender } = {}) {
  let now = new Date();
  const deliveries = [];
  const sendLoginCode = sender || (async (phone, code) => {
    deliveries.push({ phone, code });
    return { requestId: `request-${deliveries.length}` };
  });
  const service = createSmsVerificationService({
    getPool,
    sendLoginCode,
    now: () => new Date(now),
    generateCode: () => '582913',
    secret: TEST_SECRET,
  });
  return {
    service,
    deliveries,
    advance(milliseconds) {
      now = new Date(now.getTime() + milliseconds);
    },
  };
}

test('手机号、设备标识和上海自然日边界校验', () => {
  assert.equal(normalizePhone('+86 139-0000-0001'), '13900000001');
  assert.throws(() => normalizePhone('123456'), assertErrorCode('INVALID_PHONE'));
  assert.equal(normalizeDeviceId('device-1234567890'), 'device-1234567890');
  assert.throws(() => normalizeDeviceId('short'), assertErrorCode('INVALID_DEVICE_ID'));

  const beforeMidnight = new Date('2026-07-31T15:59:59.000Z');
  assert.equal(shanghaiDayStart(beforeMidnight).toISOString(), '2026-07-30T16:00:00.000Z');
  assert.equal(secondsUntilShanghaiTomorrow(beforeMidnight), 1);
});

test('JWT 默认会话为30天', () => {
  const token = generateToken('usr_sms_test');
  const claims = verifyToken(token);
  assert.ok(claims);
  assert.ok(Math.abs((claims.exp - claims.iat) - 30 * 24 * 60 * 60) <= 1);
});

test('PostgreSQL短信验证码安全策略', { skip: !hasDatabase }, async t => {
  await t.test('验证码5分钟有效且成功后只能使用一次', async () => {
    await resetDatabase();
    const harness = testHarness();
    await harness.service.sendCode({
      phone: '13900000001',
      ip: '127.0.0.1',
      deviceId: 'device-validity-0001',
    });
    assert.equal(harness.deliveries.length, 1);
    const verified = await harness.service.verifyCode({
      phone: '13900000001',
      code: harness.deliveries[0].code,
    });
    assert.ok(verified.challengeId);
    await assert.rejects(
      harness.service.verifyCode({ phone: '13900000001', code: harness.deliveries[0].code }),
      assertErrorCode('CODE_UNAVAILABLE'),
    );
  });

  await t.test('超过5分钟后验证码失效', async () => {
    await resetDatabase();
    const harness = testHarness();
    await harness.service.sendCode({
      phone: '13900000001',
      ip: '127.0.0.2',
      deviceId: 'device-expiry-000001',
    });
    harness.advance(5 * 60 * 1000 + 1);
    await assert.rejects(
      harness.service.verifyCode({ phone: '13900000001', code: '582913' }),
      assertErrorCode('CODE_EXPIRED'),
    );
  });

  await t.test('验证码失败5次后立即作废', async () => {
    await resetDatabase();
    const harness = testHarness();
    await harness.service.sendCode({
      phone: '13900000001',
      ip: '127.0.0.3',
      deviceId: 'device-failures-0001',
    });
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await assert.rejects(
        harness.service.verifyCode({ phone: '13900000001', code: '000000' }),
        assertErrorCode('CODE_MISMATCH'),
      );
    }
    await assert.rejects(
      harness.service.verifyCode({ phone: '13900000001', code: '000000' }),
      assertErrorCode('CODE_ATTEMPTS_EXHAUSTED'),
    );
    await assert.rejects(
      harness.service.verifyCode({ phone: '13900000001', code: '582913' }),
      assertErrorCode('CODE_UNAVAILABLE'),
    );
  });

  await t.test('已过期或失败的验证码仍计入手机号当日发送额度', async () => {
    await resetDatabase();
    const harness = testHarness();
    const request = count => ({
      phone: '13900000001',
      ip: `172.16.0.${count + 1}`,
      deviceId: `failed-daily-device-${String(count).padStart(3, '0')}`,
    });
    await harness.service.sendCode(request(0));
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await assert.rejects(
        harness.service.verifyCode({ phone: '13900000001', code: '000000' }),
        attempt === 4
          ? assertErrorCode('CODE_ATTEMPTS_EXHAUSTED')
          : assertErrorCode('CODE_MISMATCH'),
      );
    }
    harness.advance(61 * 1000);
    for (let count = 1; count < 10; count += 1) {
      await harness.service.sendCode(request(count));
      harness.advance(61 * 1000);
    }
    await assert.rejects(
      harness.service.sendCode(request(10)),
      assertErrorCode('PHONE_DAILY_LIMIT'),
    );
  });

  await t.test('同手机号60秒只能成功发送一次', async () => {
    await resetDatabase();
    const harness = testHarness();
    const request = {
      phone: '13900000001',
      ip: '127.0.0.4',
      deviceId: 'device-cooldown-0001',
    };
    await harness.service.sendCode(request);
    await assert.rejects(harness.service.sendCode(request), assertErrorCode('PHONE_COOLDOWN'));
  });

  await t.test('同手机号上海自然日最多成功发送10次', async () => {
    await resetDatabase();
    const harness = testHarness();
    for (let count = 0; count < 10; count += 1) {
      await harness.service.sendCode({
        phone: '13900000001',
        ip: `10.0.0.${count + 1}`,
        deviceId: `phone-daily-device-${String(count).padStart(3, '0')}`,
      });
      harness.advance(61 * 1000);
    }
    await assert.rejects(
      harness.service.sendCode({
        phone: '13900000001',
        ip: '10.0.0.20',
        deviceId: 'phone-daily-device-999',
      }),
      assertErrorCode('PHONE_DAILY_LIMIT'),
    );
  });

  await t.test('同IP地址5分钟最多成功发送5条', async () => {
    await resetDatabase();
    const harness = testHarness();
    const phones = ['13100000001', '13200000002', '13300000003', '13400000004', '13500000005'];
    for (let index = 0; index < phones.length; index += 1) {
      await harness.service.sendCode({
        phone: phones[index],
        ip: '192.0.2.10',
        deviceId: `ip-window-device-${String(index).padStart(3, '0')}`,
      });
    }
    await assert.rejects(
      harness.service.sendCode({
        phone: '13600000006',
        ip: '192.0.2.10',
        deviceId: 'ip-window-device-999',
      }),
      assertErrorCode('IP_WINDOW_LIMIT'),
    );
  });

  await t.test('同IP并发发送中的预留也参与5分钟限频', async () => {
    await resetDatabase();
    let releaseSender;
    const senderGate = new Promise(resolve => {
      releaseSender = resolve;
    });
    const harness = testHarness({
      sender: async () => {
        await senderGate;
        return { requestId: 'concurrent-request' };
      },
    });
    const inFlight = Array.from({ length: 5 }, (_, index) => harness.service.sendCode({
      phone: `18${String(100000000 + index).padStart(9, '0')}`,
      ip: '192.0.2.99',
      deviceId: `concurrent-device-${String(index).padStart(3, '0')}`,
    }));

    for (let attempt = 0; attempt < 100; attempt += 1) {
      const pending = await getPool().query(
        `SELECT COUNT(*)::int AS count
           FROM sms_verification_challenges
          WHERE status = 'pending'`,
      );
      if (pending.rows[0].count === 5) break;
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    await assert.rejects(
      harness.service.sendCode({
        phone: '18999999999',
        ip: '192.0.2.99',
        deviceId: 'concurrent-device-999',
      }),
      assertErrorCode('IP_WINDOW_LIMIT'),
    );
    releaseSender();
    await Promise.all(inFlight);
  });

  await t.test('同IP地址上海自然日最多成功发送50条', async () => {
    await resetDatabase();
    const harness = testHarness();
    for (let count = 0; count < 50; count += 1) {
      await harness.service.sendCode({
        phone: `13${String(100000000 + count).padStart(9, '0')}`,
        ip: '192.0.2.50',
        deviceId: `ip-daily-device-${String(count).padStart(3, '0')}`,
      });
      if ((count + 1) % 5 === 0) harness.advance(5 * 60 * 1000 + 1);
    }
    await assert.rejects(
      harness.service.sendCode({
        phone: '13999999999',
        ip: '192.0.2.50',
        deviceId: 'ip-daily-device-999',
      }),
      assertErrorCode('IP_DAILY_LIMIT'),
    );
  });

  await t.test('同设备5分钟最多成功发送5条', async () => {
    await resetDatabase();
    const harness = testHarness();
    const phones = ['13100000011', '13200000012', '13300000013', '13400000014', '13500000015'];
    for (let index = 0; index < phones.length; index += 1) {
      await harness.service.sendCode({
        phone: phones[index],
        ip: `198.51.100.${index + 1}`,
        deviceId: 'shared-device-000001',
      });
    }
    await assert.rejects(
      harness.service.sendCode({
        phone: '13600000016',
        ip: '198.51.100.20',
        deviceId: 'shared-device-000001',
      }),
      assertErrorCode('DEVICE_WINDOW_LIMIT'),
    );
  });

  await t.test('同设备上海自然日最多成功发送50条', async () => {
    await resetDatabase();
    const harness = testHarness();
    for (let count = 0; count < 50; count += 1) {
      await harness.service.sendCode({
        phone: `15${String(100000000 + count).padStart(9, '0')}`,
        ip: `198.18.${Math.floor(count / 250)}.${(count % 250) + 1}`,
        deviceId: 'device-daily-shared-01',
      });
      if ((count + 1) % 5 === 0) harness.advance(5 * 60 * 1000 + 1);
    }
    await assert.rejects(
      harness.service.sendCode({
        phone: '15999999999',
        ip: '198.18.1.1',
        deviceId: 'device-daily-shared-01',
      }),
      assertErrorCode('DEVICE_DAILY_LIMIT'),
    );
  });

  await t.test('阿里云拒绝的发送不占手机号配额', async () => {
    await resetDatabase();
    const failedHarness = testHarness({
      sender: async () => {
        const error = new Error('provider rejected');
        error.status = 502;
        error.code = 'PROVIDER_REJECTED';
        throw error;
      },
    });
    const request = {
      phone: '13900000001',
      ip: '203.0.113.1',
      deviceId: 'provider-fail-device',
    };
    await assert.rejects(failedHarness.service.sendCode(request), assertErrorCode('PROVIDER_REJECTED'));

    const successfulHarness = testHarness();
    await successfulHarness.service.sendCode(request);
    assert.equal(successfulHarness.deliveries.length, 1);
  });

  await t.test('新手机号验证码通过后设置用户名，旧密码字段保持为空且注册令牌不可重放', async () => {
    await resetDatabase();
    const harness = testHarness();
    await harness.service.sendCode({
      phone: '13900000001',
      ip: '203.0.113.2',
      deviceId: 'registration-device-01',
    });
    const verification = await harness.service.verifyCode({
      phone: '13900000001',
      code: '582913',
    });
    const firstLogin = await loginWithVerifiedPhone({
      phone: verification.phone,
      acceptedTerms: true,
      acceptedPrivacy: true,
    });
    assert.equal(firstLogin.needsUsername, true);

    const registrationToken = harness.service.createRegistrationToken(verification);
    const registration = harness.service.verifyRegistrationToken(registrationToken);
    const signup = await completePhoneSignup({
      ...registration,
      username: '短信测试用户',
      acceptedTerms: true,
      acceptedPrivacy: true,
    });
    assert.equal(signup.user.display_name, '短信测试用户');

    const row = await getPool().query(
      `SELECT i.password_hash, u.terms_accepted_at, u.privacy_accepted_at
         FROM user_identities i JOIN users u ON u.id = i.user_id
        WHERE i.provider_user_id = $1`,
      ['13900000001'],
    );
    assert.equal(row.rows[0].password_hash, null);
    assert.ok(row.rows[0].terms_accepted_at);
    assert.ok(row.rows[0].privacy_accepted_at);

    await assert.rejects(
      completePhoneSignup({
        ...registration,
        username: '重放用户',
        acceptedTerms: true,
        acceptedPrivacy: true,
      }),
      /注册验证已失效/,
    );
  });
});
