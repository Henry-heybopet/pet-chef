const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  SUPPORTED_LOCALES,
  FINDING_TEMPLATE_CODES,
  VALIDATION_DETAIL_CODES,
  normalizeLocale,
  localizeFinding,
  localizeSemanticResult,
  localizeSemanticResultWithAi,
  aiNutritionPresentationIsValid,
  buildAiNutritionFallback,
  cachedAiNutritionAnalysis,
  validationDetailsTranslationStatus,
} = require('../src/services/localization');
const { ingredientsDb } = require('../src/data/ingredients_db');
const { _test: freshCheck } = require('../src/services/fresh_check');
const { FRESH_CHECK_FINDING_TEMPLATES } = require('../src/services/fresh_check_finding_templates');

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
  assert.equal(fallback.localization_error_code, 'MISSING_FINDING_TEMPLATE');
  assert.equal(fallback.level, 'danger');
  assert.equal(fallback.risk_code, unknown.risk_code);
  assert.equal(fallback.title, unknown.title);
  assert.equal(fallback.reason, unknown.reason);
  assert.equal(fallback.adjustment, unknown.adjustment);
  assert.equal(mixed.semantic.findings[1].risk_code, unknown.risk_code);
  assert.equal(mixed.semantic.findings[1].title, undefined);
});

test('every finding code emitted by Fresh Check has a dedicated eight-locale template', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/services/fresh_check.js'), 'utf8');
  const emitted = new Map();
  const findingCode = /'([A-Z][A-Z0-9_]+)'\s*,\s*'(safety|profile|structure|nutrition|energy|cooking)'/g;
  let match;
  while ((match = findingCode.exec(source))) emitted.set(match[1], match[2]);

  assert.ok(emitted.size > 0);
  for (const [riskCode, domain] of emitted) {
    assert.ok(FINDING_TEMPLATE_CODES.includes(riskCode), `missing dedicated template: ${riskCode}`);
    for (const locale of SUPPORTED_LOCALES) {
      const output = localizeFinding({
        risk_code: riskCode,
        code: riskCode,
        domain,
        level: 'warning',
        ingredient_id: 'grape',
        facts: {
          ingredient_id: 'grape',
          ingredient_name: '葡萄',
          allergen: 'grape',
          basis: '',
          actual_pct: 42,
          minimum_pct: 40,
          recommended_minimum_pct: 45,
          high_range_minimum_pct: 65,
          maximum_pct: 75,
          low_threshold_pct: 10,
          actual_g_per_1000kcal: 20,
          minimum_g_per_1000kcal: 25,
          coverage_weight_pct: 90,
          lookup_attempts: 2,
          grams_per_100g: 10,
          ingredient_names: ['ingredient-a'],
          total_weight_g: 20,
          minimum_weight_g: 30,
          current_weight_kg: 5.3,
          target_weight_kg: 5.5,
          daily_food_weight_g: 600,
          daily_food_weight_pct_body_weight: 11.3,
          grams_per_meal: 150,
          reference_max_daily_grams: 400,
          exceeds_reference_by_pct: 50,
          total_kcal: 500,
          min_kcal: 600,
          max_kcal: 800,
          gap_kcal: 200,
          suggested_grams: 400,
          meals_per_day: 4,
        },
        title: '源标题',
        reason: '源原因',
        adjustment: '源调整',
      }, locale);
      assert.ok(output.presentation.title, `${riskCode}/${locale} title`);
      assert.ok(output.presentation.reason, `${riskCode}/${locale} reason`);
      assert.ok(output.presentation.adjustment, `${riskCode}/${locale} adjustment`);
      assert.equal(output.presentation.translation_status, locale === 'zh' ? 'source' : 'translated');
      assert.equal(output.presentation.localization_error_code, undefined);
    }
  }
});

test('Fresh Check template placeholders stay identical across all eight locales', () => {
  const placeholders = value => [...String(value).matchAll(/\{([a-z0-9_]+)\}/gi)]
    .map(match => match[1])
    .sort();

  for (const [riskCode, localizedTemplates] of Object.entries(FRESH_CHECK_FINDING_TEMPLATES)) {
    assert.deepEqual(Object.keys(localizedTemplates), SUPPORTED_LOCALES, `${riskCode} locale coverage`);
    const sourceFields = localizedTemplates.zh;
    assert.equal(sourceFields.length, 3, `${riskCode}/zh field count`);
    for (const locale of SUPPORTED_LOCALES) {
      const fields = localizedTemplates[locale];
      assert.equal(fields.length, sourceFields.length, `${riskCode}/${locale} field count`);
      fields.forEach((field, index) => {
        assert.ok(String(field).trim(), `${riskCode}/${locale}/${index} is empty`);
        assert.deepEqual(
          placeholders(field),
          placeholders(sourceFields[index]),
          `${riskCode}/${locale}/${index} placeholder mismatch`,
        );
      });
    }
  }
});

