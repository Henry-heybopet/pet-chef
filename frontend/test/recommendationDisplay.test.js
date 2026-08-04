import assert from 'node:assert/strict';
import test from 'node:test';

import {
  recommendationTier,
  splitTopItems,
} from '../src/utils/recommendationDisplay.js';

test('keeps only the first three recommendations visible by default', () => {
  const recipes = ['一', '二', '三', '四', '五'];
  const result = splitTopItems(recipes);

  assert.deepEqual(result.primary, ['一', '二', '三']);
  assert.deepEqual(result.folded, ['四', '五']);
  assert.deepEqual(recipes, ['一', '二', '三', '四', '五']);
});

test('maps recommendation percentages to suitability levels', () => {
  assert.equal(recommendationTier(85), 'high');
  assert.equal(recommendationTier(70), 'medium');
  assert.equal(recommendationTier(69), 'low');
});
