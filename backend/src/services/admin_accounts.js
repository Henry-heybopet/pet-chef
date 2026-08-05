const fs = require('fs');
const path = require('path');

const DATA_DIR = path.resolve(__dirname, '../../.data');
const STORE_PATH = process.env.ADMIN_ACCOUNTS_FILE || path.join(DATA_DIR, 'admin_accounts.json');

const REGIONS = ['CN', 'US', 'EU'];
const MODULES = ['dashboard', 'users', 'pets', 'devices', 'recipes', 'nutrition_packs', 'products', 'orders', 'medical', 'doctors', 'faults', 'subadmins'];

const isProduction = process.env.NODE_ENV === 'production';
const SUPER_USERNAME = process.env.ADMIN_SUPER_USERNAME || (isProduction ? '' : 'Heybopetadmin');
const SUPER_PASSWORD = process.env.ADMIN_SUPER_PASSWORD || (isProduction ? '' : 'dev-only-admin-password');

function ensureStore() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_PATH)) {
    fs.writeFileSync(STORE_PATH, JSON.stringify({ subadmins: [] }, null, 2));
  }
}

function readStore() {
  ensureStore();
  try {
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    return { subadmins: Array.isArray(parsed.subadmins) ? parsed.subadmins : [] };
  } catch {
    return { subadmins: [] };
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(STORE_PATH, JSON.stringify({ subadmins: store.subadmins || [] }, null, 2));
}

function normalizeList(values, allowed) {
  return [...new Set((Array.isArray(values) ? values : []).filter(value => allowed.includes(value)))];
}

function sanitizeSubadmin(account) {
  return {
    username: String(account.username || '').trim(),
    password: String(account.password || ''),
    regions: normalizeList(account.regions, REGIONS),
    modules: normalizeList(account.modules, MODULES),
    created_at: account.created_at || new Date().toISOString(),
    updated_at: account.updated_at || new Date().toISOString(),
  };
}

function publicProfile(account) {
  if (!account) return null;
  return {
    username: account.username,
    role: account.role || 'subadmin',
    regions: account.regions,
    modules: account.modules,
  };
}

function superProfile() {
  return {
    username: SUPER_USERNAME,
    role: 'superadmin',
    regions: REGIONS,
    modules: MODULES,
  };
}

function getAdminProfile(username) {
  if (username === SUPER_USERNAME) return superProfile();
  const account = readStore().subadmins.find(item => item.username === username);
  return account ? publicProfile({ ...account, role: 'subadmin' }) : null;
}

function authenticateAdmin(username, password) {
  const normalizedUsername = String(username || '').trim();
  const normalizedPassword = String(password || '');
  if (normalizedUsername === SUPER_USERNAME && normalizedPassword === SUPER_PASSWORD) {
    return superProfile();
  }
  const account = readStore().subadmins.find(item => item.username === normalizedUsername);
  if (!account || account.password !== normalizedPassword) return null;
  return publicProfile({ ...account, role: 'subadmin' });
}

function listSubadmins() {
  return readStore().subadmins.map(sanitizeSubadmin);
}

function createSubadmin(input = {}) {
  const store = readStore();
  const username = String(input.username || '').trim();
  if (!username) {
    const error = new Error('子管理员帐号不能为空');
    error.statusCode = 400;
    throw error;
  }
  if (username === SUPER_USERNAME || store.subadmins.some(item => item.username === username)) {
    const error = new Error('子管理员帐号已存在');
    error.statusCode = 409;
    throw error;
  }
  const now = new Date().toISOString();
  const account = sanitizeSubadmin({
    username,
    password: input.password || '',
    regions: input.regions?.length ? input.regions : ['CN'],
    modules: input.modules?.length ? input.modules : ['dashboard'],
    created_at: now,
    updated_at: now,
  });
  store.subadmins.push(account);
  writeStore(store);
  return account;
}

function updateSubadmin(username, input = {}) {
  const store = readStore();
  const index = store.subadmins.findIndex(item => item.username === username);
  if (index === -1) return null;
  const current = store.subadmins[index];
  const account = sanitizeSubadmin({
    ...current,
    password: input.password !== undefined ? input.password : current.password,
    regions: input.regions !== undefined ? input.regions : current.regions,
    modules: input.modules !== undefined ? input.modules : current.modules,
    updated_at: new Date().toISOString(),
  });
  store.subadmins[index] = account;
  writeStore(store);
  return account;
}

function deleteSubadmin(username) {
  const store = readStore();
  const next = store.subadmins.filter(item => item.username !== username);
  const deleted = next.length !== store.subadmins.length;
  if (deleted) writeStore({ subadmins: next });
  return deleted;
}

module.exports = {
  REGIONS,
  MODULES,
  SUPER_USERNAME,
  authenticateAdmin,
  getAdminProfile,
  listSubadmins,
  createSubadmin,
  updateSubadmin,
  deleteSubadmin,
};
