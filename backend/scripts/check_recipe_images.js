const fs = require('fs');
const path = require('path');
const { query, getPool } = require('../src/data/pg_client');
const { recipesDb, imgByRecipeId } = require('../src/data/recipes_db');

const builtInPublicDir = process.env.RECIPE_IMAGE_PUBLIC_DIR
  || path.resolve(__dirname, '../../frontend/public');
const backendPublicDir = process.env.RECIPE_UPLOAD_PUBLIC_DIR
  || path.resolve(__dirname, '../public');
const imageOrigin = process.env.RECIPE_IMAGE_ORIGIN || '';

async function checkRemoteImage(img) {
  const url = /^https?:\/\//i.test(img) ? new URL(img) : new URL(img, imageOrigin);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.startsWith('image/')) throw new Error(`unexpected content-type ${contentType || '(empty)'}`);
  await response.body?.cancel();
}

async function main() {
  const expected = new Map(Object.entries(imgByRecipeId));
  if (recipesDb.length !== 40 || expected.size !== 40) {
    throw new Error(`expected 40 canonical recipes and image mappings, found ${recipesDb.length}/${expected.size}`);
  }

  const result = await query(
    `SELECT id, img, status FROM recipes WHERE id = ANY($1::text[]) OR status = 'active' ORDER BY id`,
    [[...expected.keys()]],
  );
  const rowIds = new Set(result.rows.map(row => row.id));
  const missingExpected = [...expected.keys()].filter(id => !rowIds.has(id));
  if (missingExpected.length) {
    throw new Error(`database is missing expected recipes: ${missingExpected.join(', ')}`);
  }

  const failures = [];
  for (const row of result.rows) {
    if (!String(row.img || '').trim()) {
      failures.push(`${row.id}: recipe has no img`);
      continue;
    }

    try {
      if (imageOrigin || /^https?:\/\//i.test(row.img)) {
        await checkRemoteImage(row.img);
      } else {
        const publicDir = row.img.startsWith('/uploads/') ? backendPublicDir : builtInPublicDir;
        const localPath = path.join(publicDir, row.img.replace(/^\/+/, ''));
        if (!fs.statSync(localPath).isFile()) throw new Error('not a file');
      }
    } catch (error) {
      failures.push(`${row.id}: ${row.img} is not accessible (${error.message})`);
    }
  }

  if (failures.length) throw new Error(`recipe image check failed:\n${failures.join('\n')}`);
  console.log(`Recipe image check passed: ${result.rows.length} managed database paths, ${imageOrigin ? 'HTTP' : 'local files'} accessible.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPool()?.end();
  });
