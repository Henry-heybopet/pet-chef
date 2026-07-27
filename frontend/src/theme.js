export const THEME_STORAGE_KEY = 'heybopet_theme';

export const normalizeTheme = value => value === 'dark' ? 'dark' : 'light';

function resolveStorage(storage) {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function readStoredTheme(storage) {
  try {
    return normalizeTheme(resolveStorage(storage)?.getItem(THEME_STORAGE_KEY));
  } catch {
    return 'light';
  }
}

export function applyTheme(theme, root = globalThis.document?.documentElement, storage) {
  const next = normalizeTheme(theme);
  if (root) {
    root.dataset.theme = next;
    root.style.colorScheme = next;
  }
  try {
    resolveStorage(storage)?.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Theme persistence is best-effort; the in-memory selection still applies.
  }
  return next;
}
