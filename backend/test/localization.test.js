const test = require('node:test');
const assert = require('node:assert/strict');
const {
  SUPPORTED_LOCALES,
  normalizeLocale,
  localizeFinding,
  localizeSemanticResult,
  localizeSemanticResultWithAi,
} = require('../src/services/localization');

const safetyFinding = {
  risk_code: 'FORBIDDEN',
  level: 'danger',
  domain: 'safety',
  ingredient_id: 'grape',
  facts: { ingredient_name: '葡萄', daily_kcal_min: 420, daily_kcal_max: 480 },
  title: '安全红线：不可使用',
  reason: '葡萄对犬类存在明确禁食或伤害风险。',
  adjustment: '立即移除该食材后重新验证。',
};

test('locale normalization supports the eight product locales and safely falls back to Chinese', () => {
  assert.deepEqual(SUPPORTED_LOCALES, ['zh', 'en', 'de', 'fr', 'es', 'it', 'ja', 'ko']);
  assert.equal(normalizeLocale('de-DE'), 'de');
  assert.equal(normalizeLocale('JA_jp'), 'ja');
  assert.equal(normalizeLocale('pt-BR'), 'zh');
  assert.equal(normalizeLocale(), 'zh');
});

test('all eight locales preserve the semantic safety decision and numeric facts', () => {
  for (const locale of SUPPORTED_LOCALES) {
    const output = localizeFinding(safetyFinding, locale);
    assert.equal(output.semantic.title, undefined);
    assert.equal(output.semantic.reason, undefined);
    assert.equal(output.semantic.adjustment, undefined);
    assert.equal(output.semantic.risk_code, safetyFinding.risk_code);
    assert.deepEqual(output.semantic.facts, safetyFinding.facts);
    assert.equal(output.localized.risk_code, 'FORBIDDEN');
    assert.equal(output.localized.level, 'danger');
    assert.equal(output.localized.domain, 'safety');
    assert.equal(output.localized.ingredient_id, 'grape');
    assert.deepEqual(output.localized.facts, safetyFinding.facts);
    if (locale === 'zh') assert.match(output.presentation.reason, /葡萄/);
    else assert.doesNotMatch(output.presentation.reason, /葡萄/);
    assert.equal(output.presentation.translation_status, locale === 'zh' ? 'source' : 'translated');
  }
});

test('all required safety templates localize without changing codes, levels, ids, or facts', () => {
  const cases = [
    ['INEDIBLE', { ingredient_name: '葡萄' }],
    ['FORBIDDEN', { ingredient_name: '葡萄' }],
    ['AI_UNSAFE_INGREDIENT', { ingredient_name: '葡萄', basis: '' }],
    ['INGREDIENT_SAFETY_UNCERTAIN', { ingredient_name: '葡萄' }],
    ['PET_FOOD_CONFLICT', { ingredient_name: '葡萄' }],
    ['PET_ALLERGEN', { ingredient_name: '葡萄', allergen: 'grape' }],
  ];

  for (const locale of SUPPORTED_LOCALES) {
    for (const [riskCode, facts] of cases) {
      const input = { risk_code: riskCode, level: 'danger', ingredient_id: 'grape', facts };
      const output = localizeFinding(input, locale);
      assert.equal(output.semantic.risk_code, riskCode);
      assert.deepEqual(output.semantic.facts, facts);
      assert.equal(output.localized.risk_code, riskCode);
      assert.equal(output.localized.level, 'danger');
      assert.equal(output.localized.ingredient_id, 'grape');
      assert.deepEqual(output.localized.facts, facts);
      assert.ok(output.presentation.title);
      assert.ok(output.presentation.reason);
      assert.ok(output.presentation.adjustment);
      assert.notEqual(output.presentation.translation_status, 'fallback');
    }
  }
});

test('result keeps semantic and presentation separate while exposing compatible localized findings', () => {
  const input = {
    scores: [{ key: 'safety', value: 0 }],
    daily_need: { min_kcal: 420, max_kcal: 480, target_weight_note: '中文目标说明', activity_note: '中文活动说明' },
    intake_feasibility: { excessive_volume: true, volume_advice: '中文容量建议', stage_label: '成年犬' },
    cooking_plan: null,
    findings: [safetyFinding],
  };
  const output = localizeSemanticResult(input, 'de');

  assert.equal(output.semantic.findings[0].title, undefined);
  assert.equal(output.semantic.findings[0].reason, undefined);
  assert.equal(output.semantic.findings[0].adjustment, undefined);
  assert.deepEqual(output.semantic.scores, input.scores);
  assert.deepEqual(output.semantic.daily_need, { min_kcal: 420, max_kcal: 480 });
  assert.deepEqual(output.semantic.intake_feasibility, { excessive_volume: true });
  assert.equal(output.semantic.cooking_plan, null);
  assert.equal(output.presentation.findings[0].translation_status, 'translated');
  assert.equal(output.findings[0].risk_code, 'FORBIDDEN');
  assert.equal(output.findings[0].level, 'danger');
  assert.equal(output.findings[0].ingredient_id, 'grape');
  assert.deepEqual(output.findings[0].facts, safetyFinding.facts);
  assert.notEqual(output.findings[0].title, safetyFinding.title);
  assert.match(output.findings[0].reason, /Trauben/);
  assert.doesNotMatch(output.findings[0].reason, /葡萄/);
});

