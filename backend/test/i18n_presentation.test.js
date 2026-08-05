const assert = require('node:assert/strict');
const test = require('node:test');
const { localizeComparison } = require('../src/services/comparison_localization');
const { _test: catalogLocalization } = require('../src/services/catalog_localization');
const { aiNutritionPresentationIsValid } = require('../src/services/localization');

const foreignLocales = ['en', 'de', 'fr', 'es', 'it', 'ja', 'ko'];
const han = /[\u3400-\u9fff]/;

function assertTargetScript(text, locale) {
  assert.ok(text, `${locale} presentation must not be empty`);
  if (locale !== 'ja') assert.doesNotMatch(text, han, `${locale} presentation contains unexpected Han text: ${text}`);
}

test('legacy recipe pack labels resolve to the canonical translated pack catalog', () => {
  assert.equal(
    catalogLocalization.packCanonicalName('幼犬成长营养包B：幼犬维矿预混料 1.6'),
    '幼犬通用全价营养包',
  );
  assert.equal(
    catalogLocalization.packCanonicalName('成犬维护营养包B：成犬维矿预混料 1.7'),
    '成年犬通用全价营养包',
  );
  assert.equal(
    catalogLocalization.packCanonicalName('老年犬轻负担营养包B：老年犬维矿预混料 1.9'),
    '老年犬通用全价营养包',
  );
});

test('all catalog recipes, ingredient benefits, and packs have seven foreign presentations', async () => {
  const { recipesDb } = require('../src/data/recipes_db');
  const { hasBenefitTranslation, hasDataTranslation, tBenefit, tData, tPack, translatedRecipePresentation } = await import('../../frontend/src/i18n/dataTranslations.js');

  assert.equal(translatedRecipePresentation({ presentation: { name: '中文回退', translation_status: 'fallback' } }, 'en'), null);
  assert.equal(translatedRecipePresentation({ presentation: { name: 'Localized', translation_status: 'translated' } }, 'en').name, 'Localized');

  for (const locale of foreignLocales) {
    for (const recipe of recipesDb) {
      assert.equal(hasDataTranslation(recipe.name, locale), true, `missing ${locale} recipe translation: ${recipe.name}`);
      assertTargetScript(tData(recipe.name, locale), locale);
      for (const [ingredient, benefit] of Object.entries(recipe.ingredient_benefits || {})) {
        assert.equal(hasDataTranslation(ingredient, locale), true, `missing ${locale} ingredient translation: ${ingredient}`);
        assert.equal(hasBenefitTranslation(ingredient, locale), true, `missing ${locale} benefit translation: ${ingredient}`);
        assertTargetScript(tData(ingredient, locale), locale);
        assertTargetScript(tBenefit(ingredient, benefit, locale), locale);
      }
      for (const pack of [recipe.b_pack]) {
        if (pack && pack !== '无') assertTargetScript(tPack(pack, locale), locale);
      }
    }
  }
});

test('semantic comparison renders independently for every supported locale', () => {
  const semantic = {
    has_warning: true,
    warning_level: 'warning',
    show_dialog: true,
    detail_code: 'FISH_ANTIOXIDANT',
    warning_items: [{ code: 'ALLERGEN', facts: { allergen: 'oats' } }],
    facts: { current_score: 90, proposed_score: 95 },
  };

  for (const locale of foreignLocales) {
    const rendered = localizeComparison(semantic, locale);
    assert.equal(rendered.locale, locale);
    assert.equal(rendered.translation_status, 'translated');
    assertTargetScript(rendered.warning_text, locale);
    assertTargetScript(rendered.a_comparison.comparison_details, locale);
    assertTargetScript(rendered.a_comparison.score_reason, locale);
    if (locale === 'ja') {
      assert.match(rendered.warning_text, /[\u3040-\u30ff]/);
      assert.match(rendered.a_comparison.comparison_details, /[\u3040-\u30ff]/);
      assert.match(rendered.a_comparison.score_reason, /[\u3040-\u30ff]/);
    }
    assert.equal(rendered.a_comparison.current_score, 90);
    assert.equal(rendered.a_comparison.proposed_score, 95);
  }
});

test('Japanese AI presentation rejects Chinese-only text', () => {
  assert.equal(aiNutritionPresentationIsValid({ nutrition_analysis: '这是一段中文营养说明。' }, 'ja'), false);
  assert.equal(aiNutritionPresentationIsValid({ nutrition_analysis: 'これは日本語の栄養説明です。' }, 'ja'), true);
  assert.equal(aiNutritionPresentationIsValid({
    summary: 'これは日本語の栄養説明です。',
    ranked_recipes: [{ reason: '高动物蛋白，营养全面，长期可行' }],
  }, 'ja'), false);
  assert.equal(aiNutritionPresentationIsValid({
    summary: 'This is an English nutrition summary.',
    factors_used: ['体重与BCS'],
  }, 'en'), false);
});
