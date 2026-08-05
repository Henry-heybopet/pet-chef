const test = require('node:test');
const assert = require('node:assert/strict');

const { _test } = require('../src/services/nutrition_repository');

test('new recipe payload always includes database timestamps', () => {
  const now = new Date('2026-08-03T00:00:00.000Z');
  const payload = _test.buildRecipeCreatePayload({}, 40, now);
  assert.equal(payload.id, 'dog_recipe_041');
  assert.equal(payload.status, 'draft');
  assert.equal(payload.created_at, now);
  assert.equal(payload.updated_at, now);
});

test('recipe writes reject an empty or unknown life stage', () => {
  assert.doesNotThrow(() => _test.assertValidRecipeLifeStage('成年犬'));
  assert.throws(() => _test.assertValidRecipeLifeStage(null), /life_stage must be one of/);
  assert.throws(() => _test.assertValidRecipeLifeStage('成犬通用'), /life_stage must be one of/);
});
