import { registerPlugin } from '@capacitor/core';
import { HeyboTuya } from './heyboTuya';
import {
  STATUS,
  createCapabilityStatus,
  createErrorResult,
  createSuccessResult,
  createUnavailableResult,
  getNativeReadiness,
} from './nativeReadiness';

const HeyboAuth = registerPlugin('HeyboAuth', {
  web: () => ({
    async status() {
      return {
        wechatAuth: createCapabilityStatus('wechatAuth'),
        appleId: createCapabilityStatus('appleId'),
        googleId: createCapabilityStatus('googleId'),
      };
    },
    async wechatLogin() {
      return createUnavailableResult('wechatAuth', 'wechatLogin');
    },
    async appleLogin() {
      return createUnavailableResult('appleId', 'appleLogin');
    },
    async googleLogin() {
      return createUnavailableResult('googleId', 'googleLogin');
    },
  }),
});

const HeyboPayments = registerPlugin('HeyboPayments', {
  web: () => ({
    async status() {
      return {
        wechatPay: createCapabilityStatus('wechatPay'),
        alipay: createCapabilityStatus('alipay'),
      };
    },
    async wechatPay() {
      return createUnavailableResult('wechatPay', 'wechatPay');
    },
    async alipayPay() {
      return createUnavailableResult('alipay', 'alipayPay');
    },
  }),
});

const HeyboPush = registerPlugin('HeyboPush', {
  web: () => ({
    async status() {
      return createCapabilityStatus('push');
    },
    async register() {
      return createUnavailableResult('push', 'register');
    },
    async unregister() {
      return createUnavailableResult('push', 'unregister');
    },
  }),
});

const HeyboMedia = registerPlugin('HeyboMedia', {
  web: () => ({
    async status() {
      return {
        camera: createCapabilityStatus('camera'),
        fileUpload: createCapabilityStatus('fileUpload'),
      };
    },
    async takePhoto() {
      return createUnavailableResult('camera', 'takePhoto');
    },
    async pickImage() {
      return createUnavailableResult('camera', 'pickImage');
    },
    async pickFile() {
      return createUnavailableResult('fileUpload', 'pickFile');
    },
    async uploadFile() {
      return createUnavailableResult('fileUpload', 'uploadFile');
    },
  }),
});

const HeyboSecureStorage = registerPlugin('HeyboSecureStorage', {
  web: () => ({
    async status() {
      return createCapabilityStatus('secureStorage', {
        status: STATUS.NOT_CONFIGURED,
        reason: 'web-storage-disabled',
        message: 'Secure storage requires Keychain or Android Keystore in the native app shell.',
      });
    },
    async get({ key }) {
      return createUnavailableResult('secureStorage', 'get', { key });
    },
    async set({ key }) {
      return createUnavailableResult('secureStorage', 'set', { key });
    },
    async remove({ key }) {
      return createUnavailableResult('secureStorage', 'remove', { key });
    },
    async clear() {
      return createUnavailableResult('secureStorage', 'clear');
    },
  }),
});

const HeyboPermissions = registerPlugin('HeyboPermissions', {
  web: () => ({
    async status() {
      return createCapabilityStatus('permissions');
    },
    async check({ permission }) {
      return createUnavailableResult('permissions', 'check', { permission });
    },
    async request({ permission }) {
      return createUnavailableResult('permissions', 'request', { permission });
    },
  }),
});

async function safeNativeCall(capability, action, fn, fallback = {}) {
  try {
    return await fn();
  } catch (error) {
    if (String(error?.message || '').includes('not implemented')) {
      return createUnavailableResult(capability, action, {
        status: STATUS.NOT_IMPLEMENTED,
        reason: 'native-plugin-not-implemented',
        message: `${capability} native action ${action} is not implemented yet.`,
        ...fallback,
      });
    }

    return createErrorResult(capability, action, error, fallback);
  }
}

async function safeStatus(capability, loader) {
  try {
    return await loader();
  } catch (error) {
    if (String(error?.message || '').includes('not implemented')) {
      return createCapabilityStatus(capability, {
        status: STATUS.NOT_IMPLEMENTED,
        reason: 'native-plugin-not-implemented',
        message: `${capability} native plugin is not implemented yet.`,
      });
    }

    return createCapabilityStatus(capability, {
      status: STATUS.ERROR,
      reason: error?.code || 'status-check-failed',
      message: error?.message || `${capability} status check failed.`,
    });
  }
}

async function getAuthStatus(capability) {
  return safeStatus(capability, async () => {
    const status = await HeyboAuth.status();
    return status?.[capability] || status;
  });
}

async function getPaymentStatus(capability) {
  return safeStatus(capability, async () => {
    const status = await HeyboPayments.status();
    return status?.[capability] || status;
  });
}

async function getMediaStatus(capability) {
  return safeStatus(capability, async () => {
    const status = await HeyboMedia.status();
    return status?.[capability] || status;
  });
}

export async function getNativeCapabilityReadiness() {
  return getNativeReadiness({
    tuya: () => safeStatus('tuya', () => HeyboTuya.status()),
    wechatAuth: () => getAuthStatus('wechatAuth'),
    wechatPay: () => getPaymentStatus('wechatPay'),
    alipay: () => getPaymentStatus('alipay'),
    appleId: () => getAuthStatus('appleId'),
    googleId: () => getAuthStatus('googleId'),
    push: () => safeStatus('push', () => HeyboPush.status()),
    camera: () => getMediaStatus('camera'),
    fileUpload: () => getMediaStatus('fileUpload'),
    secureStorage: () => safeStatus('secureStorage', () => HeyboSecureStorage.status()),
    permissions: () => safeStatus('permissions', () => HeyboPermissions.status()),
  });
}

