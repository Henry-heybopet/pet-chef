import assert from 'node:assert/strict';
import test from 'node:test';
import { applyTheme, normalizeTheme, readStoredTheme, THEME_STORAGE_KEY } from '../src/theme.js';

test('light is the default and unsupported values fall back to light', () => {
  assert.equal(normalizeTheme(undefined), 'light');
  assert.equal(normalizeTheme('system'), 'light');
  assert.equal(readStoredTheme({ getItem: () => null }), 'light');
});

test('dark selection is applied and persisted', () => {
  const root = { dataset: {}, style: {} };
  const saved = new Map();
  const storage = {
    getItem: key => saved.get(key) || null,
    setItem: (key, value) => saved.set(key, value),
  };

  assert.equal(applyTheme('dark', root, storage), 'dark');
  assert.equal(root.dataset.theme, 'dark');
  assert.equal(root.style.colorScheme, 'dark');
  assert.equal(saved.get(THEME_STORAGE_KEY), 'dark');
  assert.equal(readStoredTheme(storage), 'dark');
});
