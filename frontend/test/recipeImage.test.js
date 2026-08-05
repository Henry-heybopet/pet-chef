import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveRecipeImageUrl } from '../src/utils/recipeImage.js';

const API_BASE = 'https://petchef.heybopet.cn';

test('relative recipe images resolve against the configured API origin', () => {
  assert.equal(resolveRecipeImageUrl('/牛肉护肤.png', API_BASE), `${API_BASE}/牛肉护肤.png`);
  assert.equal(resolveRecipeImageUrl('金枪鱼缓生长.png', API_BASE), `${API_BASE}/金枪鱼缓生长.png`);
  assert.equal(resolveRecipeImageUrl('/uploads/recipe-catalog/r1-hash.png', ''), '/uploads/recipe-catalog/r1-hash.png');
});

test('uploaded and absolute recipe images keep their required origins', () => {
  assert.equal(resolveRecipeImageUrl('/uploads/recipes/custom.webp', API_BASE), `${API_BASE}/uploads/recipes/custom.webp`);
  assert.equal(resolveRecipeImageUrl('https://cdn.example.com/recipe.webp', API_BASE), 'https://cdn.example.com/recipe.webp');
});
