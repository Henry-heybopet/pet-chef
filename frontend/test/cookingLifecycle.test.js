import assert from 'node:assert/strict';
import test from 'node:test';
import {
  resolveCookingRemainingSeconds,
  shouldResetAfterCompletion,
} from '../src/utils/cookingLifecycle.js';

test('完成状态每轮只触发一次复位，下一轮启动后允许再次复位', () => {
  const resetDevices = new Set();
  const devId = 'device-1';

  assert.equal(shouldResetAfterCompletion(resetDevices, devId, { 5: 'cooking', 107: 'start' }), false);
  assert.equal(shouldResetAfterCompletion(resetDevices, devId, { 5: 'done', 107: 'start' }), true);
  assert.equal(shouldResetAfterCompletion(resetDevices, devId, { 5: 'done', 107: 'start' }), false);
  assert.equal(shouldResetAfterCompletion(resetDevices, devId, { 5: 'cooking', 107: 'start' }), false);
  assert.equal(shouldResetAfterCompletion(resetDevices, devId, { status: 'complete' }), true);
});

test('设备剩余时间归零也会结束当前烹饪且只复位一次', () => {
  const resetDevices = new Set();
  const dps = { 5: 'cooking', 7: 900, 8: 0, 107: 'start' };
  assert.equal(shouldResetAfterCompletion(resetDevices, 'device-1', dps), true);
  assert.equal(shouldResetAfterCompletion(resetDevices, 'device-1', dps), false);
});

test('倒计时拒绝超过本轮计划时长的旧DP8，并接受有效值和0', () => {
  assert.equal(resolveCookingRemainingSeconds({
    totalSeconds: 900,
    reportedRemaining: 970,
    elapsedSeconds: 0,
    isActive: true,
  }), 900);
  assert.equal(resolveCookingRemainingSeconds({
    totalSeconds: 900,
    reportedRemaining: 899,
    elapsedSeconds: 1,
    isActive: true,
  }), 899);
  assert.equal(resolveCookingRemainingSeconds({
    totalSeconds: 900,
    reportedRemaining: 0,
    elapsedSeconds: 900,
    isActive: true,
  }), 0);
});
