const BASE = import.meta.env.VITE_API_URL || '';

async function request(path, { method = 'GET', body, token } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok && !payload.error) {
    payload.error = `Request failed: HTTP ${response.status}`;
  }
  return payload;
}

function getDeviceId() {
  const key = 'heybo_device_id';
  let value = localStorage.getItem(key);
  if (!value) {
    value = globalThis.crypto?.randomUUID?.()
      || `web-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(key, value);
  }
  return value;
}

export const factoryDebugApi = {
  sendSmsCode: (body) => request('/api/auth/sms/send', {
    method: 'POST',
    body: { ...body, device_id: getDeviceId() },
  }),
  verifySmsCode: (body) => request('/api/auth/sms/verify', {
    method: 'POST',
    body: { ...body, device_id: getDeviceId() },
  }),
  registerDevice: (body, token) => request('/api/devices', { method: 'POST', body, token }),
  syncDeviceDp: (deviceId, body, token) => request(`/api/devices/${encodeURIComponent(deviceId)}/dp-sync`, { method: 'POST', body, token }),
  recordCookingOperation: (body, token) => request('/api/operations/cooking', { method: 'POST', body, token }),
  listCookingOperations: (token) => request('/api/operations/cooking', { token }),
};
