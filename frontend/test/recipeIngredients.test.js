import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatRecipeIngredientPercentages,
  getIngredientCategory,
  sortRecipeIngredientEntries,
  sortRecipeIngredientList,
} from '../src/utils/recipeIngredients.js';

test('ingredient categories follow the four display groups', () => {
  assert.equal(getIngredientCategory('鸡小胸'), 'protein');
  assert.equal(getIngredientCategory('全熟燕麦片'), 'carb');
  assert.equal(getIngredientCategory('西兰花'), 'veg');
  assert.equal(getIngredientCategory('三文鱼油'), 'addition');
});

test('recipe entries sort by category, then percentage descending', () => {
  const entries = [
    ['红薯', 16],
    ['蓝莓', 5],
    ['鸡心', 11],
    ['西兰花', 11],
    ['鸡小胸', 37],
    ['全熟燕麦片', 21],
  ];

  assert.deepEqual(
    sortRecipeIngredientEntries(entries).map(([name]) => name),
    ['鸡小胸', '鸡心', '全熟燕麦片', '红薯', '西兰花', '蓝莓'],
  );
  assert.equal(entries[0][0], '红薯');
});

test('cooking ingredient list uses the same order without mutation', () => {
  const items = [
    { name: '蓝莓', pct: 5 },
    { name: '全熟燕麦片', pct: 21 },
    { name: '鸡小胸', pct: 37 },
    { name: '三文鱼油', pct: 2 },
  ];

  assert.deepEqual(
    sortRecipeIngredientList(items).map(item => item.name),
    ['鸡小胸', '全熟燕麦片', '蓝莓', '三文鱼油'],
  );
  assert.equal(items[0].name, '蓝莓');
});

test('recipe ingredient percentages display with two decimal places and total exactly 100%', () => {
  assert.deepEqual(formatRecipeIngredientPercentages([35, 12.6, 9.7]), ['61.08%', '21.99%', '16.93%']);
  assert.deepEqual(formatRecipeIngredientPercentages([1, 1, 1]), ['33.34%', '33.33%', '33.33%']);

  const displayed = formatRecipeIngredientPercentages([32.29, 13.12, 10.1, 10.1, 9.06, 6.15, 4.06, 9.06, 6.04]);
  const total = displayed.reduce((sum, value) => sum + Number.parseInt(value.replace('.', ''), 10), 0);
  assert.equal(total, 10000);
  assert.ok(displayed.every(value => /^\d+\.\d{2}%$/.test(value)));
  assert.deepEqual(formatRecipeIngredientPercentages([0, 0]), ['0.00%', '0.00%']);
});
