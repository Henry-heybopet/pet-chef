const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { imgByRecipeId, recipesDb } = require('../src/data/recipes_db');

test('all canonical recipes reference content-versioned backend images', () => {
  assert.equal(recipesDb.length, 40);
  assert.equal(Object.keys(imgByRecipeId).length, 40);

  for (const recipe of recipesDb) {
    const imageUrl = imgByRecipeId[recipe.id];
    assert.equal(recipe.img, imageUrl);
    const match = imageUrl.match(/^\/uploads\/recipe-catalog\/(dog_recipe_\d+)-([a-f0-9]{12})\.png$/);
    assert.ok(match, `invalid versioned image URL for ${recipe.id}`);
    assert.equal(match[1], recipe.id);

    const imagePath = path.resolve(__dirname, '../src/assets/recipe-images', path.basename(imageUrl));
    assert.ok(fs.existsSync(imagePath), `missing catalog image for ${recipe.id}`);
    const digest = crypto.createHash('sha256').update(fs.readFileSync(imagePath)).digest('hex');
    assert.equal(digest.slice(0, 12), match[2], `stale image hash for ${recipe.id}`);
  }
});
