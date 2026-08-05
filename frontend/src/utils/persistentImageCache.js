export const RECIPE_IMAGE_CACHE = 'petchef-recipe-images-v1';
export const PET_AVATAR_CACHE = 'petchef-pet-avatars-v1';

function isCacheableUrl(url) {
  return Boolean(url) && !String(url).startsWith('data:') && !String(url).startsWith('blob:');
}

function cacheApi(cacheStorage = globalThis.caches) {
  return cacheStorage && typeof cacheStorage.open === 'function' ? cacheStorage : null;
}

function normalizedUrl(url) {
  try {
    return new URL(url, globalThis.location?.href || 'http://localhost/').href;
  } catch {
    return String(url || '');
  }
}

export async function cacheImageUrl(url, options = {}) {
  if (!isCacheableUrl(url)) return true;
  const storage = cacheApi(options.cacheStorage);
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  if (!storage || typeof fetchImpl !== 'function') return false;

  const cache = await storage.open(options.cacheName || RECIPE_IMAGE_CACHE);
  if (await cache.match(url)) return true;

  const controller = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = controller
    ? globalThis.setTimeout(() => controller.abort(), options.timeoutMs || 30000)
    : null;
  try {
    const response = await fetchImpl(url, {
      cache: 'no-store',
      credentials: 'omit',
      signal: controller?.signal,
    });
    if (!response?.ok) return false;
    await cache.put(url, response.clone());
    return true;
  } catch {
    return false;
  } finally {
    if (timer) globalThis.clearTimeout(timer);
  }
}

export async function resolveCachedImageSource(url, options = {}) {
  if (!isCacheableUrl(url)) return { src: url || '', objectUrl: false };
  const storage = cacheApi(options.cacheStorage);
  if (!storage) return { src: url, objectUrl: false };

  const cacheName = options.cacheName || RECIPE_IMAGE_CACHE;
  const cache = await storage.open(cacheName);
  let response = await cache.match(url);
  if (!response) {
    const stored = await cacheImageUrl(url, { ...options, cacheName });
    if (stored) response = await cache.match(url);
  }
  if (!response || typeof globalThis.URL?.createObjectURL !== 'function') {
    return { src: url, objectUrl: false };
  }
  const blob = await response.blob();
  return { src: globalThis.URL.createObjectURL(blob), objectUrl: true };
}

export async function pruneImageCache(cacheName, allowedUrls, cacheStorage = globalThis.caches) {
  const storage = cacheApi(cacheStorage);
  if (!storage) return 0;
  const cache = await storage.open(cacheName);
  const allowed = new Set((allowedUrls || []).filter(isCacheableUrl).map(normalizedUrl));
  const requests = await cache.keys();
  const stale = requests.filter(request => !allowed.has(normalizedUrl(request.url)));
  await Promise.all(stale.map(request => cache.delete(request)));
  return stale.length;
}
