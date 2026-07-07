const crypto = require('crypto');
const store = require('./heybo_store');

const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 60 * 60 * 24);
const REFRESH_TOKEN_TTL_SECONDS = Number(process.env.REFRESH_TOKEN_TTL_SECONDS || 60 * 60 * 24 * 30);
const BIND_TOKEN_TTL_SECONDS = Number(process.env.BIND_TOKEN_TTL_SECONDS || 60 * 10);
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'heybo_petchef_dev_secret_change_me');

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production');
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function signPayload(payload, ttlSeconds = ACCESS_TOKEN_TTL_SECONDS) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const nowSeconds = Math.floor(Date.now() / 1000);
  const body = {
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
    ...payload,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(body))}`;
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

function verifyToken(token) {
  try {
    const [encodedHeader, encodedPayload, signature] = String(token || '').split('.');
    if (!encodedHeader || !encodedPayload || !signature) return null;
    const unsigned = `${encodedHeader}.${encodedPayload}`;
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(unsigned).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function generateAccessToken(userId, payload = {}) {
  return signPayload({ sub: userId, type: 'access', ...payload }, ACCESS_TOKEN_TTL_SECONDS);
}

function generateBindToken(payload = {}) {
  return signPayload({ type: 'bind', ...payload }, BIND_TOKEN_TTL_SECONDS);
}

function verifyBindToken(token) {
  const payload = verifyToken(token);
  return payload?.type === 'bind' ? payload : null;
}

function createRefreshToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function createSession({ userId, region, provider, req }) {
  const refreshToken = createRefreshToken();
  const session = {
    id: store.id('ses'),
    user_id: userId,
    region,
    provider,
    refresh_token_hash: store.hash(refreshToken),
    device_id: req?.get?.('x-device-id') || '',
    device_name: req?.get?.('x-device-name') || '',
    platform: req?.get?.('x-platform') || '',
    ip: req?.ip || '',
    user_agent: req?.get?.('user-agent') || '',
    expires_at: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000).toISOString(),
    revoked_at: '',
    created_at: store.now(),
    last_seen_at: store.now(),
  };
  store.ensureCollection('auth_sessions').push(session);
  store.saveDb();
  return {
    accessToken: generateAccessToken(userId, { region, session_id: session.id }),
    refreshToken,
    session,
  };
}

function refreshSession(refreshToken) {
  const tokenHash = store.hash(refreshToken);
  const session = store.db.auth_sessions.find(item =>
    item.refresh_token_hash === tokenHash &&
    !item.revoked_at &&
    new Date(item.expires_at).getTime() > Date.now()
  );
  if (!session) throw new Error('Invalid refresh token');
  const user = store.getUser(session.user_id);
  if (!user || user.status !== 'active') throw new Error('Unauthorized');
  session.last_seen_at = store.now();
  store.saveDb();
  return {
    accessToken: generateAccessToken(user.id, { region: session.region, session_id: session.id }),
    user: store.publicUser(user),
    session,
  };
}

function revokeSession(refreshToken) {
  const tokenHash = store.hash(refreshToken);
  const session = store.db.auth_sessions.find(item => item.refresh_token_hash === tokenHash && !item.revoked_at);
  if (!session) return null;
  session.revoked_at = store.now();
  store.saveDb();
  return session;
}

function revokeUserSessions(userId) {
  const revokedAt = store.now();
  store.db.auth_sessions
    .filter(item => item.user_id === userId && !item.revoked_at)
    .forEach(item => { item.revoked_at = revokedAt; });
  store.saveDb();
}

function authMiddleware(req, res, next) {
  const authHeader = req.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authorization header is missing' });
  }
  const token = authHeader.slice('Bearer '.length);
  if (token.startsWith('dev_') && process.env.NODE_ENV !== 'production') {
    req.user = { id: token.replace('dev_', ''), is_mock: true };
    return next();
  }
  const payload = verifyToken(token);
  if (!payload?.sub || payload.type !== 'access') {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
  req.user = { id: payload.sub, ...payload };
  return next();
}

module.exports = {
  generateToken: generateAccessToken,
  generateAccessToken,
  verifyToken,
  generateBindToken,
  verifyBindToken,
  createSession,
  refreshSession,
  revokeSession,
  revokeUserSessions,
  authMiddleware,
};
