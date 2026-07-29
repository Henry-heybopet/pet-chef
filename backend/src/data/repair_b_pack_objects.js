const { query, isAvailable, getPool } = require('./pg_client');
const { recipesDb } = require('./recipes_db');

const apply = process.argv.includes('--apply');

function canonicalBPackObject(description) {
  const body = String(description || '').replace(/^[^：]+：/, '');
  return Object.fromEntries(body.split(/\s+\/\s+/).map(part => {
    const match = part.trim().match(/^(.*?)(\d+(?:\.\d+)?)\s*$/);
    if (!match) throw new Error(`无法解析 B 包成分：${part}`);
    return [match[1].trim(), Number(match[2])];
  }));
}

function repairedBPack(recipe) {
  if (recipe.id === 'dog_recipe_001' || recipe.id === 'dog_recipe_002') {
    return {
      '成犬维矿预混料（含维生素、矿物质和铁铜锌锰碘硒等微量元素）': 5.7,
      '成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）': 3,
      'Omega-3鱼油或藻油（EPA+DHA必需脂肪酸来源）': 1.3,
    };
  }
  return canonicalBPackObject(recipe.b_pack);
}

async function run() {
  if (!(await isAvailable())) throw new Error('PostgreSQL unavailable');

  const ids = recipesDb.map(recipe => recipe.id);
  const current = await query(
    'SELECT id, nutrition_snapshot, updated_at FROM recipes WHERE status = $1 AND id = ANY($2::text[]) ORDER BY id',
    ['active', ids]
  );
  if (current.rows.length !== ids.length) {
    throw new Error(`Expected ${ids.length} active canonical recipes, found ${current.rows.length}`);
  }

  const repairs = recipesDb.map(recipe => ({
    id: recipe.id,
    b_pack: repairedBPack(recipe),
  }));
  const invalid = repairs.filter(({ b_pack }) => {
    const text = Object.keys(b_pack).join(' ');
    return Object.keys(b_pack).some(key => !key || /^P≈|^成犬$/.test(key))
      || !/维生素|维矿|预混/.test(text)
      || !/矿物|维矿|预混/.test(text)
      || !/钙/.test(text)
      || !/磷|Ca:P/i.test(text)
      || !/微量元素|维矿|预混/.test(text)
      || !/Omega-3|鱼油|藻油|DHA|EPA|脂肪酸/i.test(text)
      || Object.values(b_pack).some(value => !Number.isFinite(value) || value <= 0);
  });
  if (invalid.length) throw new Error(`Invalid repaired B packs: ${invalid.map(item => item.id).join(', ')}`);

  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    recipes: repairs.length,
    totals: repairs.reduce((acc, item) => {
      const total = Object.values(item.b_pack).reduce((sum, value) => sum + value, 0).toFixed(1);
      acc[total] = (acc[total] || 0) + 1;
      return acc;
    }, {}),
    preview: repairs.slice(0, 2),
  }, null, 2));
  if (!apply) return;

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    for (const item of repairs) {
      await client.query(
        `UPDATE recipes
         SET nutrition_snapshot = jsonb_set(COALESCE(nutrition_snapshot, '{}'::jsonb), '{b_pack}', $2::jsonb, true),
             updated_at = NOW()
         WHERE id = $1`,
        [item.id, JSON.stringify(item.b_pack)]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  console.log(`Updated ${repairs.length} B-pack objects.`);
}

run()
  .catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    const pool = getPool();
    if (pool) await pool.end();
  });
