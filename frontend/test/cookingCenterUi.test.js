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
const recipeMakeSource = fs.readFileSync(
  path.join(frontendRoot, 'src/components/RecipeMake.jsx'),
  'utf8',
);
const translationsSource = fs.readFileSync(
  path.join(frontendRoot, 'src/i18n/translations.js'),
  'utf8',
);
const apiSource = fs.readFileSync(
  path.join(frontendRoot, 'src/api/index.js'),
  'utf8',
);
const stylesSource = fs.readFileSync(
  path.join(frontendRoot, 'src/index.css'),
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

test('喂食反馈保存后可读回并显示已反馈状态与反馈内容', () => {
  assert.match(apiSource, /listFeedingRecords:.*\/api\/feeding-records/);
  assert.match(cookingSource, /setFeedingRecords\(feedingResult\.records \|\| \[\]\)/);
  assert.match(cookingSource, /feedback \? t\('feedbackSubmitted'\) : t\('feedingFeedback'\)/);
  assert.match(cookingSource, /feedback\.palatability/);
  assert.match(cookingSource, /feedback\.stool_status/);
});

test('烹饪中心主图文字使用高对比浅色', () => {
  assert.match(stylesSource, /\.cooking-hero-copy h1\s*\{[^}]*color:\s*#fff/s);
  assert.match(stylesSource, /\.cooking-hero-copy p\s*\{[^}]*color:\s*rgba\(255,\s*255,\s*255,\s*0\.9\)/s);
});

test('浅色主题下 Wi-Fi 密码圆点、明文和光标使用可见颜色', () => {
  assert.match(
    stylesSource,
    /\.cooking-wifi-input,\s*\.cooking-password-row input,[\s\S]*?color:\s*var\(--theme-text-primary\)\s*!important;/,
  );
  assert.match(
    stylesSource,
    /\.cooking-password-row input\s*\{[^}]*caret-color:\s*var\(--theme-fresh\)/s,
  );
});

test('王牌优品宠物鲜食按每份100克提供1至8份', () => {
  const titleLine = translationsSource.match(/'customAmount': \[([^\n]+)\]/)?.[1] || '';
  const descriptionLine = translationsSource.match(/'freshPackDesc': \[([^\n]+)\]/)?.[1] || '';
  assert.match(titleLine, /王牌优品宠物鲜食/);
  assert.doesNotMatch(titleLine, /王牌优品鲜食包/);
  assert.match(descriptionLine, /每份100克，可选1-8份/);
  assert.match(recipeMakeSource, /packCount \* 100/);
  assert.match(recipeMakeSource, /Array\.from\(\{ length: 8 \}/);
  assert.match(recipeMakeSource, /count \* 100/);
  assert.match(recipeMakeSource, /packGrams: 100/);
});

test('一键烹饪总时长不再叠加历史预热时间', () => {
  assert.doesNotMatch(cookingSource, /legacyPreheatMinutes/);
  assert.match(cookingSource, /Number\(cookMinutes\) \* 60/);
});
