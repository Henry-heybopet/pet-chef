import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldResetAfterCompletion } from '../src/utils/cookingLifecycle.js';

test('完成状态每轮只触发一次复位，下一轮启动后允许再次复位', () => {
  const resetDevices = new Set();
  const devId = 'device-1';

  assert.equal(shouldResetAfterCompletion(resetDevices, devId, { 5: 'cooking', 107: 'start' }), false);
  assert.equal(shouldResetAfterCompletion(resetDevices, devId, { 5: 'done' }), true);
  assert.equal(shouldResetAfterCompletion(resetDevices, devId, { 5: 'done' }), false);
  assert.equal(shouldResetAfterCompletion(resetDevices, devId, { 5: 'cooking', 107: 'start' }), false);
  assert.equal(shouldResetAfterCompletion(resetDevices, devId, { status: 'complete' }), true);
});
