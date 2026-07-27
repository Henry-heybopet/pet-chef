import { Capacitor, registerPlugin, WebPlugin } from '@capacitor/core';

class HeyboAppUpdateWeb extends WebPlugin {
  async getInfo() {
    return {
      native: false,
      platform: 'web',
      applicationId: '',
      versionCode: Number.MAX_SAFE_INTEGER,
      versionName: 'web',
    };
  }

  async openUpdate({ url }) {
    window.location.assign(url);
  }
}

export const isNativeAndroid = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
export const AppUpdate = registerPlugin('HeyboAppUpdate', {
  web: () => new HeyboAppUpdateWeb(),
});
