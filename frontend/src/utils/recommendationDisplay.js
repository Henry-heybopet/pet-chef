export function splitTopItems(items = [], count = 3) {
  return {
    primary: items.slice(0, count),
    folded: items.slice(count),
  };
}

export function recommendationTier(score) {
  const value = Number(score);
  if (value >= 85) return 'high';
  if (value >= 70) return 'medium';
  return 'low';
}
