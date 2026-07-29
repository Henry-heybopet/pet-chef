import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cookingSource = fs.readFileSync(
  path.join(frontendRoot, 'src/components/CookingCenterPage.jsx'),
  'utf8',
);
const translationsSource = fs.readFileSync(
  path.join(frontendRoot, 'src/i18n/translations.js'),
  'utf8',
);

test('启动前确认只保留幼童和宠物安全项', () => {
  const checksBlock = cookingSource.match(/const START_CHECKS = \[([\s\S]*?)\];/)?.[1] || '';
  assert.match(checksBlock, /startCheckClearArea/);
  assert.doesNotMatch(checksBlock, /startCheckIngredients|startCheckWater|startCheckLid/);
});

test('一键烹饪使用整幅设备图且不显示工程数据面板', () => {
  assert.match(cookingSource, /<div className="cooking-lux-panel">[\s\S]*?src="\/machine\.jpg"/);
  assert.doesNotMatch(cookingSource, /className="cooking-lux-metrics"/);
});

test('杯盖故障文案不显示 E01 代码', () => {
  const lidFaultLine = translationsSource.match(/'deviceFaultLid': \[([^\n]+)\]/)?.[1] || '';
  assert.match(lidFaultLine, /鲜食杯盖子没有盖好/);
  assert.doesNotMatch(lidFaultLine, /E01/);
});
