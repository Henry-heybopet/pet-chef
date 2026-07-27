// Pet Chef Ver B1.00 — 2026-06-22
// PostgreSQL client with JSON fallback support

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

let Pool = null;
let pool = null;

function getPool() {
  if (pool) return pool;

  const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  if (!connectionString) {
    return null;
  }

  try {
    if (!Pool) {
      const pg = require('pg');
      Pool = pg.Pool;
    }
    const isLocal = connectionString.includes('@db:') || connectionString.includes('@localhost:') || connectionString.includes('@127.0.0.1:');
    pool = new Pool({
      connectionString,
      ssl: isLocal ? false : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    return pool;
  } catch (err) {
    console.warn('[DB] pg module not available:', err.message);
    return null;
  }
}

async function query(text, params) {
  const clientPool = getPool();
  if (!clientPool) {
    throw new Error('PostgreSQL not available');
  }

  const client = await clientPool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

async function isAvailable() {
  try {
    const clientPool = getPool();
    if (!clientPool) return false;

    const client = await clientPool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (err) {
    console.warn('[DB] PostgreSQL unavailable, falling back to JSON');
    return false;
  }
}

module.exports = { query, isAvailable, getPool };
