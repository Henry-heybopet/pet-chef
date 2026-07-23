const test = require('node:test');
const assert = require('node:assert/strict');
const {
  SUPPORTED_LOCALES,
  normalizeLocale,
  localizeFinding,
  localizeSemanticResult,
  localizeSemanticResultWithAi,
} = require('../src/services/localization');
const { ingredientsDb } = require('../src/data/ingredients_db');
const { _test: freshCheck } = require('../src/services/fresh_check');

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

test('AI translates only whitelisted summary fields and never receives findings', async () => {
  const finding = { ...safetyFinding };
  let received;
  const source = {
    findings: [finding],
    scores: [{ key: 'safety', label_code: 'SCORE_SAFETY_LABEL', label: '食材安全性', value: 0 }],
    ai_summary: '每日建议300 kcal。',
    ai_macro_assessment: { protein_status: 'low', fat_status: 'adequate', carb_structure_status: 'reasonable', reasoning: '蛋白质低于420 mg。', adjustments: ['增加10 g蛋白质。'] },
  };
  const output = await localizeSemanticResultWithAi(source, 'en', async input => {
    received = input;
    return { items: input.items.map(item => ({ ...item, reason: `Translated ${item.reason}` })) };
  });

  assert.deepEqual(received.items.map(item => item.item_id), ['ai_summary', 'ai_macro_reasoning', 'ai_macro_adjustment:0']);
  assert.ok(received.items.every(item => item.risk_code === 'AI_PRESENTATION_TEXT'));
  assert.ok(received.items.every(item => !String(item.reason).includes('葡萄')));
  assert.equal(output.findings[0].risk_code, 'FORBIDDEN');
  assert.equal(output.findings[0].translation_status, 'translated');
  assert.match(output.ai_summary, /300 kcal/);
  assert.match(output.ai_macro_assessment.reasoning, /420 mg/);
  assert.match(output.ai_macro_assessment.adjustments[0], /10 g/);
  assert.equal(output.ai_macro_assessment.protein_status, 'low');
  assert.equal(output.ai_macro_assessment.fat_status, 'adequate');
  assert.equal(output.ai_macro_assessment.carb_structure_status, 'reasonable');
  assert.deepEqual(output.semantic.scores, [{ key: 'safety', label_code: 'SCORE_SAFETY_LABEL', value: 0 }]);
});

test('AI summary translation rejects dropped numeric placeholders and visibly falls back', async () => {
  const source = { findings: [], ai_summary: '当前只有300 kcal，最低需要420 kcal。' };
  const output = await localizeSemanticResultWithAi(source, 'en', async input => ({
    items: input.items.map(item => ({ ...item, reason: 'Too little energy.' })),
  }));
  assert.equal(output.ai_summary, source.ai_summary);
  assert.equal(output.presentation.ai_summary.translation_status, 'fallback');
  assert.equal(output.translation_status, 'fallback');
  assert.equal(output.fallback_locale, 'zh');
});

test('AI summary translation rejects reordered numeric placeholders', async () => {
  const source = { findings: [], ai_summary: '当前300 kcal，最低需要420 kcal。' };
  const output = await localizeSemanticResultWithAi(source, 'en', async input => {
    const [first, second] = input.items[0].reason.match(/__REASON_VALUE_\d+__/g);
    return { items: [{ ...input.items[0], reason: `Current ${second}; minimum ${first}.` }] };
  });
  assert.equal(output.ai_summary, source.ai_summary);
  assert.equal(output.presentation.ai_summary.translation_status, 'fallback');
});

test('all eight locales preserve deep semantic data while localizing structured Fresh Check sections', () => {
  const report = freshCheck.localCheck({
    pet: { id: 'dog-1', species: 'dog', age_months: 24, current_weight_kg: 10, activity_level: 'medium', feeding_goal: 'maintenance' },
    ingredients: [{ name: '葡萄', grams: 20 }, { name: '鸡胸肉', grams: 80 }],
    mealIntent: 'long_term', ingredientMap: ingredientsDb,
  });
  report.b_pack = {
    source: 'test', needed: true,
    selected: null,
    application: { dose_grams: 10, basis_code: 'B_PACK_DOSE_10_PERCENT_POST_COOK', basis: '每100克食材配10克全价营养包', timing: 'post_cook' },
    options: [{ category_code: 'ADULT_GENERAL', category: '成犬通用', name: '成犬通用包', description: '中文说明', enabled: true, reason_code: 'B_PACK_ADULT_ELIGIBLE', reason: '适用。' }],
  };
  const zh = localizeSemanticResult(report, 'zh').semantic;
  for (const locale of SUPPORTED_LOCALES) {
    const output = localizeSemanticResult(report, locale);
    assert.deepEqual(output.semantic, zh);
    assert.deepEqual(output.scores.map(item => [item.key, item.value]), report.scores.map(item => [item.key, item.value]));
    assert.equal(output.findings.find(item => item.risk_code === 'FORBIDDEN').risk_level, 'danger');
    assert.ok(output.presentation.daily_need);
    assert.ok(output.presentation.suitability_detail);
    assert.ok(output.presentation.long_term_detail);
    assert.ok(output.presentation.b_pack);
    if (locale !== 'zh') {
      const { energy_estimates, unknown_ingredients, ...visibleDailyNeed } = output.daily_need;
      const visible = JSON.stringify({ daily_need: visibleDailyNeed, suitability_detail: output.suitability_detail, long_term_detail: output.long_term_detail, scores: output.scores, b_pack: output.b_pack, findings: output.findings.map(({ facts, ...item }) => item) });
      if (locale !== 'ja') assert.doesNotMatch(visible, /[\u3400-\u9fff]/u);
      assert.doesNotMatch(visible, /当前能量|食谱结构平衡性|每日营养需求估算不是兽医处方|数据库中该分类/);
    }
  }
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
