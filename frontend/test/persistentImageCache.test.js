import assert from 'node:assert/strict';
import test from 'node:test';
import { cacheImageUrl, pruneImageCache } from '../src/utils/persistentImageCache.js';

function createCacheStorage() {
  const entries = new Map();
  const cache = {
    match: async key => entries.get(String(key))?.clone(),
    put: async (key, response) => entries.set(String(key), response.clone()),
    keys: async () => [...entries.keys()].map(url => ({ url })),
    delete: async key => entries.delete(typeof key === 'string' ? key : key.url),
  };
  return { entries, open: async () => cache };
}

test('stores an image once and reuses the persistent entry', async () => {
  const cacheStorage = createCacheStorage();
  let requests = 0;
  const fetchImpl = async () => {
    requests += 1;
    return new Response('image-bytes', { status: 200, headers: { 'content-type': 'image/png' } });
  };
  const url = 'https://petchef.heybopet.cn/uploads/recipe-catalog/a.png';

  assert.equal(await cacheImageUrl(url, { cacheStorage, fetchImpl }), true);
  assert.equal(await cacheImageUrl(url, { cacheStorage, fetchImpl }), true);
  assert.equal(requests, 1);
  assert.equal(cacheStorage.entries.has(url), true);
});

test('prunes only stale versioned image URLs', async () => {
  const cacheStorage = createCacheStorage();
  const keep = 'https://petchef.heybopet.cn/uploads/recipe-catalog/a-v2.png';
  const stale = 'https://petchef.heybopet.cn/uploads/recipe-catalog/a-v1.png';
  const fetchImpl = async () => new Response('image', { status: 200 });
  await cacheImageUrl(keep, { cacheStorage, fetchImpl, cacheName: 'recipes' });
  await cacheImageUrl(stale, { cacheStorage, fetchImpl, cacheName: 'recipes' });

  assert.equal(await pruneImageCache('recipes', [keep], cacheStorage), 1);
  assert.deepEqual([...cacheStorage.entries.keys()], [keep]);
});