test('missing templates visibly fall back to canonical Chinese without hiding a danger', () => {
  const unknown = {
    risk_code: 'NEW_DANGER_WITHOUT_TEMPLATE',
    level: 'danger',
    ingredient_id: 'unknown-1',
    facts: { count: 3 },
    title: '新的中文危险提示',
    reason: '必须保留的中文原因',
    adjustment: '立即停止使用。',
  };
  const mixed = localizeSemanticResult({ findings: [safetyFinding, unknown] }, 'en');
  const fallback = mixed.findings[1];

  assert.equal(mixed.translation_status, 'partial');
  assert.equal(mixed.fallback_locale, 'zh');
  assert.equal(fallback.translation_status, 'fallback');
  assert.equal(fallback.fallback_locale, 'zh');
  assert.equal(fallback.level, 'danger');
  assert.equal(fallback.risk_code, unknown.risk_code);
  assert.equal(fallback.title, unknown.title);
  assert.equal(fallback.reason, unknown.reason);
  assert.equal(fallback.adjustment, unknown.adjustment);
  assert.equal(mixed.semantic.findings[1].risk_code, unknown.risk_code);
  assert.equal(mixed.semantic.findings[1].title, undefined);
});

test('AI fallback translates only non-safety presentation fields and preserves semantic data', async () => {
  const nutrition = {
    risk_code: 'DAILY_ENERGY_LOW', risk_level: 'warning', level: 'warning', domain: 'energy', ingredient_id: null,
    facts: { total_kcal: 300, min_kcal: 420 }, title: '每日能量偏低', reason: '当前只有300 kcal。', adjustment: '补足能量。',
  };
  const dangerWithoutTemplate = {
    risk_code: 'NEW_SAFETY_DANGER', risk_level: 'danger', level: 'danger', domain: 'safety', ingredient_id: 'unknown',
    facts: {}, title: '未知危险', reason: '必须保留中文。', adjustment: '立即停止。',
  };
  let received;
  const output = await localizeSemanticResultWithAi({ findings: [nutrition, dangerWithoutTemplate], scores: [{ key: 'safety', value: 0 }] }, 'en', async input => {
    received = input;
    return { items: input.items.map(item => ({ ...item, title: 'Low daily energy', reason: `The recipe provides only ${item.reason.match(/__REASON_VALUE_\d+__/)[0]}.`, adjustment: 'Increase energy and check again.' })) };
  });

  assert.equal(received.items.length, 1);
  assert.equal(received.items[0].risk_code, 'DAILY_ENERGY_LOW');
  assert.equal(output.findings[0].translation_status, 'ai_translated');
  assert.equal(output.findings[0].risk_code, nutrition.risk_code);
  assert.deepEqual(output.findings[0].facts, nutrition.facts);
  assert.equal(output.findings[1].translation_status, 'fallback');
  assert.equal(output.findings[1].reason, dangerWithoutTemplate.reason);
  assert.equal(output.semantic.findings[0].title, undefined);
  assert.equal(output.semantic.findings[1].reason, undefined);
  assert.deepEqual(output.semantic.scores, [{ key: 'safety', value: 0 }]);
});

test('AI fallback rejects text that drops protected numeric facts', async () => {
  const nutrition = {
    risk_code: 'DAILY_ENERGY_LOW', risk_level: 'warning', domain: 'energy',
    facts: { total_kcal: 300, min_kcal: 420 }, title: '每日能量偏低', reason: '当前只有300 kcal。', adjustment: '提高到420 kcal。',
  };
  const output = await localizeSemanticResultWithAi({ findings: [nutrition] }, 'en', async input => ({
    items: input.items.map(item => ({ ...item, title: 'Low energy', reason: 'Too little energy.', adjustment: 'Increase it.' })),
  }));
  assert.equal(output.findings[0].translation_status, 'fallback');
  assert.equal(output.findings[0].reason, nutrition.reason);
  assert.equal(output.findings[0].adjustment, nutrition.adjustment);
});

test('AI fallback rejects reordered numeric placeholders', async () => {
  const nutrition = {
    risk_code: 'DAILY_ENERGY_LOW', risk_level: 'warning', domain: 'energy', facts: { total_kcal: 300, min_kcal: 420 },
    title: '每日能量偏低', reason: '当前300 kcal，最低需要420 kcal。', adjustment: '按建议补足。',
  };
  const output = await localizeSemanticResultWithAi({ findings: [nutrition] }, 'en', async input => {
    const [first, second] = input.items[0].reason.match(/__REASON_VALUE_\d+__/g);
    return { items: [{ ...input.items[0], title: 'Low energy', reason: `Current ${second}; minimum ${first}.`, adjustment: 'Increase it.' }] };
  });
  assert.equal(output.findings[0].translation_status, 'fallback');
  assert.equal(output.findings[0].reason, nutrition.reason);
});

test('Fresh Match compatibility message is localized and preserved', () => {
  const output = localizeFinding({ ...safetyFinding, message: `${safetyFinding.reason} ${safetyFinding.adjustment}` }, 'de');
  assert.match(output.localized.message, /Trauben/);
  assert.doesNotMatch(output.localized.message, /葡萄/);
});

test('unknown Chinese ingredient does not report a mixed-language template as translated', () => {
  const output = localizeFinding({
    risk_code: 'FORBIDDEN', risk_level: 'danger', ingredient_id: 'unknown',
    facts: { ingredient_name: '未知食材' }, title: '安全红线', reason: '未知食材不可使用。', adjustment: '立即移除。',
  }, 'de');
  assert.equal(output.presentation.translation_status, 'fallback');
  assert.equal(output.presentation.reason, '未知食材不可使用。');
});
