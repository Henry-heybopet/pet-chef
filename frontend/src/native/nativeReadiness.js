import { Capacitor } from '@capacitor/core';

export const NATIVE_CAPABILITY_KEYS = [
  'tuya',
  'wechatAuth',
  'wechatPay',
  'alipay',
  'appleId',
  'googleId',
  'push',
  'camera',
  'fileUpload',
  'secureStorage',
  'permissions',
];

export const CAPABILITY_LABELS = {
  tuya: 'Tuya SDK',
  wechatAuth: 'WeChat Login',
  wechatPay: 'WeChat Pay',
  alipay: 'Alipay',
  appleId: 'Apple ID',
  googleId: 'Google ID',
  push: 'Push Notifications',
  camera: 'Camera',
  fileUpload: 'File Upload',
  secureStorage: 'Secure Storage',
  permissions: 'Permissions',
};

export const STATUS = {
  READY: 'ready',
  UNAVAILABLE: 'unavailable',
  NOT_CONFIGURED: 'not_configured',
  NOT_IMPLEMENTED: 'not_implemented',
  NEEDS_PERMISSION: 'needs_permission',
  ERROR: 'error',
};

export function getNativeRuntime() {
  const platform = Capacitor.getPlatform();
  const nativeAvailable = Capacitor.isNativePlatform();

  return {
    platform,
    nativeAvailable,
    webPreview: !nativeAvailable,
  };
}

export function createCapabilityStatus(capability, overrides = {}) {
  const runtime = getNativeRuntime();
  const baseStatus = runtime.nativeAvailable ? STATUS.NOT_IMPLEMENTED : STATUS.UNAVAILABLE;

  return {
    capability,
    label: CAPABILITY_LABELS[capability] || capability,
    platform: runtime.platform,
    nativeAvailable: runtime.nativeAvailable,
    webPreview: runtime.webPreview,
    ready: false,
    status: baseStatus,
    reason: runtime.nativeAvailable ? 'native-plugin-not-wired' : 'web-preview',
    message: runtime.nativeAvailable
      ? `${CAPABILITY_LABELS[capability] || capability} native plugin is not wired yet.`
      : `${CAPABILITY_LABELS[capability] || capability} is available only inside the native app shell.`,
    ...overrides,
  };
}

export function normalizeCapabilityStatus(capability, value = {}) {
  if (!value || typeof value !== 'object') {
    return createCapabilityStatus(capability, {
      status: STATUS.ERROR,
      reason: 'invalid-status',
      message: 'Native capability returned an invalid status payload.',
    });
  }

  const status = value.status || (value.ready || value.initialized ? STATUS.READY : undefined);
  const ready = typeof value.ready === 'boolean'
    ? value.ready
    : status === STATUS.READY || value.initialized === true;

  return createCapabilityStatus(capability, {
    ...value,
    capability,
    label: value.label || CAPABILITY_LABELS[capability] || capability,
    ready,
    status: status || (ready ? STATUS.READY : STATUS.NOT_IMPLEMENTED),
  });
}

export function createUnavailableResult(capability, action, extra = {}) {
  const status = createCapabilityStatus(capability, extra);

  return {
    success: false,
    capability,
    action,
    status: status.status,
    reason: status.reason,
    message: status.message,
    platform: status.platform,
    nativeAvailable: status.nativeAvailable,
    webPreview: status.webPreview,
    ...extra,
  };
}

export function createSuccessResult(capability, action, payload = {}) {
  return {
    success: true,
    capability,
    action,
    status: STATUS.READY,
    ...payload,
  };
}

export function createErrorResult(capability, action, error, extra = {}) {
  const runtime = getNativeRuntime();

  return {
    success: false,
    capability,
    action,
    status: STATUS.ERROR,
    reason: error?.code || 'native-call-failed',
    message: error?.message || 'Native capability call failed.',
    platform: runtime.platform,
    nativeAvailable: runtime.nativeAvailable,
    webPreview: runtime.webPreview,
    ...extra,
  };
}

export async function getNativeReadiness(statusLoaders = {}) {
  const runtime = getNativeRuntime();
  const capabilities = {};

  await Promise.all(NATIVE_CAPABILITY_KEYS.map(async (capability) => {
    const loader = statusLoaders[capability];

    if (!loader) {
      capabilities[capability] = createCapabilityStatus(capability);
      return;
    }

    try {
      capabilities[capability] = normalizeCapabilityStatus(capability, await loader());
    } catch (error) {
      capabilities[capability] = createCapabilityStatus(capability, {
        status: STATUS.ERROR,
        reason: error?.code || 'status-check-failed',
        message: error?.message || `${CAPABILITY_LABELS[capability] || capability} status check failed.`,
      });
    }
  }));

  const readyCount = Object.values(capabilities).filter(item => item.ready).length;

  return {
    ...runtime,
    ready: readyCount === NATIVE_CAPABILITY_KEYS.length,
    readyCount,
    totalCount: NATIVE_CAPABILITY_KEYS.length,
    capabilities,
  };
}
