const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const store = require('../src/services/heybo_store');

test('设备通讯日志记录设备上报的DP5、DP8和DP12，APP不伪造DP8下发', () => {
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
  assert.equal(logs.filter(log => log.direction === 'app_to_device' && log.dp_id === '8').length, 0);
  assert.equal(logs.filter(log => log.direction === 'device_to_app' && log.dp_id === '5').length, 1);
  assert.deepEqual(
    logs
      .filter(log => log.direction === 'device_to_app' && log.dp_id === '8')
      .map(log => log.value)
      .sort((a, b) => b - a),
    [479, 478, 477],
  );
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

test('高频DP8通讯日志仅保留最新2000条', () => {
  store.resetForTests();
  const user = store.createUserForTests({ login: 'communication-retention@example.com', provider: 'email' }).user;
  const device = store.upsertDevice(user.id, { tuya_device_id: 'communication-retention-device' });
  const dps = Object.fromEntries(Array.from({ length: 2001 }, (_, index) => [String(1000 + index), index]));
  store.createDeviceCommunicationLogs(user.id, device.tuya_device_id, { dps });

  const persisted = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../.data/heybo-db.json'), 'utf8'));
  assert.equal(persisted.device_communication_logs.length, 2000);
  assert.equal(persisted.device_communication_logs.some(log => log.dp_id === '1000'), false);
  assert.equal(persisted.device_communication_logs.at(-1).dp_id, '3000');
});
