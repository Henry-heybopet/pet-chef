import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isCompletedCookingDps,
  resolveCookingRemainingSeconds,
  shouldAutoCompleteCooking,
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

test('不把实机长期为0的DP8误判为完成，只接受明确完成状态', () => {
  assert.equal(isCompletedCookingDps({ 5: 'cooking', 7: 0, 8: 0, 107: 'start' }), false);
  assert.equal(isCompletedCookingDps({ 5: 'done', 7: 0, 8: 0, 107: 'start' }), true);
});

test('倒计时拒绝超过计划时长及提前归零的旧DP8', () => {
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
    elapsedSeconds: 1,
    isActive: true,
  }), 899);
});

test('只有运行中的本地截止时间到达后才触发自动完成', () => {
  assert.equal(shouldAutoCompleteCooking({ totalSeconds: 780, elapsedMs: 779999, isRunning: true }), false);
  assert.equal(shouldAutoCompleteCooking({ totalSeconds: 780, elapsedMs: 780000, isRunning: true }), true);
  assert.equal(shouldAutoCompleteCooking({ totalSeconds: 780, elapsedMs: 900000, isRunning: false }), false);
});
