import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveCookingRemainingSeconds,
  resolveCookingState,
} from '../src/utils/cookingLifecycle.js';

test('DP5是烹饪状态的唯一来源', () => {
  assert.equal(resolveCookingState({ 5: 'standby', 107: 'start' }), 'standby');
  assert.equal(resolveCookingState({ 5: 'cooking', 107: 'reset' }), 'cooking');
  assert.equal(resolveCookingState({ 5: 'pause', 107: 'start' }), 'pause');
  assert.equal(resolveCookingState({ 5: 'done', 107: 'start' }), 'done');
});

test('缺少DP5时不推测待机状态', () => {
  assert.equal(resolveCookingState({ 8: 0 }), 'unknown');
  assert.equal(resolveCookingState({ 5: '' }), 'unknown');
});

test('运行与暂停界面都原样显示机器DP8剩余秒数', () => {
  assert.equal(resolveCookingRemainingSeconds({
    reportedRemaining: 487,
  }), 487);
  assert.equal(resolveCookingRemainingSeconds({
    reportedRemaining: 487,
  }), 487);
  assert.equal(resolveCookingRemainingSeconds({
    reportedRemaining: 0,
  }), 0);
});

test('完成状态显示零，缺少DP8时不伪造运行进度', () => {
  assert.equal(resolveCookingRemainingSeconds({
    reportedRemaining: Number.NaN,
  }), Number.NaN);
  assert.equal(resolveCookingRemainingSeconds({
    reportedRemaining: 12,
    isDone: true,
  }), 0);
});
