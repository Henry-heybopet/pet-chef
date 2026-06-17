import { registerPlugin } from '@capacitor/core';

export const HeyboTuya = registerPlugin('HeyboTuya', {
  web: () => ({
    unavailable() {
      throw new Error('Tuya SDK is only available in the native iOS/Android app.');
    },
    async status() {
      return {
        platform: 'web',
        nativeAvailable: false,
        configured: false,
        initialized: false,
      };
    },
    async init() {
      this.unavailable();
    },
    async loginOrRegisterWithHeyboUid() {
      this.unavailable();
    },
    async getHomeList() {
      this.unavailable();
    },
    async ensureDefaultHome() {
      this.unavailable();
    },
    async getDeviceList() {
      this.unavailable();
    },
    async publishDps() {
      this.unavailable();
    },
    async startDiyCooking() {
      this.unavailable();
    },
    async pauseCooking() {
      this.unavailable();
    },
    async resetCooking() {
      this.unavailable();
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
