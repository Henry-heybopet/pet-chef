const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export function resolveRecipeImageUrl(path) {
  const value = String(path || '').trim();
  if (!value || /^(?:https?:|data:|blob:)/i.test(value)) return value;
  if (!API_BASE) return value.startsWith('/') ? value : `/${value}`;
  return `${API_BASE}/${value.replace(/^\/+/, '')}`;
}
