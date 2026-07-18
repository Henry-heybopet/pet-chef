import { registerPlugin, WebPlugin } from '@capacitor/core';

const DEMO_DEVICE = {
  devId: 'demo_pet_chef_001',
  name: 'Pet Chef Demo',
  productId: 'ak2kofibhuvdtqip',
  isOnline: true,
  isPetChef: true,
  dps: {
    1: true,
    3: 'diy',
    5: 'standby',
    7: 1200,
    8: 1200,
    9: 85,
    10: 25,
    102: 8,
    107: 'reset',
    108: '1',
  },
};

const MOCK_BLE_DEVICE = {
  name: 'Pet Chef BLE-ak2ko',
  address: 'AA:BB:CC:DD:EE:FF',
  uuid: 'ble_uuid_petchef_99',
  productId: 'ak2kofibhuvdtqip',
  isNearby: true,
};

class HeyboTuyaWeb extends WebPlugin {
  constructor() {
    super({ name: 'HeyboTuya' });
    this.devices = [DEMO_DEVICE];
    this.activeBleTimeout = null;
    this.dpIntervals = {};
    this.currentHomeId = 10001;
  }

  async status() {
    return {
      platform: 'web',
      nativeAvailable: false,
      configured: true,
      initialized: true,
      pid: 'ak2kofibhuvdtqip',
      homeId: this.currentHomeId,
    };
  }

  async checkPairingPermissions() {
    return {
      platform: 'web',
      androidVersion: 'web',
      bluetoothGranted: true,
      locationGranted: true,
      gpsEnabled: true,
      missingPermissions: [],
      canStartBleScan: true,
      permissions: {
        BLUETOOTH_SCAN: 'not_required',
        BLUETOOTH_CONNECT: 'not_required',
        ACCESS_FINE_LOCATION: 'not_required',
      },
    };
  }

  async requestPairingPermissions() {
    return this.checkPairingPermissions();
  }

  async init() {
    return { initialized: true, appKey: 'web-demo' };
  }

  async loginOrRegisterWithHeyboUid({ heyboUid, tuyaUid, password }) {
    const finalTuyaUid = tuyaUid || `heybo_${heyboUid || 'demo'}`;
    return { success: true, tuyaUid: finalTuyaUid };
  }

  async getHomeList() {
    return {
      success: true,
      homeId: this.currentHomeId,
      homes: [{ homeId: this.currentHomeId, name: 'Heybo Pet Demo', geoName: 'China', deviceCount: this.devices.length }],
    };
  }

  async ensureDefaultHome() {
    return { success: true, homeId: this.currentHomeId, name: 'Heybo Pet Demo', geoName: 'China', deviceCount: this.devices.length };
  }

  async getDeviceList() {
    const devices = Array.from(new Map(this.devices.map(device => [device.devId, device])).values());
    return { success: true, homeId: this.currentHomeId, devices };
  }

  async getActivatorToken() {
    return { success: true, homeId: this.currentHomeId, token: 'web-demo-token' };
  }

  async ensureNativeSession() {
    return { success: true, ready: true, homeId: this.currentHomeId, deviceCount: this.devices.length, platform: 'web' };
  }

  async startWifiPairing({ ssid }) {
    const newDev = {
      ...DEMO_DEVICE,
      devId: 'web_pet_chef_demo',
      name: ssid ? `Pet Chef (${ssid})` : 'Pet Chef WiFi',
      dps: { ...DEMO_DEVICE.dps },
    };
    this.devices = [...this.devices.filter(d => d.devId !== newDev.devId), newDev];
    return {
      success: true,
      homeId: this.currentHomeId,
      mode: 'EZ',
      token: 'web-demo-token',
      device: newDev,
    };
  }

  async stopPairing() {
    return { success: true };
  }

  async unbindDevice({ devId }) {
    this.devices = this.devices.filter(d => d.devId !== devId);
    this.unsubscribeDevice({ devId });
    return { success: true, devId };
  }

  async startBleScan() {
    if (this.activeBleTimeout) clearTimeout(this.activeBleTimeout);
    
    // Simulate finding a BLE device after 1.5 seconds
    this.activeBleTimeout = setTimeout(() => {
      this.notifyListeners('bleDeviceFound', MOCK_BLE_DEVICE);
    }, 1500);
    
    return { success: true };
  }

  async stopBleScan() {
    if (this.activeBleTimeout) {
      clearTimeout(this.activeBleTimeout);
      this.activeBleTimeout = null;
    }
    return { success: true };
  }

