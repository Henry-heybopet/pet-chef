// Pet Chef v3.0 — JWT Authentication Service
// auth.js — 负责 Token 签发、验证与 Express 认证中间件

const jwt = require('jsonwebtoken');
const { getEnvironment } = require('../config/region_config');

const JWT_SECRET = process.env.JWT_SECRET || (getEnvironment() === 'production' ? '' : 'dev-only-jwt-secret');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production');
}

/**
 * 为用户签发 JWT Token
 * @param {string} userId
 * @param {object} payload 附加声明
 * @returns {string} jwt token
 */
function generateToken(userId, payload = {}) {
  return jwt.sign({ sub: userId, ...payload }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * 校验 JWT Token
 * @param {string} token
 * @returns {object|null} 解密后的 payload
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Express 认证中间件
 * 支持真实 JWT 验证；本地/测试环境兼容 "dev_usr_xxx" 的 MVP 简易 Mock Token。
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, error: 'Authorization header is missing' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ success: false, error: 'Token format must be "Bearer <token>"' });
  }

  const token = parts[1];

  // 1. 兼容 Mock 机制 (仅限非生产环境，如 local 或 test)
  const env = getEnvironment();
  if (env !== 'production' && token.startsWith('dev_')) {
    const userId = token.replace('dev_', '');
    req.user = { id: userId, is_mock: true };
    return next();
  }

  // 2. 校验真实 JWT
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }

  req.user = {
    id: decoded.sub,
    is_mock: false,
    ...decoded,
  };
  next();
}

module.exports = {
  generateToken,
  verifyToken,
  authMiddleware,
};
