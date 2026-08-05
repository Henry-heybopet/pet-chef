const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.VERCEL = '1';
process.env.NODE_ENV = 'test';
const uploadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'petchef-nutrition-pack-route-'));
process.env.PETCHEF_UPLOADS_DIR = uploadDir;

const app = require('../src/index');
const { getPool } = require('../src/data/pg_client');

test('authenticated admin catalog routes always return JSON', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  t.after(async () => {
    server.closeAllConnections?.();
    await new Promise(resolve => server.close(resolve));
    await getPool()?.end();
  });
  t.after(() => fs.rmSync(uploadDir, { recursive: true, force: true }));
  await new Promise(resolve => server.once('listening', resolve));
  const { port } = server.address();
  const origin = `http://127.0.0.1:${port}`;

  const consumerResponse = await fetch(`${origin}/api/v1/nutrition-packs?locale=en`);
  assert.equal(consumerResponse.status, 200);
  assert.match(consumerResponse.headers.get('content-type') || '', /^application\/json/);
  const consumerBody = await consumerResponse.json();
  assert.equal(consumerBody.success, true);
  assert.equal(consumerBody.packs.length, 9);
  assert.equal(new Set(consumerBody.packs.map(pack => pack.pack_id)).size, 9);
  assert.ok(consumerBody.packs.every(pack => !Object.hasOwn(pack, 'composition')));
  assert.equal(
    consumerBody.packs.find(pack => pack.pack_id === 'dog_pack_003')?.name,
    'Adult Dog General Complete Nutrition Pack'
  );

  const login = await fetch(`${origin}/api/v1/admin/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: 'Heybopetadmin', password: 'dev-only-admin-password' }),
  });
  const loginBody = await login.json();
  assert.equal(login.status, 200);
  assert.ok(loginBody.token);

  const response = await fetch(`${origin}/api/v1/admin/nutrition-packs`, {
    headers: { authorization: `Bearer ${loginBody.token}` },
  });
  assert.match(response.headers.get('content-type') || '', /^application\/json/);
  const body = await response.json();
  assert.equal(typeof body.success, 'boolean');
  assert.notEqual(response.status, 404);

  const deleteResponse = await fetch(`${origin}/api/v1/admin/recipes/nonexistent-recipe`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${loginBody.token}` },
  });
  assert.match(deleteResponse.headers.get('content-type') || '', /^application\/json/);
  const deleteBody = await deleteResponse.json();
  assert.equal(typeof deleteBody.success, 'boolean');
  assert.ok([404, 503].includes(deleteResponse.status));
  if (deleteResponse.status === 404) assert.equal(deleteBody.error, 'Recipe not found');
});
