const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { getPool } = require('../data/pg_client');
const { sendLoginCode } = require('./sms_sender');

const CODE_TTL_MS = 5 * 60 * 1000;
const PHONE_COOLDOWN_MS = 60 * 1000;
const PHONE_DAILY_LIMIT = 10;
const IP_WINDOW_MS = 5 * 60 * 1000;
const IP_WINDOW_LIMIT = 5;
const IP_DAILY_LIMIT = 50;
const DEVICE_WINDOW_LIMIT = 5;
const DEVICE_DAILY_LIMIT = 50;
const MAX_FAILED_ATTEMPTS = 5;
const REGISTRATION_TTL = '10m';
const PENDING_TTL_MS = 2 * 60 * 1000;
const COUNTED_SEND_STATUSES = ['pending', 'active', 'verified', 'registered', 'invalidated', 'expired', 'failed'];

function smsError(message, status, code, retryAfterSeconds) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  if (retryAfterSeconds) error.retryAfterSeconds = retryAfterSeconds;
  return error;
}

function normalizePhone(input) {
  let value = String(input || '').trim().replace(/[\s-]/g, '');
  if (value.startsWith('+86')) value = value.slice(3);
  else if (value.startsWith('86') && value.length === 13) value = value.slice(2);
  if (!/^1[3-9]\d{9}$/.test(value)) {
    throw smsError('请输入有效的中国大陆手机号', 400, 'INVALID_PHONE');
  }
  return value;
}

function normalizeDeviceId(input) {
  const value = String(input || '').trim();
  if (!/^[A-Za-z0-9._:-]{16,128}$/.test(value)) {
    throw smsError('设备标识无效，请重启 App 后重试', 400, 'INVALID_DEVICE_ID');
  }
  return value;
}

function verificationSecret() {
  const value = String(process.env.SMS_VERIFICATION_SECRET || '');
  if (value.length >= 32) return value;
  if (process.env.NODE_ENV === 'test') return 'test-only-sms-verification-secret-32-bytes';
  throw smsError('短信验证码安全密钥未配置', 503, 'SMS_SECRET_MISSING');
}

function hmac(purpose, value, secret = verificationSecret()) {
  return crypto.createHmac('sha256', secret).update(`${purpose}:${value}`).digest('hex');
}

function codeHash(challengeId, phone, code, secret = verificationSecret()) {
  return hmac('code', `${challengeId}:${phone}:${code}`, secret);
}

function safeEqualHex(actual, expected) {
  const actualBuffer = Buffer.from(String(actual || ''), 'hex');
  const expectedBuffer = Buffer.from(String(expected || ''), 'hex');
  return actualBuffer.length > 0
    && actualBuffer.length === expectedBuffer.length
    && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function shanghaiDayStart(now) {
  const shifted = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return new Date(Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate(),
  ) - 8 * 60 * 60 * 1000);
}

function secondsUntilShanghaiTomorrow(now) {
  return Math.max(1, Math.ceil((shanghaiDayStart(new Date(now.getTime() + 24 * 60 * 60 * 1000)) - now) / 1000));
}

function generateCode() {
  return crypto.randomInt(0, 1000000).toString().padStart(6, '0');
}

async function lockKeys(client, keys) {
  for (const key of [...new Set(keys)].sort()) {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [key]);
  }
}

async function scalarCount(client, sql, params) {
  const result = await client.query(sql, params);
  return Number(result.rows[0]?.count || 0);
}

