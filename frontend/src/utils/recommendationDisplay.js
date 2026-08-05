export function splitTopItems(items = [], count = 3, maxItems = 10) {
  const limited = items.slice(0, maxItems);
  return {
    primary: limited.slice(0, count),
    folded: limited.slice(count),
  };
}

export function filterRankedRecipes(recipes = [], rankedIds = []) {
  if (!rankedIds.length) return recipes;
  const rankedSet = new Set(rankedIds);
  return recipes.filter(recipe => rankedSet.has(recipe.id));
}

export function recommendationTier(score) {
  const value = Number(score);
  if (value >= 85) return 'high';
  if (value >= 70) return 'medium';
  return 'low';
}
