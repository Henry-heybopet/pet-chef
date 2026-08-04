const { query, isAvailable } = require('../data/pg_client');
const { normalizeLocale } = require('./localization');

const HAN_RE = /[\u3400-\u9fff]/;
const NONE_LABELS = { en: 'None', de: 'Keine', fr: 'Aucun', es: 'Ninguno', it: 'Nessuno', ja: 'なし', ko: '없음' };

function isLocalizedText(value, locale) {
  const text = String(value || '');
  if (!text) return false;
  if (locale === 'ja') return true;
  return !HAN_RE.test(text);
}

function packCanonicalName(value) {
  return String(value || '').split(/[：:（(]/)[0].trim();
}

function sourcePresentation(recipe, locale = 'zh') {
  return {
    locale,
    name: recipe.name,
    ingredients: Object.fromEntries(Object.keys(recipe.ingredients || {}).map(name => [name, { name }])),
    ingredient_benefits: {},
    b_pack: recipe.b_pack || '无',
    translation_status: locale === 'zh' ? 'source' : 'fallback',
    fallback_locale: locale === 'zh' ? null : 'zh',
  };
}

async function attachCatalogPresentations(recipes, requestedLocale) {
  const locale = normalizeLocale(requestedLocale);
  if (locale === 'zh' || !recipes?.length) {
    return (recipes || []).map(recipe => ({ ...recipe, presentation: sourcePresentation(recipe, locale) }));
  }

  if (!(await isAvailable())) {
    return recipes.map(recipe => ({ ...recipe, presentation: sourcePresentation(recipe, locale) }));
  }

  try {
    const recipeIds = recipes.map(recipe => recipe.id);
    const [recipeRows, ingredientRows, packRows] = await Promise.all([
      query('SELECT recipe_id, name, description, translation_status FROM recipe_translations WHERE locale = $1 AND recipe_id = ANY($2::text[])', [locale, recipeIds]),
      query(`SELECT i.name AS canonical_name, t.name, t.benefits, t.translation_status
             FROM ingredient_translations t
             JOIN ingredient_library i ON i.id = t.ingredient_id
             WHERE t.locale = $1`, [locale]),
      query('SELECT canonical_name, name, description, translation_status FROM pack_translations WHERE locale = $1', [locale]),
    ]);

    const recipeMap = new Map(recipeRows.rows.map(row => [row.recipe_id, row]));
    const ingredientMap = new Map(ingredientRows.rows.map(row => [row.canonical_name, row]));
    const packMap = new Map(packRows.rows.map(row => [row.canonical_name, row]));

    return recipes.map(recipe => {
      const translatedRecipe = recipeMap.get(recipe.id);
      let complete = Boolean(translatedRecipe?.translation_status === 'translated' && isLocalizedText(translatedRecipe.name, locale));
      const ingredients = {};
      const ingredientBenefits = {};

      for (const canonicalName of Object.keys(recipe.ingredients || {})) {
        const translated = ingredientMap.get(canonicalName);
        const translatedName = translated?.name || canonicalName;
        ingredients[canonicalName] = { name: translatedName };
        if (translated?.benefits) ingredientBenefits[canonicalName] = translated.benefits;
        if (translated?.translation_status !== 'translated' || !isLocalizedText(translatedName, locale)) complete = false;
      }

      const localizePack = value => {
        if (!value || value === '无') return NONE_LABELS[locale] || value;
        const translated = packMap.get(packCanonicalName(value));
        if (translated?.translation_status !== 'translated' || !isLocalizedText(translated.name, locale)) complete = false;
        return translated ? `${translated.name}${translated.description ? `: ${translated.description}` : ''}` : value;
      };

      return {
        ...recipe,
        presentation: {
          locale,
          name: translatedRecipe?.name || recipe.name,
          description: translatedRecipe?.description || null,
          ingredients,
          ingredient_benefits: ingredientBenefits,
          b_pack: localizePack(recipe.b_pack),
          translation_status: complete ? 'translated' : 'fallback',
          fallback_locale: complete ? null : 'zh',
        },
      };
    });
  } catch (error) {
    console.warn('[CatalogLocalization] translation tables unavailable, returning canonical presentation:', error.message);
    return recipes.map(recipe => ({ ...recipe, presentation: sourcePresentation(recipe, locale) }));
  }
}

module.exports = { attachCatalogPresentations };
