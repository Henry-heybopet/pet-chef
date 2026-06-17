import { registerPlugin } from '@capacitor/core';

const DEMO_DEVICE = {
  devId: 'demo_pet_chef_001',
  name: 'Pet Chef Demo',
  productId: 'ak2kofibhuvdtqip',
  isOnline: true,
  isPetChef: true,
  dps: {
    1: false,
    3: 'diy',
    5: 'standby',
    9: 25,
  },
};

export const HeyboTuya = registerPlugin('HeyboTuya', {
  web: () => ({
    async status() {
      return {
        platform: 'web',
        nativeAvailable: false,
        configured: true,
        initialized: true,
        pid: 'ak2kofibhuvdtqip',
        homeId: 10001,
      };
    },
    async init() {
      return { initialized: true, appKey: 'web-demo' };
    },
    async loginOrRegisterWithHeyboUid({ heyboUid }) {
      return { success: true, tuyaUid: `heybo_${heyboUid || 'demo'}` };
    },
    async getHomeList() {
      return {
        success: true,
        homeId: 10001,
        homes: [{ homeId: 10001, name: 'Heybo Pet Demo', geoName: 'China', deviceCount: 1 }],
      };
    },
    async ensureDefaultHome() {
      return { success: true, homeId: 10001, name: 'Heybo Pet Demo', geoName: 'China', deviceCount: 1 };
    },
    async getDeviceList() {
      return { success: true, homeId: 10001, devices: [DEMO_DEVICE] };
    },
    async getActivatorToken() {
      return { success: true, homeId: 10001, token: 'web-demo-token' };
    },
    async startWifiPairing({ ssid }) {
      return {
        success: true,
        homeId: 10001,
        mode: 'EZ',
        token: 'web-demo-token',
        device: { ...DEMO_DEVICE, name: ssid ? `Pet Chef (${ssid})` : DEMO_DEVICE.name },
      };
    },
    async stopPairing() {
      return { success: true };
    },
    async publishDps({ devId, dps }) {
      return { success: true, devId, dps: JSON.stringify(dps || {}) };
    },
    async startDiyCooking({ devId, temperature = 85, cookTime = 1200, power = 8, speed = '1' }) {
      return {
        success: true,
        devId,
        dps: JSON.stringify(buildPetChefDiyDps({ temperature, cookTime, power, speed })),
      };
    },
    async pauseCooking({ devId }) {
      return { success: true, devId, dps: JSON.stringify({ 107: 'pause' }) };
    },
    async resetCooking({ devId }) {
      return { success: true, devId, dps: JSON.stringify({ 107: 'reset' }) };
    },
  }),
});

export async function prepareTuyaForHeyboUser(heyboUid) {
  await HeyboTuya.init();
  await HeyboTuya.loginOrRegisterWithHeyboUid({ heyboUid });
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
