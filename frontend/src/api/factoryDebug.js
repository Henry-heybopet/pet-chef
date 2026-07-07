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

export const factoryDebugApi = {
  heyboMockLogin: (body) => request('/api/auth/mock-login', { method: 'POST', body }),
  registerDevice: (body, token) => request('/api/devices', { method: 'POST', body, token }),
  recordCookingOperation: (body, token) => request('/api/operations/cooking', { method: 'POST', body, token }),
  listCookingOperations: (token) => request('/api/operations/cooking', { token }),
};
