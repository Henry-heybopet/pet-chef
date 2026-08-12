import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const styles = fs.readFileSync(path.join(frontendRoot, 'src/index.css'), 'utf8');
const pets = fs.readFileSync(path.join(frontendRoot, 'src/components/PetManagementScreen.jsx'), 'utf8');

test('宠物卡片操作区允许多语言按钮换行', () => {
  assert.match(pets, /className="pet-management-actions"/);
  assert.match(styles, /\.pet-management-actions\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(styles, /\.pet-management-info\s*\{[^}]*min-width:\s*0/s);
});

test('烹饪记录反馈按钮不再使用固定宽度和单行文案', () => {
  const rule = styles.match(/\.cooking-record-row \.cooking-center-btn\s*\{([^}]*)\}/)?.[1] || '';
  assert.match(rule, /width:\s*clamp\(72px,\s*28vw,\s*120px\)/);
  assert.match(rule, /white-space:\s*normal/);
  assert.match(rule, /overflow-wrap:\s*anywhere/);
});

test('喂食反馈选项为多语言文案保留换行空间', () => {
  const gridRule = styles.match(/\.cooking-option-grid\s*\{([^}]*)\}/)?.[1] || '';
  const buttonRule = styles.match(/\.cooking-option-grid button\s*\{([^}]*)\}/)?.[1] || '';

  assert.match(gridRule, /grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  assert.match(buttonRule, /white-space:\s*normal/);
  assert.match(buttonRule, /overflow-wrap:\s*anywhere/);
});
