const test = require('node:test');
const assert = require('node:assert/strict');
const { _test } = require('../src/services/deepseek');

test('幼犬目标体重低于当前体重时要求复核，成年犬保持原结果', () => {
  const suggestion = { standard_weight: 3.25, target_weight_requires_review: false };
  const puppy = _test.protectPuppyTargetWeight(suggestion, 2, 5.8);
  const adult = _test.protectPuppyTargetWeight(suggestion, 24, 5.8);

  assert.equal(puppy.standard_weight, null);
  assert.equal(puppy.target_weight_requires_review, true);
  assert.ok(puppy.target_weight_conflict.includes('不能据此设置减重目标'));
  assert.deepEqual(adult, suggestion);
});
