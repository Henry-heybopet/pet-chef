const test = require('node:test');
const assert = require('node:assert/strict');
const axios = require('axios');

test('设备详情接口返回涂鸦实时 online 状态和最新 DP', async (t) => {
  const originalGet = axios.get;
  const originalEnv = {
    TUYA_ACCESS_ID: process.env.TUYA_ACCESS_ID,
    TUYA_SECRET: process.env.TUYA_SECRET,
    TUYA_BASE_URL: process.env.TUYA_BASE_URL,
  };

  process.env.TUYA_ACCESS_ID = 'test-access-id';
  process.env.TUYA_SECRET = 'test-secret';
  process.env.TUYA_BASE_URL = 'https://openapi.test';
  delete require.cache[require.resolve('../src/services/tuya')];

  const paths = [];
  axios.get = async (url) => {
    paths.push(url);
    if (url.includes('/v1.0/token')) {
      return { data: { success: true, result: { access_token: 'token', expire_time: 3600 } } };
    }
    return {
      data: {
        success: true,
        result: {
          id: 'device-offline',
          online: false,
          status: [{ code: 'cook_temperature', value: 25 }],
        },
      },
    };
  };

  t.after(() => {
    axios.get = originalGet;
    Object.entries(originalEnv).forEach(([key, value]) => {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
    delete require.cache[require.resolve('../src/services/tuya')];
  });

  const { getDeviceDetails } = require('../src/services/tuya');
  const response = await getDeviceDetails('device-offline');

  assert.equal(response.result.online, false);
  assert.deepEqual(response.result.status, [{ code: 'cook_temperature', value: 25 }]);
  assert.equal(paths[1], 'https://openapi.test/v1.0/devices/device-offline');
});