export const NativeCapabilities = {
  readiness: getNativeCapabilityReadiness,
  tuya: {
    status: () => safeStatus('tuya', () => HeyboTuya.status()),
    init: (options = {}) => safeNativeCall('tuya', 'init', () => HeyboTuya.init(options)),
    loginOrRegisterWithHeyboUid: (options) => safeNativeCall('tuya', 'loginOrRegisterWithHeyboUid', () => HeyboTuya.loginOrRegisterWithHeyboUid(options)),
    ensureDefaultHome: (options = {}) => safeNativeCall('tuya', 'ensureDefaultHome', () => HeyboTuya.ensureDefaultHome(options)),
    getDeviceList: (options = {}) => safeNativeCall('tuya', 'getDeviceList', () => HeyboTuya.getDeviceList(options)),
    startWifiPairing: (options) => safeNativeCall('tuya', 'startWifiPairing', () => HeyboTuya.startWifiPairing(options)),
    stopPairing: (options = {}) => safeNativeCall('tuya', 'stopPairing', () => HeyboTuya.stopPairing(options)),
    publishDps: (options) => safeNativeCall('tuya', 'publishDps', () => HeyboTuya.publishDps(options)),
    unbindDevice: (options) => safeNativeCall('tuya', 'unbindDevice', () => HeyboTuya.unbindDevice(options)),
    startBleScan: (options = {}) => safeNativeCall('tuya', 'startBleScan', () => HeyboTuya.startBleScan(options)),
    stopBleScan: (options = {}) => safeNativeCall('tuya', 'stopBleScan', () => HeyboTuya.stopBleScan(options)),
    connectBleDevice: (options) => safeNativeCall('tuya', 'connectBleDevice', () => HeyboTuya.connectBleDevice(options)),
    subscribeDevice: (options) => safeNativeCall('tuya', 'subscribeDevice', () => HeyboTuya.subscribeDevice(options)),
    unsubscribeDevice: (options) => safeNativeCall('tuya', 'unsubscribeDevice', () => HeyboTuya.unsubscribeDevice(options)),
    openBluetoothSettings: (options = {}) => safeNativeCall('tuya', 'openBluetoothSettings', () => HeyboTuya.openBluetoothSettings(options)),
  },
  auth: {
    status: (capability = 'wechatAuth') => getAuthStatus(capability),
    wechatLogin: (options = {}) => safeNativeCall('wechatAuth', 'wechatLogin', () => HeyboAuth.wechatLogin(options)),
    appleLogin: (options = {}) => safeNativeCall('appleId', 'appleLogin', () => HeyboAuth.appleLogin(options)),
    googleLogin: (options = {}) => safeNativeCall('googleId', 'googleLogin', () => HeyboAuth.googleLogin(options)),
  },
  payments: {
    status: (capability = 'wechatPay') => getPaymentStatus(capability),
    wechatPay: (order) => safeNativeCall('wechatPay', 'wechatPay', () => HeyboPayments.wechatPay(order)),
    alipayPay: (order) => safeNativeCall('alipay', 'alipayPay', () => HeyboPayments.alipayPay(order)),
  },
  push: {
    status: () => safeStatus('push', () => HeyboPush.status()),
    register: (options = {}) => safeNativeCall('push', 'register', () => HeyboPush.register(options)),
    unregister: (options = {}) => safeNativeCall('push', 'unregister', () => HeyboPush.unregister(options)),
  },
  media: {
    status: (capability = 'camera') => getMediaStatus(capability),
    takePhoto: (options = {}) => safeNativeCall('camera', 'takePhoto', () => HeyboMedia.takePhoto(options)),
    pickImage: (options = {}) => safeNativeCall('camera', 'pickImage', () => HeyboMedia.pickImage(options)),
    pickFile: (options = {}) => safeNativeCall('fileUpload', 'pickFile', () => HeyboMedia.pickFile(options)),
    uploadFile: (options = {}) => safeNativeCall('fileUpload', 'uploadFile', () => HeyboMedia.uploadFile(options)),
  },
  secureStorage: {
    status: () => safeStatus('secureStorage', () => HeyboSecureStorage.status()),
    get: (key) => safeNativeCall('secureStorage', 'get', () => HeyboSecureStorage.get({ key })),
    set: (key, value) => safeNativeCall('secureStorage', 'set', () => HeyboSecureStorage.set({ key, value })),
    remove: (key) => safeNativeCall('secureStorage', 'remove', () => HeyboSecureStorage.remove({ key })),
    clear: () => safeNativeCall('secureStorage', 'clear', () => HeyboSecureStorage.clear()),
  },
  permissions: {
    status: () => safeStatus('permissions', () => HeyboPermissions.status()),
    check: (permission) => safeNativeCall('permissions', 'check', () => HeyboPermissions.check({ permission })),
    request: (permission) => safeNativeCall('permissions', 'request', () => HeyboPermissions.request({ permission })),
  },
  helpers: {
    success: createSuccessResult,
    unavailable: createUnavailableResult,
    error: createErrorResult,
  },
};

export default NativeCapabilities;