function createSmsVerificationService(options = {}) {
  const poolProvider = options.getPool || getPool;
  const sender = options.sendLoginCode || sendLoginCode;
  const nowProvider = options.now || (() => new Date());
  const codeProvider = options.generateCode || generateCode;
  const secretProvider = options.secret || verificationSecret;

  async function sendCode({ phone, ip, deviceId }) {
    const normalizedPhone = normalizePhone(phone);
    const normalizedDeviceId = normalizeDeviceId(deviceId);
    const secret = secretProvider();
    const phoneHash = hmac('phone', normalizedPhone, secret);
    const ipHash = hmac('ip', String(ip || 'unknown'), secret);
    const deviceHash = hmac('device', normalizedDeviceId, secret);
    const now = nowProvider();
    const dayStart = shanghaiDayStart(now);
    const challengeId = `sms_${crypto.randomUUID()}`;
    const code = codeProvider();
    const pool = poolProvider();
    if (!pool) throw smsError('数据库不可用', 503, 'DATABASE_UNAVAILABLE');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await lockKeys(client, [`phone:${phoneHash}`, `ip:${ipHash}`, `device:${deviceHash}`]);
      await client.query(
        `UPDATE sms_verification_challenges
            SET status = 'provider_failed', provider_error_code = 'SEND_TIMEOUT', updated_at = $4
          WHERE status = 'pending'
            AND created_at < $5
            AND (phone_hash = $1 OR ip_hash = $2 OR device_hash = $3)`,
        [phoneHash, ipHash, deviceHash, now, new Date(now.getTime() - PENDING_TTL_MS)],
      );

      const pending = await scalarCount(
        client,
        `SELECT COUNT(*) AS count
           FROM sms_verification_challenges
          WHERE phone_hash = $1 AND status = 'pending' AND created_at >= $2`,
        [phoneHash, new Date(now.getTime() - PENDING_TTL_MS)],
      );
      if (pending) throw smsError('验证码正在发送，请稍后重试', 429, 'SMS_SEND_IN_PROGRESS', 10);

      const recent = await scalarCount(
        client,
        `SELECT COUNT(*) AS count
           FROM sms_verification_challenges
          WHERE phone_hash = $1 AND status = ANY($2) AND COALESCE(sent_at, created_at) >= $3`,
        [phoneHash, COUNTED_SEND_STATUSES, new Date(now.getTime() - PHONE_COOLDOWN_MS)],
      );
      if (recent) throw smsError('请在60秒后重新获取验证码', 429, 'PHONE_COOLDOWN', 60);

      const phoneDaily = await scalarCount(
        client,
        `SELECT COUNT(*) AS count
           FROM sms_verification_challenges
          WHERE phone_hash = $1 AND status = ANY($2) AND COALESCE(sent_at, created_at) >= $3`,
        [phoneHash, COUNTED_SEND_STATUSES, dayStart],
      );
      if (phoneDaily >= PHONE_DAILY_LIMIT) {
        throw smsError('该手机号今日获取验证码次数已达上限', 429, 'PHONE_DAILY_LIMIT', secondsUntilShanghaiTomorrow(now));
      }

      const ipWindow = await scalarCount(
        client,
        `SELECT COUNT(*) AS count
           FROM sms_verification_challenges
          WHERE ip_hash = $1 AND status = ANY($2) AND COALESCE(sent_at, created_at) >= $3`,
        [ipHash, COUNTED_SEND_STATUSES, new Date(now.getTime() - IP_WINDOW_MS)],
      );
      if (ipWindow >= IP_WINDOW_LIMIT) {
        throw smsError('请求过于频繁，请稍后重试', 429, 'IP_WINDOW_LIMIT', Math.ceil(IP_WINDOW_MS / 1000));
      }

      const ipDaily = await scalarCount(
        client,
        `SELECT COUNT(*) AS count
           FROM sms_verification_challenges
          WHERE ip_hash = $1 AND status = ANY($2) AND COALESCE(sent_at, created_at) >= $3`,
        [ipHash, COUNTED_SEND_STATUSES, dayStart],
      );
      if (ipDaily >= IP_DAILY_LIMIT) {
        throw smsError('今日请求次数已达上限', 429, 'IP_DAILY_LIMIT', secondsUntilShanghaiTomorrow(now));
      }

      const deviceWindow = await scalarCount(
        client,
        `SELECT COUNT(*) AS count
           FROM sms_verification_challenges
          WHERE device_hash = $1 AND status = ANY($2) AND COALESCE(sent_at, created_at) >= $3`,
        [deviceHash, COUNTED_SEND_STATUSES, new Date(now.getTime() - IP_WINDOW_MS)],
      );
      if (deviceWindow >= DEVICE_WINDOW_LIMIT) {
        throw smsError('设备请求过于频繁，请稍后重试', 429, 'DEVICE_WINDOW_LIMIT', Math.ceil(IP_WINDOW_MS / 1000));
      }

      const deviceDaily = await scalarCount(
        client,
        `SELECT COUNT(*) AS count
           FROM sms_verification_challenges
          WHERE device_hash = $1 AND status = ANY($2) AND COALESCE(sent_at, created_at) >= $3`,
        [deviceHash, COUNTED_SEND_STATUSES, dayStart],
      );
      if (deviceDaily >= DEVICE_DAILY_LIMIT) {
        throw smsError('该设备今日请求次数已达上限', 429, 'DEVICE_DAILY_LIMIT', secondsUntilShanghaiTomorrow(now));
      }

      await client.query(
        `INSERT INTO sms_verification_challenges
          (id, phone_hash, ip_hash, device_hash, code_hash, status, failed_attempts, expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', 0, $6, $7, $7)`,
        [
          challengeId,
          phoneHash,
          ipHash,
          deviceHash,
          codeHash(challengeId, normalizedPhone, code, secret),
          new Date(now.getTime() + CODE_TTL_MS),
          now,
        ],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    let providerResult;
    try {
      providerResult = await sender(normalizedPhone, code);
    } catch (error) {
      await pool.query(
        `UPDATE sms_verification_challenges
            SET status = 'provider_failed', provider_error_code = $2, updated_at = $3
          WHERE id = $1`,
        [challengeId, String(error.code || 'SMS_PROVIDER_ERROR').slice(0, 120), nowProvider()],
      ).catch(() => {});
      throw error;
    }

    const finalClient = await pool.connect();
    try {
      await finalClient.query('BEGIN');
      await lockKeys(finalClient, [`phone:${phoneHash}`]);
      await finalClient.query(
        `UPDATE sms_verification_challenges
            SET status = 'invalidated', updated_at = $2
          WHERE phone_hash = $1 AND status = 'active' AND id <> $3`,
        [phoneHash, nowProvider(), challengeId],
      );
      await finalClient.query(
        `UPDATE sms_verification_challenges
            SET status = 'active', sent_at = $2, provider_request_id = $3, updated_at = $2
          WHERE id = $1 AND status = 'pending'`,
        [challengeId, nowProvider(), String(providerResult.requestId || providerResult.bizId || '').slice(0, 160)],
      );
      await finalClient.query('COMMIT');
    } catch (error) {
      await finalClient.query('ROLLBACK');
      throw smsError('验证码状态保存失败，请重新获取', 503, 'SMS_FINALIZE_FAILED');
    } finally {
      finalClient.release();
    }

    return { cooldownSeconds: 60, expiresInSeconds: 300 };
  }

  async function verifyCode({ phone, code }) {
    const normalizedPhone = normalizePhone(phone);
    const normalizedCode = String(code || '').trim();
    if (!/^\d{6}$/.test(normalizedCode)) {
      throw smsError('请输入6位数字验证码', 400, 'INVALID_CODE_FORMAT');
    }
    const secret = secretProvider();
    const phoneHash = hmac('phone', normalizedPhone, secret);
    const now = nowProvider();
    const pool = poolProvider();
    if (!pool) throw smsError('数据库不可用', 503, 'DATABASE_UNAVAILABLE');

    const client = await pool.connect();
    let transactionFinished = false;
    try {
      await client.query('BEGIN');
      await lockKeys(client, [`phone:${phoneHash}`]);
      const result = await client.query(
        `SELECT *
           FROM sms_verification_challenges
          WHERE phone_hash = $1 AND status = 'active'
          ORDER BY sent_at DESC
          LIMIT 1
          FOR UPDATE`,
        [phoneHash],
      );
      const challenge = result.rows[0];
      if (!challenge) throw smsError('验证码无效或已过期，请重新获取', 401, 'CODE_UNAVAILABLE');

      if (new Date(challenge.expires_at) <= now) {
        await client.query(
          `UPDATE sms_verification_challenges SET status = 'expired', updated_at = $2 WHERE id = $1`,
          [challenge.id, now],
        );
        await client.query('COMMIT');
        transactionFinished = true;
        throw smsError('验证码无效或已过期，请重新获取', 401, 'CODE_EXPIRED');
      }

      if (challenge.failed_attempts >= MAX_FAILED_ATTEMPTS) {
        await client.query(
          `UPDATE sms_verification_challenges SET status = 'failed', updated_at = $2 WHERE id = $1`,
          [challenge.id, now],
        );
        await client.query('COMMIT');
        transactionFinished = true;
        throw smsError('验证码已失效，请重新获取', 401, 'CODE_ATTEMPTS_EXHAUSTED');
      }

      const matches = safeEqualHex(
        codeHash(challenge.id, normalizedPhone, normalizedCode, secret),
        challenge.code_hash,
      );
      if (!matches) {
        const failedAttempts = Number(challenge.failed_attempts) + 1;
        await client.query(
          `UPDATE sms_verification_challenges
              SET failed_attempts = $2, status = $3, updated_at = $4
            WHERE id = $1`,
          [challenge.id, failedAttempts, failedAttempts >= MAX_FAILED_ATTEMPTS ? 'failed' : 'active', now],
        );
        await client.query('COMMIT');
        transactionFinished = true;
        if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
          throw smsError('验证码错误次数过多，请重新获取', 401, 'CODE_ATTEMPTS_EXHAUSTED');
        }
        throw smsError(`验证码错误，还可尝试${MAX_FAILED_ATTEMPTS - failedAttempts}次`, 401, 'CODE_MISMATCH');
      }

      await client.query(
        `UPDATE sms_verification_challenges
            SET status = 'verified', verified_at = $2, updated_at = $2
          WHERE id = $1`,
        [challenge.id, now],
      );
      await client.query('COMMIT');
      transactionFinished = true;
      return { phone: normalizedPhone, phoneHash, challengeId: challenge.id };
    } catch (error) {
      if (!transactionFinished) {
        await client.query('ROLLBACK').catch(() => {});
      }
      throw error;
    } finally {
      client.release();
    }
  }

  function createRegistrationToken({ phone, challengeId }) {
    return jwt.sign(
      { purpose: 'sms_signup', phone, challenge_id: challengeId },
      secretProvider(),
      { expiresIn: REGISTRATION_TTL },
    );
  }

  function verifyRegistrationToken(token) {
    try {
      const claims = jwt.verify(String(token || ''), secretProvider());
      if (claims.purpose !== 'sms_signup' || !claims.phone || !claims.challenge_id) throw new Error('invalid');
      return {
        phone: normalizePhone(claims.phone),
        challengeId: String(claims.challenge_id),
      };
    } catch {
      throw smsError('注册验证已失效，请重新获取短信验证码', 401, 'REGISTRATION_TOKEN_INVALID');
    }
  }

  return { sendCode, verifyCode, createRegistrationToken, verifyRegistrationToken };
}

const smsVerification = createSmsVerificationService();

module.exports = {
  ...smsVerification,
  createSmsVerificationService,
  normalizePhone,
  normalizeDeviceId,
  shanghaiDayStart,
  secondsUntilShanghaiTomorrow,
  codeHash,
  safeEqualHex,
  MAX_FAILED_ATTEMPTS,
};
