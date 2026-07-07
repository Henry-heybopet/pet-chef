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
  const { deleted_at, ...user } = row;
  return user;
}

async function phoneLogin({ phone, password }) {
  const normalizedPhone = normalizePhone(phone);
  if (!/^\d{6,20}$/.test(normalizedPhone)) {
    const error = new Error('请输入有效手机号');
    error.status = 400;
    throw error;
  }
  if (!/^\d{6}$/.test(String(password || ''))) {
    const error = new Error('请输入6位数字密码');
    error.status = 400;
    throw error;
  }

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
      `SELECT i.*, u.*
         FROM user_identities i
         JOIN users u ON u.id = i.user_id
        WHERE i.provider = 'phone' AND i.provider_user_id = $1
        LIMIT 1`,
      [normalizedPhone]
    );

    let user = null;
    let household = null;
    const timestamp = nowIso();

    if (identityResult.rows.length) {
      const row = identityResult.rows[0];
      if (!row.password_hash || !verifyPassword(password, row.password_hash)) {
        const error = new Error('密码错误，请再次输入密码');
        error.status = 401;
        throw error;
      }
      const userResult = await client.query(
        `UPDATE users SET last_login_at = $1, updated_at = $1 WHERE id = $2 RETURNING *`,
        [timestamp, row.user_id]
      );
      user = userResult.rows[0];
    } else {
      const userId = id('usr');
      const identityId = id('idt');
      const householdId = id('hhd');
      const memberId = id('hhm');
      const displayName = `用户${normalizedPhone.slice(-4)}`;

      const userResult = await client.query(
        `INSERT INTO users
          (id, display_name, avatar_url, primary_phone, primary_email, country_code, region, language, timezone, status, last_login_at, created_at, updated_at)
         VALUES
          ($1, $2, '', $3, '', '86', 'CN', 'zh', 'Asia/Shanghai', 'active', $4, $4, $4)
         RETURNING *`,
        [userId, displayName, normalizedPhone, timestamp]
      );
      user = userResult.rows[0];

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
    }

    const householdResult = await client.query(
      `SELECT h.*
         FROM households h
         JOIN household_members hm ON hm.household_id = h.id
        WHERE hm.user_id = $1 AND hm.role = 'owner' AND hm.status = 'active'
        ORDER BY h.created_at ASC
        LIMIT 1`,
      [user.id]
    );
    household = householdResult.rows[0] || null;

    await client.query('COMMIT');
    return { user: publicUser(user), household };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = { phoneLogin };
