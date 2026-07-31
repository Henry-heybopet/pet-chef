const crypto = require('crypto');
const { getPool } = require('../data/pg_client');
const { normalizePhone } = require('./sms_verification');

function nowIso() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function maskPhone(phone) {
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function loginHash(phone) {
  return crypto.createHash('sha256').update(phone).digest('hex');
}

function publicUser(row) {
  if (!row) return null;
  const { deleted_at, password_hash, ...user } = row;
  return user;
}

function assertConsent(acceptedTerms, acceptedPrivacy) {
  if (acceptedTerms !== true || acceptedPrivacy !== true) {
    const error = new Error('请先阅读并同意《用户协议》和《隐私政策》');
    error.status = 400;
    error.code = 'AGREEMENTS_REQUIRED';
    throw error;
  }
}

function consentValues() {
  return {
    termsVersion: process.env.TERMS_VERSION || '2026-07-31',
    privacyVersion: process.env.PRIVACY_VERSION || '2026-07-31',
  };
}

function assertUsername(username) {
  const value = String(username || '').trim();
  if (!value) {
    const error = new Error('用户名不能为空');
    error.status = 400;
    throw error;
  }
  if (value.length > 18) {
    const error = new Error('用户名最多18位');
    error.status = 400;
    throw error;
  }
  if (!/^[\u4e00-\u9fa5A-Za-z0-9]{1,18}$/.test(value)) {
    const error = new Error('用户名仅支持中文、英文和数字');
    error.status = 400;
    throw error;
  }
  if (/^\d+$/.test(value)) {
    const error = new Error('用户名不能为纯数字');
    error.status = 400;
    throw error;
  }
  return value;
}

async function loginWithVerifiedPhone({ phone, acceptedTerms, acceptedPrivacy }) {
  assertConsent(acceptedTerms, acceptedPrivacy);
  const normalizedPhone = normalizePhone(phone);
  const pool = getPool();
  if (!pool) {
    const error = new Error('数据库不可用');
    error.status = 503;
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const identityResult = await client.query(
      `SELECT i.user_id, u.*
         FROM user_identities i
         JOIN users u ON u.id = i.user_id
        WHERE i.provider = 'phone'
          AND i.provider_user_id = $1
          AND u.deleted_at IS NULL
          AND u.status = 'active'
        LIMIT 1
        FOR UPDATE OF u`,
      [normalizedPhone],
    );

    if (!identityResult.rows.length) {
      await client.query('COMMIT');
      return {
        needsUsername: true,
        phone: normalizedPhone,
        maskedPhone: maskPhone(normalizedPhone),
      };
    }

    const row = identityResult.rows[0];
    const timestamp = nowIso();
    const { termsVersion, privacyVersion } = consentValues();
    const userResult = await client.query(
      `UPDATE users
          SET last_login_at = $1,
              terms_accepted_at = $1,
              terms_version = $2,
              privacy_accepted_at = $1,
              privacy_version = $3,
              updated_at = $1
        WHERE id = $4
        RETURNING *`,
      [timestamp, termsVersion, privacyVersion, row.user_id],
    );
    const householdResult = await client.query(
      `SELECT h.*
         FROM households h
         JOIN household_members hm ON hm.household_id = h.id
        WHERE hm.user_id = $1 AND hm.role = 'owner' AND hm.status = 'active'
        ORDER BY h.created_at ASC
        LIMIT 1`,
      [row.user_id],
    );

    await client.query('COMMIT');
    return { user: publicUser(userResult.rows[0]), household: householdResult.rows[0] || null };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function completePhoneSignup({
  phone,
  challengeId,
  username,
  acceptedTerms,
  acceptedPrivacy,
}) {
  assertConsent(acceptedTerms, acceptedPrivacy);
  const normalizedPhone = normalizePhone(phone);
  const displayName = assertUsername(username);
  const pool = getPool();
  if (!pool) {
    const error = new Error('数据库不可用');
    error.status = 503;
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const challengeResult = await client.query(
      `SELECT id
         FROM sms_verification_challenges
        WHERE id = $1
          AND status = 'verified'
          AND registration_completed_at IS NULL
          AND verified_at > NOW() - INTERVAL '10 minutes'
        FOR UPDATE`,
      [challengeId],
    );
    if (!challengeResult.rows.length) {
      const error = new Error('注册验证已失效，请重新获取短信验证码');
      error.status = 401;
      throw error;
    }

    const existingIdentity = await client.query(
      `SELECT 1 FROM user_identities WHERE provider = 'phone' AND provider_user_id = $1 LIMIT 1`,
      [normalizedPhone],
    );
    if (existingIdentity.rows.length) {
      const error = new Error('手机号已存在，请直接登录');
      error.status = 409;
      throw error;
    }

    const existingName = await client.query('SELECT 1 FROM users WHERE display_name = $1 LIMIT 1', [displayName]);
    if (existingName.rows.length) {
      const error = new Error('该用户名已被使用，请换一个');
      error.status = 409;
      throw error;
    }

    const timestamp = nowIso();
    const { termsVersion, privacyVersion } = consentValues();
    const userId = id('usr');
    const identityId = id('idt');
    const householdId = id('hhd');
    const memberId = id('hhm');

    const userResult = await client.query(
      `INSERT INTO users
        (id, display_name, avatar_url, primary_phone, primary_email, country_code, region, language, timezone,
         status, terms_accepted_at, terms_version, privacy_accepted_at, privacy_version,
         last_login_at, created_at, updated_at)
       VALUES
        ($1, $2, '', $3, '', '86', 'CN', 'zh', 'Asia/Shanghai',
         'active', $4, $5, $4, $6, $4, $4, $4)
       RETURNING *`,
      [userId, displayName, normalizedPhone, timestamp, termsVersion, privacyVersion],
    );

    await client.query(
      `INSERT INTO user_identities
        (id, user_id, provider, provider_user_id, login_hash, password_hash, phone_country_code, is_primary, verified_at, created_at)
       VALUES
        ($1, $2, 'phone', $3, $4, NULL, '86', true, $5, $5)`,
      [identityId, userId, normalizedPhone, loginHash(normalizedPhone), timestamp],
    );
    await client.query(
      `INSERT INTO households
        (id, name, owner_user_id, region, address_id, created_at, updated_at)
       VALUES
        ($1, '我的家庭', $2, 'CN', '', $3, $3)`,
      [householdId, userId, timestamp],
    );
    await client.query(
      `INSERT INTO household_members
        (id, household_id, user_id, role, status, invited_by, joined_at)
       VALUES
        ($1, $2, $3, 'owner', 'active', '', $4)`,
      [memberId, householdId, userId, timestamp],
    );
    await client.query(
      `UPDATE sms_verification_challenges
          SET status = 'registered', registration_completed_at = $2, updated_at = $2
        WHERE id = $1`,
      [challengeId, timestamp],
    );

    await client.query('COMMIT');
    return { user: publicUser(userResult.rows[0]) };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  loginWithVerifiedPhone,
  completePhoneSignup,
  assertConsent,
  assertUsername,
  maskPhone,
};
