const INGREDIENT_GROUPS = [
  { key: 'animal', label: '动物性原料' },
  { key: 'starch', label: '淀粉类碳水' },
  { key: 'produce', label: '非淀粉类果蔬' },
  { key: 'other', label: '其它' },
];

function normalizeName(value) {
  return String(value || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function nameContainsAlias(name, alias) {
  const normalizedName = normalizeName(name);
  const normalizedAlias = normalizeName(alias);
  if (!normalizedName || !normalizedAlias) return false;
  if (/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/u.test(normalizedAlias)) {
    return normalizedName.includes(normalizedAlias) || normalizedAlias.includes(normalizedName);
  }
  const pluralSuffix = /^[\p{L}\p{N}]+$/u.test(normalizedAlias) ? '(?:s|es)?' : '';
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(normalizedAlias)}${pluralSuffix}([^\\p{L}\\p{N}]|$)`, 'u').test(normalizedName);
}

function matchIngredientRecord(name, ingredientMap = {}) {
  const cleanName = normalizeName(name);
  const keys = Object.keys(ingredientMap);
  const exactKey = keys.find(candidate => normalizeName(candidate) === cleanName);
  if (exactKey) return { key: exactKey, record: ingredientMap[exactKey] };
  const key = keys
    .filter(candidate => nameContainsAlias(cleanName, candidate))
    .sort((a, b) => normalizeName(b).length - normalizeName(a).length)[0];
  return key ? { key, record: ingredientMap[key] } : null;
}

function ingredientGroup(category) {
  if (['protein', 'organ'].includes(category)) return 'animal';
  if (['carb', 'starch'].includes(category)) return 'starch';
  if (['veg', 'vegetable', 'fruit'].includes(category)) return 'produce';
  return 'other';
}

function analyzeRecipeIngredients(ingredients = {}, ingredientMap = {}) {
  const rows = Object.entries(ingredients).map(([name, amount]) => {
    const matched = matchIngredientRecord(name, ingredientMap);
    const calories = Number(matched?.record?.calories_per_100g ?? matched?.record?.kcal_per_100g);
    return {
      name,
      percent: Number(amount) || 0,
      category: matched?.record?.category || 'unknown',
      group: ingredientGroup(matched?.record?.category),
      calories_per_100g: Number.isFinite(calories) ? calories : null,
    };
  });

  const groups = INGREDIENT_GROUPS.map(group => ({
    ...group,
    rows: rows
      .filter(row => row.group === group.key)
      .sort((a, b) => b.percent - a.percent || a.name.localeCompare(b.name, 'zh-CN')),
  }));

  const totalGrams = rows.reduce((sum, row) => sum + row.percent, 0);
  const knownRows = rows.filter(row => row.calories_per_100g !== null);
  const knownGrams = knownRows.reduce((sum, row) => sum + row.percent, 0);
  const totalKcal = knownRows.reduce(
    (sum, row) => sum + Math.round(row.percent * row.calories_per_100g / 100),
    0
  );
  const complete = totalGrams > 0 && Math.abs(knownGrams - totalGrams) < 0.01;

  return {
    groups,
    energy: {
      calories_per_100g: complete ? Number((totalKcal / totalGrams * 100).toFixed(1)) : null,
      kcal_per_gram: complete ? Number((totalKcal / totalGrams).toFixed(2)) : null,
      total_kcal: totalKcal,
      total_weight_g: totalGrams,
      coverage_weight_pct: totalGrams ? Number((knownGrams / totalGrams * 100).toFixed(1)) : 0,
      unknown_ingredients: rows.filter(row => row.calories_per_100g === null).map(row => row.name),
      complete,
    },
  };
}

module.exports = {
  INGREDIENT_GROUPS,
  analyzeRecipeIngredients,
  ingredientGroup,
  matchIngredientRecord,
  _test: { normalizeName, nameContainsAlias },
};
