// Test script to verify safety_filter.js
const { validateIngredientSafety, hasToxicIngredients, hasCautionIngredients, generateSafetyWarnings } = require('./src/services/safety_filter');

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

// Test 1: Toxic ingredients blocked
const result1 = validateIngredientSafety(['鸡胸肉', '葡萄', '胡萝卜']);
assert(hasToxicIngredients(result1) === true, 'T1: Should detect grape as toxic');
assert(result1.toxic.length >= 1, `T1: Should have 1+ toxic ingredient (found: ${result1.toxic.length})`);
assert(result1.safe.length >= 2, `T1: Should have 2+ safe ingredients (found: ${result1.safe.length})`);

// Test 2: All safe ingredients pass
const result2 = validateIngredientSafety(['鸡胸肉', '胡萝卜', '南瓜']);
assert(hasToxicIngredients(result2) === false, 'T2: No toxic detected');
assert(result2.toxic.length === 0, `T2: Toxic array should be empty (found: ${result2.toxic.length})`);

// Test 3: All 8 known toxic ingredients detected
const toxicList = ['葡萄', '洋葱', '大蒜', '巧克力', '夏威夷果', '澳洲坚果', '木糖醇'];
const result3 = validateIngredientSafety(toxicList);
assert(result3.toxic.length >= 7, `T3: Should detect 7+ toxic. Found: ${result3.toxic.length}`);

// Test 4: Caution ingredients generate warnings
const result4 = validateIngredientSafety(['牛油果', '生鸡蛋']);
assert(hasCautionIngredients(result4) === true, 'T4: Should detect caution ingredients');
assert(result4.caution.length >= 2, `T4: Should have 2+ caution. Found: ${result4.caution.length}`);

// Test 5: Fuzzy matching works
const result5 = validateIngredientSafety(['鸡胸', '红葡萄']);
assert(result5.toxic.length >= 1 && result5.safe.length >= 1, 'T5: Fuzzy match should work');

// Test 6: Format warnings
const warnings = generateSafetyWarnings(result1);
assert(warnings.length > 0, 'T6: Warnings should be generated');
assert(warnings.some(w => w.includes('葡萄')), 'T6: Warning should mention 葡萄');

console.log('\n========================================');
console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
console.log('========================================');

if (failed === 0) {
  console.log('=== ALL SAFETY FILTER TESTS PASSED ===');
} else {
  console.log('=== SOME TESTS FAILED ===');
  process.exit(1);
}
