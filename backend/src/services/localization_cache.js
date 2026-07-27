const crypto = require('crypto');

const TTL_MS = 15 * 60 * 1000;
const MAX_ENTRIES = 200;
const entries = new Map();

function prune(now = Date.now()) {
  for (const [id, entry] of entries) {
    if (entry.expires_at <= now) entries.delete(id);
  }
  while (entries.size >= MAX_ENTRIES) entries.delete(entries.keys().next().value);
}

function storeAnalysis({ userId, kind, result }) {
  prune();
  const analysisId = crypto.randomUUID();
  entries.set(analysisId, {
    user_id: String(userId),
    kind,
    result,
    rendered: new Map(),
    expires_at: Date.now() + TTL_MS,
  });
  return analysisId;
}

function getRendered({ analysisId, userId, kind, locale }) {
  prune();
  const entry = entries.get(String(analysisId || ''));
  if (!entry || entry.user_id !== String(userId) || entry.kind !== kind) return null;
  return entry.rendered.get(locale) || null;
}

function storeRendered({ analysisId, userId, kind, locale, localized }) {
  const entry = entries.get(String(analysisId || ''));
  if (!entry || entry.expires_at <= Date.now() || entry.user_id !== String(userId) || entry.kind !== kind) return false;
  entry.rendered.set(locale, localized);
  return true;
}

function getAnalysis({ analysisId, userId, kind }) {
  prune();
  const entry = entries.get(String(analysisId || ''));
  if (!entry || entry.user_id !== String(userId) || (kind && entry.kind !== kind)) return null;
  return entry.result;
}

function clearForTests() {
  entries.clear();
}

module.exports = { TTL_MS, storeAnalysis, getAnalysis, getRendered, storeRendered, clearForTests };
