import assert from 'node:assert/strict';
import test from 'node:test';

import {
  filterRankedRecipes,
  recommendationTier,
  splitTopItems,
} from '../src/utils/recommendationDisplay.js';

test('shows three recommendations and caps the folded list at seven', () => {
  const recipes = Array.from({ length: 12 }, (_, index) => `食谱${index + 1}`);
  const result = splitTopItems(recipes);

  assert.deepEqual(result.primary, ['食谱1', '食谱2', '食谱3']);
  assert.deepEqual(result.folded, ['食谱4', '食谱5', '食谱6', '食谱7', '食谱8', '食谱9', '食谱10']);
  assert.equal(recipes.length, 12);
});

test('maps recommendation percentages to suitability levels', () => {
  assert.equal(recommendationTier(85), 'high');
  assert.equal(recommendationTier(70), 'medium');
  assert.equal(recommendationTier(69), 'low');
});

test('only life-stage recipes scored by the backend remain visible', () => {
  const recipes = [
    { id: 'adult-1' },
    { id: 'puppy-1' },
    { id: 'adult-2' },
    { id: 'senior-1' },
  ];
  assert.deepEqual(filterRankedRecipes(recipes, ['adult-2', 'adult-1']).map(recipe => recipe.id), ['adult-1', 'adult-2']);
  assert.equal(filterRankedRecipes(recipes, []).length, 4);
});
