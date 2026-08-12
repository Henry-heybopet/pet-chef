const test = require('node:test');
const assert = require('node:assert/strict');
const store = require('../src/services/heybo_store');

test('设备通讯日志只保留关键收发 DP，明确排除 DP8', () => {
  store.resetForTests();
  const user = store.createUserForTests({ login: 'communication-log@example.com', provider: 'email' }).user;
  const device = store.upsertDevice(user.id, {
    tuya_device_id: 'tuya-communication-log-device',
    device_name: 'Heybo Pet Chef',
  });

  // Production stores created before this feature have no array yet.
  delete store.db.device_communication_logs;

  const outbound = store.createDeviceCommunicationLogs(user.id, device.tuya_device_id, {
    dps: { 7: 480, 8: 479, 107: 'start' },
  });
  assert.deepEqual(outbound.map(log => log.dp_id).sort(), ['107', '7']);
  assert.ok(outbound.every(log => log.direction === 'app_to_device'));

  store.syncDeviceDp(user.id, device.tuya_device_id, { dps: { 5: 'cooking', 8: 479 } });
  store.syncDeviceDp(user.id, device.tuya_device_id, { dps: { 5: 'cooking', 8: 478 } });
  store.syncDeviceDp(user.id, device.tuya_device_id, { dps: { 12: 2, 8: 477 } });

  const logs = store.listAdminDeviceCommunicationLogs({ deviceId: device.id });
  assert.equal(logs.some(log => log.dp_id === '8'), false);
  assert.equal(logs.filter(log => log.direction === 'device_to_app' && log.dp_id === '5').length, 1);
  assert.equal(logs.filter(log => log.direction === 'device_to_app' && log.dp_id === '12').length, 1);
});

test('用户不能为其他账号的设备写入通讯日志', () => {
  store.resetForTests();
  const owner = store.createUserForTests({ login: 'communication-owner@example.com', provider: 'email' }).user;
  const other = store.createUserForTests({ login: 'communication-other@example.com', provider: 'email' }).user;
  const device = store.upsertDevice(owner.id, { tuya_device_id: 'communication-owner-device' });

  assert.throws(() => store.createDeviceCommunicationLogs(other.id, device.tuya_device_id, {
    dps: { 107: 'reset' },
  }), /Device not found/);
});
