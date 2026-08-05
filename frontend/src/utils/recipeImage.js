const API_BASE = (import.meta.env?.VITE_API_URL || '').replace(/\/+$/, '');

export function resolveRecipeImageUrl(path, apiBase = API_BASE) {
  const value = String(path || '').trim();
  if (!value || /^(?:https?:|data:|blob:)/i.test(value)) return value;
  const localPath = value.startsWith('/') ? value : `/${value}`;
  return apiBase ? `${apiBase.replace(/\/+$/, '')}${localPath}` : localPath;
}
