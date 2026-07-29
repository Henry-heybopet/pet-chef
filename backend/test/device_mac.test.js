const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeMacAddress } = require('../src/services/heybo_store');

test('设备 MAC 地址统一保存为大写冒号格式', () => {
  assert.equal(normalizeMacAddress('aa:bb:cc:dd:ee:ff'), 'AA:BB:CC:DD:EE:FF');
  assert.equal(normalizeMacAddress('aa-bb-cc-dd-ee-ff'), 'AA:BB:CC:DD:EE:FF');
  assert.equal(normalizeMacAddress('aabbccddeeff'), 'AA:BB:CC:DD:EE:FF');
});

test('无效 MAC 地址不会进入设备记录', () => {
  assert.equal(normalizeMacAddress(''), '');
  assert.equal(normalizeMacAddress('not-a-mac'), '');
  assert.equal(normalizeMacAddress('AA:BB:CC:DD:EE'), '');
});
