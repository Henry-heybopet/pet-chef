const test = require('node:test');
const assert = require('node:assert/strict');
const store = require('../src/services/heybo_store');

test('烹饪操作按会话记录、按事件幂等，并关联两项喂食反馈', () => {
  store.resetForTests();
  const { user } = store.loginOrCreateUser({
    login: 'operation-log-owner@example.com',
    provider: 'email',
    displayName: '日志测试用户',
  });
  const pet = store.createPet(user.id, { name: '茜茜', species: 'dog' });
  const device = store.upsertDevice(user.id, {
    tuya_device_id: 'tuya-operation-log-device',
    device_name: 'Heybo Pet Chef',
    product_type: 'pet_chef',
  });

  const startPayload = {
    client_event_id: 'event-start-1',
    session_id: 'session-1',
    tuya_device_id: device.tuya_device_id,
    pet_id: pet.id,
    pet_name: pet.name,
    recipe_id: 'recipe-1',
    recipe_name: '鸡肉燕麦经典',
    operation_type: 'start_cooking',
    result: 'success',
  };
  const start = store.createCookingOperation(user.id, startPayload);
  const duplicateStart = store.createCookingOperation(user.id, startPayload);
  const pause = store.createCookingOperation(user.id, {
    ...startPayload,
    client_event_id: 'event-pause-1',
    operation_type: 'pause',
  });
  const complete = store.createCookingOperation(user.id, {
    ...startPayload,
    client_event_id: 'event-complete-1',
    operation_type: 'complete',
  });
  const feedback = store.createFeedingRecord(user.id, {
    client_event_id: 'feedback-1',
    session_id: 'session-1',
    pet_id: pet.id,
    recipe_id: 'recipe-1',
    palatability: '光盘行动',
    stool_status: '大便正常',
  });

  assert.equal(duplicateStart.id, start.id);
  assert.equal(start.status, 'running');
  assert.equal(pause.status, 'paused');
  assert.equal(complete.status, 'completed');
  assert.equal(feedback.fed_at.length > 0, true);

  const rows = store.listAdminCookingOperations({ deviceId: device.id });
  assert.equal(rows.length, 3);
  const startRow = rows.find(item => item.operation_type === 'start_cooking');
  assert.equal(startRow.user_name, '日志测试用户');
  assert.equal(startRow.pet_name, '茜茜');
  assert.equal(startRow.feedback.length, 1);
  assert.equal(startRow.feedback[0].palatability, '光盘行动');
  assert.equal(startRow.feedback[0].stool_status, '大便正常');
});

test('用户不能为其他账号的设备写入操作日志', () => {
  store.resetForTests();
  const owner = store.loginOrCreateUser({ login: 'owner@example.com', provider: 'email' }).user;
  const other = store.loginOrCreateUser({ login: 'other@example.com', provider: 'email' }).user;
  const device = store.upsertDevice(owner.id, {
    tuya_device_id: 'owner-device',
    device_name: 'Owner Pet Chef',
  });

  assert.throws(() => store.createCookingOperation(other.id, {
    client_event_id: 'forbidden-event',
    session_id: 'forbidden-session',
    tuya_device_id: device.tuya_device_id,
    operation_type: 'start_cooking',
    result: 'success',
  }), /Device not found/);
});
