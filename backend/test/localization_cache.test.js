const test = require('node:test');
const assert = require('node:assert/strict');
const { storeAnalysis, getAnalysis, getRendered, storeRendered, clearForTests } = require('../src/services/localization_cache');

test('cached analysis can be re-rendered only by its owner and flow', () => {
  clearForTests();
  const result = { findings: [{ risk_code: 'FORBIDDEN' }] };
  const analysisId = storeAnalysis({ userId: 'user-1', kind: 'fresh-check', result });
  assert.equal(getAnalysis({ analysisId, userId: 'user-1', kind: 'fresh-check' }), result);
  assert.equal(getAnalysis({ analysisId, userId: 'user-2', kind: 'fresh-check' }), null);
  assert.equal(getAnalysis({ analysisId, userId: 'user-1', kind: 'fresh-match' }), null);
  const localized = { locale: 'de', findings: [] };
  assert.equal(storeRendered({ analysisId, userId: 'user-1', kind: 'fresh-check', locale: 'de', localized }), true);
  assert.equal(getRendered({ analysisId, userId: 'user-1', kind: 'fresh-check', locale: 'de' }), localized);
  assert.equal(getRendered({ analysisId, userId: 'user-2', kind: 'fresh-check', locale: 'de' }), null);
});
