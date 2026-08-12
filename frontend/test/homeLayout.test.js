import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stylesSource = fs.readFileSync(path.join(frontendRoot, 'src/index.css'), 'utf8');

test('首页三个入口固定在可视区内且不使用滚动容器', () => {
  const actionsRule = stylesSource.match(/\.home-actions\s*\{([^}]*)\}/)?.[1] || '';
  const buttonRule = stylesSource.match(/\.home-action-button\s*\{([^}]*)\}/)?.[1] || '';

  assert.match(actionsRule, /overflow:\s*hidden/);
  assert.match(actionsRule, /overscroll-behavior:\s*none/);
  assert.doesNotMatch(actionsRule, /overflow-y:\s*auto/);
  assert.match(buttonRule, /flex:\s*1 1 0/);
  assert.match(buttonRule, /min-height:\s*0/);
});

test('移动端首页只使用设备真实安全区，不重复预留顶部空白', () => {
  assert.match(
    stylesSource,
    /@media \(max-width: 768px\)[\s\S]*?\.home-screen\s*\{[^}]*--safe-top:\s*env\(safe-area-inset-top,\s*0px\)[^}]*--control-top:\s*calc\(12px \+ var\(--safe-top\)\)/,
  );
});