test('daily nutrition guidance is professionally localized in all eight locales', () => {
  const chineseGuidance = 'AI营养建议基于犬类能量需求模型（RER/MER）、体重、年龄及活动水平综合计算，为日常喂养提供科学参考。建议根据体况评分（BCS）和实际变化持续调整。如存在疾病、特殊生理阶段或特殊营养需求，请咨询兽医。';
  const expected = {
    zh: ['RER/MER', 'BCS', '兽医'],
    en: ['RER/MER', 'BCS', 'veterinarian'],
    de: ['RER/MER', 'BCS', 'Tierarzt'],
    fr: ['RER/MER', 'BCS', 'vétérinaire'],
    es: ['RER/MER', 'BCS', 'veterinario'],
    it: ['RER/MER', 'BCS', 'veterinario'],
    ja: ['RER/MER', 'BCS', '獣医師'],
    ko: ['RER/MER', 'BCS', '수의사'],
  };
  for (const locale of SUPPORTED_LOCALES) {
    const output = localizeSemanticResult({
      daily_need: {
        note_code: 'DAILY_NEED_NOT_VETERINARY_PRESCRIPTION',
        note: chineseGuidance,
      },
      findings: [],
    }, locale);
    for (const term of expected[locale]) assert.match(output.daily_need.note, new RegExp(term));
    if (locale === 'zh') assert.equal(output.daily_need.note, chineseGuidance);
  }
});

test('validation details participate in translation status and unknown codes are explicit', () => {
  const known = {
    structure: {
      deductions: VALIDATION_DETAIL_CODES.map(code => ({ code, facts: {} })),
    },
  };
  assert.equal(validationDetailsTranslationStatus(known, 'en'), 'translated');

  const output = localizeSemanticResult({
    findings: [],
    score_details: {
      structure: { deductions: [{ code: 'FUTURE_STRUCTURE_RULE', facts: { actual_pct: 99 } }] },
    },
  }, 'en');
  assert.equal(output.translation_status, 'fallback');
  assert.equal(output.fallback_locale, 'zh');
  assert.equal(output.score_details.structure.deductions[0].translation_status, 'fallback');
  assert.equal(output.score_details.structure.deductions[0].localization_error_code, 'MISSING_VALIDATION_DETAIL_TEMPLATE');
});

test('Chinese Fresh Check findings preserve specific source conclusions instead of generic placeholders', () => {
  const findings = [
    {
      risk_code: 'LOW_ANIMAL_PROTEIN',
      level: 'warning',
      domain: 'structure',
      facts: { actual_pct: 0, minimum_pct: 35 },
      title: '动物蛋白比例过低',
      reason: '动物蛋白食材占配方0%，低于长期鲜食结构参考下限。',
      adjustment: '提高适配的动物蛋白食材占比。',
    },
    {
      risk_code: 'DAILY_ENERGY_LOW',
      level: 'warning',
      domain: 'energy',
      facts: { total_kcal: 200, min_kcal: 400 },
      title: '每日能量偏低',
      reason: '当前食谱约200 kcal，低于建议范围。',
      adjustment: '调整总量或能量密度后重新验证。',
    },
  ];
  const output = localizeSemanticResult({ findings }, 'zh');
  assert.deepEqual(output.findings.map(item => item.title), ['动物性食材占比较低', '每日能量偏低']);
  assert.doesNotMatch(JSON.stringify(output.findings), /营养检查结果|能量检查结果|请以本项的结构化数值为准/);
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

test('legacy AI nutrition fallback renders all product locales from stable codes and facts', () => {
  for (const locale of SUPPORTED_LOCALES) {
    const output = buildAiNutritionFallback({
      requestedLocale: locale,
      age: 9,
      weight: 20,
      averageWeight: 33,
      intake: { daily_grams: 400, meals_per_day: 2, per_meal_grams: 200 },
    });
    assert.equal(output.locale, locale);
    assert.deepEqual(output.key_nutrition_need_codes, ['AI_NEED_SENIOR_DIGESTION', 'AI_NEED_SENIOR_JOINT', 'AI_NEED_SENIOR_HEART']);
    assert.match(output.nutrition_analysis, /400/);
    assert.match(output.nutrition_analysis, /200/);
    assert.equal(output.caution_items[0].code, 'AI_UNDERWEIGHT_CAUTION');
    if (!['zh', 'ja'].includes(locale)) {
      const { life_stage, ...visible } = output;
      assert.doesNotMatch(JSON.stringify(visible), /[\u3400-\u9fff]/u);
    }
  }
});

test('legacy AI nutrition rejects a Chinese presentation for an English request', () => {
  assert.equal(aiNutritionPresentationIsValid({
    breed_intro: '中文介绍',
    key_nutrition_needs: ['高质量蛋白质'],
    nutrition_analysis: '中文建议',
    cautions: ['控制总热量'],
  }, 'en'), false);
  assert.equal(aiNutritionPresentationIsValid({
    breed_intro: 'Labrador profile',
    key_nutrition_needs: ['High-quality protein'],
    nutrition_analysis: 'Adjust using weight and BCS.',
    cautions: ['Control total calories.'],
  }, 'en'), true);
});

test('legacy AI nutrition cache is isolated by locale while old APK cache stays compatible', () => {
  const cache = {
    analysis: { nutrition_analysis: '中文旧缓存' },
    analysis_locale: 'zh',
    analyses_by_locale: {
      en: { nutrition_analysis: 'English cached analysis' },
    },
  };
  assert.equal(cachedAiNutritionAnalysis(cache, 'en').nutrition_analysis, 'English cached analysis');
  assert.equal(cachedAiNutritionAnalysis(cache, 'zh').nutrition_analysis, '中文旧缓存');
  assert.equal(cachedAiNutritionAnalysis({ analysis: cache.analysis }, 'en'), null);
});