  async connectBleDevice({ uuid, address, productId, ssid, password }) {
    const newDev = {
      ...DEMO_DEVICE,
      devId: 'web_pet_chef_demo',
      name: 'Pet Chef Dual-Mode',
      productId: productId || 'ak2kofibhuvdtqip',
      dps: { ...DEMO_DEVICE.dps },
    };
    this.devices = [...this.devices.filter(d => d.devId !== newDev.devId), newDev];
    return {
      success: true,
      device: newDev,
    };
  }

  async subscribeDevice({ devId }) {
    const device = this.devices.find(d => d.devId === devId);
    if (!device) return { success: false, error: 'Device not found' };

    if (this.dpIntervals[devId]) clearInterval(this.dpIntervals[devId]);

    let currentTemp = device.dps[10] || 25;
    let targetTemp = device.dps[9] || 85;

    // Simulate real-time temperature fluctuations and state sync
    this.dpIntervals[devId] = setInterval(() => {
      const activeDev = this.devices.find(d => d.devId === devId);
      if (!activeDev) return;

      const isCooking = activeDev.dps[107] === 'start';
      if (isCooking) {
        targetTemp = activeDev.dps[9] || 85;
        if (currentTemp < targetTemp) {
          currentTemp += Math.floor(Math.random() * 3) + 1; // heat up
          if (currentTemp > targetTemp) currentTemp = targetTemp;
        } else {
          // slight fluctuation at target temp
          currentTemp = targetTemp + (Math.random() > 0.5 ? 1 : -1);
        }
        activeDev.dps[10] = currentTemp;
        activeDev.dps[5] = 'cooking';
      } else {
        // cool down to room temp
        if (currentTemp > 25) {
          currentTemp -= 1;
        }
        activeDev.dps[10] = currentTemp;
        activeDev.dps[5] = activeDev.dps[107] === 'pause' ? 'pause' : 'standby';
      }

      // Notify listeners of the updated DPs
      this.notifyListeners('dpUpdate', {
        devId,
        dps: JSON.stringify({
          10: currentTemp,
          5: activeDev.dps[5],
          7: activeDev.dps[7],
          8: activeDev.dps[8],
          9: activeDev.dps[9],
          102: activeDev.dps[102],
          107: activeDev.dps[107],
          108: activeDev.dps[108],
        }),
      });
    }, 2000);

    return { success: true, devId };
  }

  async unsubscribeDevice({ devId }) {
    if (this.dpIntervals[devId]) {
      clearInterval(this.dpIntervals[devId]);
      delete this.dpIntervals[devId];
    }
    return { success: true, devId };
  }

  async openBluetoothSettings() {
    console.log('[Web Mock] Opening system Bluetooth settings...');
    return { success: true };
  }

  async openAppSettings() {
    console.log('[Web Mock] Opening app settings...');
    return { success: true };
  }

  async publishDps({ devId, dps }) {
    const device = this.devices.find(d => d.devId === devId);
    if (device) {
      device.dps = { ...device.dps, ...dps };
      // Echo back immediately
      setTimeout(() => {
        this.notifyListeners('dpUpdate', {
          devId,
          dps: JSON.stringify(dps),
        });
      }, 50);
    }
    return { success: true, devId, dps: JSON.stringify(dps || {}) };
  }

  async startDiyCooking({ devId, temperature = 85, cookTime = 1200, power = 8, speed = '1' }) {
    const dps = buildPetChefDiyDps({ temperature, cookTime, power, speed });
    await this.publishDps({ devId, dps });
    return {
      success: true,
      devId,
      dps: JSON.stringify(dps),
    };
  }

  async pauseCooking({ devId }) {
    const dps = { 107: 'pause' };
    await this.publishDps({ devId, dps });
    return { success: true, devId, dps: JSON.stringify(dps) };
  }

  async resetCooking({ devId }) {
    const dps = { 107: 'reset' };
    await this.publishDps({ devId, dps });
    return { success: true, devId, dps: JSON.stringify(dps) };
  }

  async syncAuthState() {
    return { success: true, platform: 'web' };
  }

  async clearAuthState() {
    return { success: true, platform: 'web' };
  }

  async getAuthToken() {
    return { success: false, token: '', reason: 'web-preview' };
  }
}

export const HeyboTuya = registerPlugin('HeyboTuya', {
  web: () => new HeyboTuyaWeb(),
});

export async function prepareTuyaForHeyboUser(heyboUid, tuyaUid, password) {
  await HeyboTuya.init();
  await HeyboTuya.loginOrRegisterWithHeyboUid({ heyboUid, tuyaUid, password });
  return HeyboTuya.ensureDefaultHome();
}

export function buildPetChefDiyDps({ temperature = 85, cookTime, power = 8, speed = '1' }) {
  return {
    1: true,
    3: 'diy',
    7: cookTime,
    9: temperature,
    102: power,
    107: 'start',
    108: speed,
  };
}
