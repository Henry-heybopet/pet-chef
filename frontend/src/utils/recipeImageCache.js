import { resolveRecipeImageUrl } from './recipeImage.js';
import { cacheImageUrl, pruneImageCache, RECIPE_IMAGE_CACHE } from './persistentImageCache.js';

export function collectRecipeImageUrls(recipes, apiBase) {
  return [...new Set((recipes || [])
    .map(recipe => resolveRecipeImageUrl(recipe?.img, apiBase))
    .filter(Boolean))];
}

export async function prefetchRecipeImages(recipes, options = {}) {
  const urls = collectRecipeImageUrls(recipes, options.apiBase);
  const concurrency = Math.max(1, Math.min(4, Number(options.concurrency) || 2));
  const shouldContinue = options.shouldContinue || (() => true);
  const loader = options.loader || (url => cacheImageUrl(url, {
    cacheName: RECIPE_IMAGE_CACHE,
    timeoutMs: options.timeoutMs || 30000,
  }));
  let cursor = 0;
  let loaded = 0;
  let failed = 0;

  async function worker() {
    while (shouldContinue() && cursor < urls.length) {
      const url = urls[cursor++];
      if (await loader(url)) loaded += 1;
      else failed += 1;
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, worker));
  if (shouldContinue() && !options.loader) {
    await pruneImageCache(RECIPE_IMAGE_CACHE, urls);
  }
  return { total: urls.length, loaded, failed, cancelled: !shouldContinue() };
}
