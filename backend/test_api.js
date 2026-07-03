// Test API routes directly without starting HTTP server
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const { validateIngredientSafety, hasToxicIngredients, hasCautionIngredients, generateSafetyWarnings } = require('./src/services/safety_filter');
const { breedsDb } = require('./src/data/breeds_db');
const { recipesDb } = require('./src/data/recipes_db');

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✓ PASS: ${testName}`);
    passed++;
  } else {
    console.log(`✗ FAIL: ${testName}`);
    failed++;
  }
}

// Test API 1: Safety check endpoint logic
console.log('\n--- Test: Safety Check API ---');
const safetyResult = validateIngredientSafety(['鸡胸肉', '葡萄', '胡萝卜']);
assert(hasToxicIngredients(safetyResult) === true, 'API T1: Should detect toxic ingredients');
assert(safetyResult.toxic.some(t => t.matched_ingredient === '葡萄'), 'API T1: Should detect 葡萄 as toxic');
assert(safetyResult.safe.length >= 2, 'API T1: Should have safe ingredients');

const warnings = generateSafetyWarnings(safetyResult);
assert(warnings.length > 0, 'API T1: Should generate warnings');
assert(warnings.some(w => w.includes('葡萄')), 'API T1: Warnings should mention 葡萄');

// Test API 2: Breeds endpoint logic
console.log('\n--- Test: Breeds API ---');
assert(Array.isArray(breedsDb), 'API T2: breedsDb should be an array');
assert(breedsDb.length > 0, `API T2: Should have breeds (found: ${breedsDb.length})`);
console.log(`  Breeds count: ${breedsDb.length}`);

// Test API 3: Recipes endpoint logic
console.log('\n--- Test: Recipes API ---');
assert(Array.isArray(recipesDb), 'API T3: recipesDb should be an array');
assert(recipesDb.length > 0, `API T3: Should have recipes (found: ${recipesDb.length})`);
console.log(`  Recipes count: ${recipesDb.length}`);

// Test API 3b: Recipe structure validation
if (recipesDb.length > 0) {
  const sampleRecipe = recipesDb[0];
  assert(sampleRecipe.id !== undefined, 'API T3: Recipe should have id');
  assert(sampleRecipe.name !== undefined, 'API T3: Recipe should have name');
  assert(sampleRecipe.ingredients !== undefined, 'API T3: Recipe should have ingredients');
  console.log(`  Sample recipe: ${sampleRecipe.name}`);
}

console.log('\n========================================');
console.log(`API TEST SUMMARY: ${passed} passed, ${failed} failed`);
console.log('========================================');

if (failed === 0) {
  console.log('=== ALL API TESTS PASSED ===');
} else {
  console.log('=== SOME TESTS FAILED ===');
  process.exit(1);
}
