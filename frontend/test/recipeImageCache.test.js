import assert from 'node:assert/strict';
import test from 'node:test';
import { collectRecipeImageUrls, prefetchRecipeImages } from '../src/utils/recipeImageCache.js';

const API_BASE = 'https://petchef.heybopet.cn';

test('collects unique versioned recipe image URLs', () => {
  const recipes = [
    { img: '/uploads/recipe-catalog/r1-a.png' },
    { img: '/uploads/recipe-catalog/r1-a.png' },
    { img: '/uploads/recipes/r2-123.webp' },
    { img: '' },
  ];
  assert.deepEqual(collectRecipeImageUrls(recipes, API_BASE), [
    `${API_BASE}/uploads/recipe-catalog/r1-a.png`,
    `${API_BASE}/uploads/recipes/r2-123.webp`,
  ]);
});

test('prefetches without exceeding the configured concurrency', async () => {
  let active = 0;
  let peak = 0;
  const result = await prefetchRecipeImages([
    { img: '/uploads/recipe-catalog/a.png' },
    { img: '/uploads/recipe-catalog/b.png' },
    { img: '/uploads/recipe-catalog/c.png' },
  ], {
    apiBase: API_BASE,
    concurrency: 2,
    loader: async () => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise(resolve => setTimeout(resolve, 1));
      active -= 1;
      return true;
    },
  });
  assert.equal(peak, 2);
  assert.deepEqual(result, { total: 3, loaded: 3, failed: 0, cancelled: false });
});
