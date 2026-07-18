const crypto = require('crypto');
const { getPool } = require('../data/pg_client');

const PASSWORD_ITERATIONS = 120000;
const PASSWORD_KEYLEN = 32;
const PASSWORD_DIGEST = 'sha256';

function nowIso() {
  return new Date().toISOString();
}

function id(prefix) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function normalizePhone(phone) {
  return String(phone || '').replace(/[^\d]/g, '');
}

function isMainlandPhone(value) {
  return /^1[3-9]\d{9}$/.test(String(value || ''));
}

function maskPhone(phone) {
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function loginHash(phone) {
  return crypto.createHash('sha256').update(phone).digest('hex');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(String(password), salt, PASSWORD_ITERATIONS, PASSWORD_KEYLEN, PASSWORD_DIGEST).toString('hex');
  return `pbkdf2$${PASSWORD_ITERATIONS}$${salt}$${hash}`;
}

function verifyPassword(password, storedHash) {
  const [scheme, iterations, salt, expected] = String(storedHash || '').split('$');
  if (scheme !== 'pbkdf2' || !iterations || !salt || !expected) return false;
  const actual = crypto.pbkdf2Sync(String(password), salt, Number(iterations), PASSWORD_KEYLEN, PASSWORD_DIGEST);
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actual.length === expectedBuffer.length && crypto.timingSafeEqual(actual, expectedBuffer);
}

function publicUser(row) {
  if (!row) return null;
  const { deleted_at, password_hash, ...user } = row;
  return user;
}

function assertPassword(password) {
  if (!/^\d{6}$/.test(String(password || ''))) {
    const error = new Error('密码必须为6位数字');
    error.status = 400;
    throw error;
  }
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

async function accountLogin({ login, phone, password }) {
  const loginValue = String(login || phone || '').trim();
  if (!loginValue) {
    const error = new Error('请输入用户名或手机号');
    error.status = 400;
    throw error;
  }
  assertPassword(password);

  const pool = getPool();
  if (!pool) {
    const error = new Error('数据库不可用');
    error.status = 503;
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const normalizedPhone = normalizePhone(loginValue);
    const phoneLogin = isMainlandPhone(normalizedPhone) && normalizedPhone === loginValue.replace(/\s/g, '');
    const identityResult = phoneLogin
      ? await client.query(
          `SELECT i.*, u.*
             FROM user_identities i
             JOIN users u ON u.id = i.user_id
            WHERE i.provider = 'phone' AND i.provider_user_id = $1
            LIMIT 1`,
          [normalizedPhone]
        )
      : await client.query(
          `SELECT i.*, u.*
             FROM users u
             JOIN user_identities i ON i.user_id = u.id AND i.provider = 'phone'
            WHERE u.display_name = $1
            LIMIT 1`,
          [loginValue]
        );

    if (!identityResult.rows.length) {
      if (phoneLogin) {
        await client.query('COMMIT');
        return { needsUsername: true, phone: normalizedPhone, maskedPhone: maskPhone(normalizedPhone) };
      }
      const error = new Error('账号不存在');
      error.status = 401;
      throw error;
    }

    const row = identityResult.rows[0];
    if (!row.password_hash || !verifyPassword(password, row.password_hash)) {
      const error = new Error('密码错误，请重新输入');
      error.status = 401;
      throw error;
    }

    const timestamp = nowIso();
    const userResult = await client.query(
      `UPDATE users SET last_login_at = $1, updated_at = $1 WHERE id = $2 RETURNING *`,
      [timestamp, row.user_id]
    );
    const householdResult = await client.query(
      `SELECT h.*
         FROM households h
         JOIN household_members hm ON hm.household_id = h.id
        WHERE hm.user_id = $1 AND hm.role = 'owner' AND hm.status = 'active'
        ORDER BY h.created_at ASC
        LIMIT 1`,
      [row.user_id]
    );

    await client.query('COMMIT');
    return { user: publicUser(userResult.rows[0]), household: householdResult.rows[0] || null };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function completePhoneSignup({ phone, password, username }) {
  const normalizedPhone = normalizePhone(phone);
  if (!isMainlandPhone(normalizedPhone)) {
    const error = new Error('请输入有效手机号');
    error.status = 400;
    throw error;
  }
  assertPassword(password);
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
    const existingIdentity = await client.query(
      `SELECT 1 FROM user_identities WHERE provider = 'phone' AND provider_user_id = $1 LIMIT 1`,
      [normalizedPhone]
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
    const userId = id('usr');
    const identityId = id('idt');
    const householdId = id('hhd');
    const memberId = id('hhm');

    const userResult = await client.query(
      `INSERT INTO users
        (id, display_name, avatar_url, primary_phone, primary_email, country_code, region, language, timezone, status, last_login_at, created_at, updated_at)
       VALUES
        ($1, $2, '', $3, '', '86', 'CN', 'zh', 'Asia/Shanghai', 'active', $4, $4, $4)
       RETURNING *`,
      [userId, displayName, normalizedPhone, timestamp]
    );

    await client.query(
      `INSERT INTO user_identities
        (id, user_id, provider, provider_user_id, login_hash, password_hash, phone_country_code, is_primary, verified_at, created_at)
       VALUES
        ($1, $2, 'phone', $3, $4, $5, '86', true, $6, $6)`,
      [identityId, userId, normalizedPhone, loginHash(normalizedPhone), hashPassword(password), timestamp]
    );
    await client.query(
      `INSERT INTO households
        (id, name, owner_user_id, region, address_id, created_at, updated_at)
       VALUES
        ($1, '我的家庭', $2, 'CN', '', $3, $3)`,
      [householdId, userId, timestamp]
    );
    await client.query(
      `INSERT INTO household_members
        (id, household_id, user_id, role, status, invited_by, joined_at)
       VALUES
        ($1, $2, $3, 'owner', 'active', '', $4)`,
      [memberId, householdId, userId, timestamp]
    );

    await client.query('COMMIT');
    return { user: publicUser(userResult.rows[0]) };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { accountLogin, completePhoneSignup, phoneLogin: accountLogin };
