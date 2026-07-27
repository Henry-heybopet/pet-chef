import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getDefaultCPackName,
  splitTopItems,
} from '../src/utils/recommendationDisplay.js';

test('keeps only the first three recommendations visible by default', () => {
  const recipes = ['一', '二', '三', '四', '五'];
  const result = splitTopItems(recipes);

  assert.deepEqual(result.primary, ['一', '二', '三']);
  assert.deepEqual(result.folded, ['四', '五']);
  assert.deepEqual(recipes, ['一', '二', '三', '四', '五']);
});

test('selects the default C pack from the pet life stage', () => {
  assert.equal(getDefaultCPackName('幼犬'), '脑发育支持功能包C');
  assert.equal(getDefaultCPackName('成犬'), '美毛护肤支持功能包C');
  assert.equal(getDefaultCPackName('老年犬'), '关节支持功能包C');
});
