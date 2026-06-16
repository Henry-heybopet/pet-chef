import { registerPlugin } from '@capacitor/core';

export const HeyboTuya = registerPlugin('HeyboTuya', {
  web: () => ({
    async status() {
      return {
        platform: 'web',
        nativeAvailable: false,
        configured: false,
        initialized: false,
      };
    },
    async init() {
      throw new Error('Tuya SDK is only available in the native iOS/Android app.');
    },
  }),
});
