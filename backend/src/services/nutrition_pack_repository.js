const { query, isAvailable, getPool } = require('../data/pg_client');
const { NUTRITION_PACKS_DB } = require('../data/nutrition_packs_db');
const { NUTRITION_PACK_TRANSLATIONS } = require('../data/nutrition_pack_translations_db');

const JSON_FIELDS = new Set(['composition', 'nutrition_snapshot', 'health_tags']);
const NUTRIENT_FIELDS = ['calcium_pct', 'phosphorus_pct', 'chloride_pct', 'lysine_pct'];

function parseJson(value, fallback = {}) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizePack(row) {
  const nutrition = parseJson(row.nutrition_snapshot, {});
  return {
    ...row,
    pack_id: row.id,
    composition: parseJson(row.composition, {}),
    health_tags: parseJson(row.health_tags, []),
    nutrition_snapshot: nutrition,
    ...Object.fromEntries(NUTRIENT_FIELDS.map(key => [key, nutrition[key] ?? null])),
  };
}

function nextPackId(rows, minimum = NUTRITION_PACKS_DB.length) {
  const maxId = rows.reduce((max, row) => {
    const match = String(row.id || '').match(/^dog_pack_(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, minimum);
  return `dog_pack_${String(maxId + 1).padStart(3, '0')}`;
}

function validateComposition(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return '全价营养配比必须是“成分名称: 数值”的对象';
  }
  const entries = Object.entries(value);
  if (!entries.length) return '启用前必须填写全价营养配比';
  if (entries.some(([name, amount]) => !String(name).trim() || !Number.isFinite(Number(amount)) || Number(amount) <= 0)) {
    return '每项配比必须包含成分名称和大于0的数值';
  }
  const text = entries.map(([name]) => name).join(' ');
  const missing = [
    [/维生素|维矿|预混/, '维生素'],
    [/矿物|维矿|预混/, '矿物质'],
    [/钙/, '钙'],
    [/磷|ca\s*:\s*p/i, '磷'],
    [/微量元素|维矿|预混|铁|铜|锌|锰|碘|硒/, '微量元素'],
    [/omega[-\s]?3|鱼油|藻油|dha|epa|脂肪酸/i, '必需脂肪酸'],
  ].filter(([pattern]) => !pattern.test(text)).map(([, label]) => label);
  return missing.length ? `配比缺少明确来源：${missing.join('、')}` : '';
}

async function nutritionPacksTableExists() {
  if (!(await isAvailable())) return false;
  const result = await query(`SELECT to_regclass('public.nutrition_packs') AS table_name`, []);
  return Boolean(result.rows[0]?.table_name);
}

async function syncNutritionPackTranslations(client) {
  for (const row of NUTRITION_PACK_TRANSLATIONS) {
    await client.query(
      `INSERT INTO pack_translations
        (pack_id, locale, canonical_name, name, description, translation_status, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       ON CONFLICT (pack_id, locale) DO UPDATE SET
         canonical_name = EXCLUDED.canonical_name,
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         translation_status = EXCLUDED.translation_status,
         updated_at = NOW()`,
      [row.pack_id, row.locale, row.canonical_name, row.name, row.description, row.translation_status]
    );
  }
  await client.query(
    'DELETE FROM pack_translations WHERE pack_id IS NULL OR NOT (pack_id = ANY($1::text[]))',
    [[...new Set(NUTRITION_PACK_TRANSLATIONS.map(row => row.pack_id))]]
  );
}

async function listNutritionPacks({ fallback = true } = {}) {
  try {
    if (await nutritionPacksTableExists()) {
      const result = await query('SELECT * FROM nutrition_packs ORDER BY pack_group, created_at, id', []);
      return { packs: result.rows.map(normalizePack), source: 'pg' };
    }
  } catch (error) {
    console.warn('[NutritionPackRepo] nutrition_packs unavailable:', error.message);
  }
  if (!fallback) {
    const error = new Error('nutrition_packs table unavailable');
    error.code = 'DB_UNAVAILABLE';
    throw error;
  }
  return {
    packs: NUTRITION_PACKS_DB.map(pack => normalizePack({ ...pack, composition: {}, nutrition_snapshot: {} })),
    source: 'json_fallback',
  };
}

function mostFrequentRecipeSnapshot(rows) {
  if (!rows.length) return { composition: {}, nutrition_snapshot: {}, data_conflict: false };
  const counts = new Map();
  for (const row of rows) {
    const nutrition = parseJson(row.nutrition_snapshot, {});
    const composition = parseJson(nutrition.b_pack, {});
    const key = JSON.stringify(composition, Object.keys(composition).sort());
    const current = counts.get(key) || { count: 0, composition, nutrition };
    current.count += 1;
    counts.set(key, current);
  }
  const selected = [...counts.values()].sort((a, b) => b.count - a.count)[0];
  return {
    composition: selected?.composition || {},
    nutrition_snapshot: Object.fromEntries(NUTRIENT_FIELDS.map(key => [key, selected?.nutrition?.[key] ?? null])),
    data_conflict: counts.size > 1,
  };
}

async function syncNutritionPackSeeds() {
  if (!(await nutritionPacksTableExists())) {
    const error = new Error('nutrition_packs table unavailable');
    error.code = 'DB_UNAVAILABLE';
    throw error;
  }
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const seed of NUTRITION_PACKS_DB) {
      const existing = await client.query(
        'SELECT id FROM nutrition_packs WHERE category_code = $1',
        [seed.category_code]
      );
      const oldId = existing.rows[0]?.id;
      if (oldId && oldId !== seed.id) {
        const conflict = await client.query(
          'SELECT id FROM nutrition_packs WHERE id = $1 AND category_code <> $2',
          [seed.id, seed.category_code]
        );
        if (conflict.rowCount) throw new Error(`营养包编号 ${seed.id} 已被其它分类占用`);
        await client.query(
          `UPDATE recipes
           SET nutrition_snapshot = jsonb_set(
                 COALESCE(nutrition_snapshot, '{}'::jsonb),
                 '{pack_id}',
                 to_jsonb($2::text),
                 true
               ),
               updated_at = NOW()
           WHERE nutrition_snapshot->>'pack_id' = $1
          `,
          [oldId, seed.id]
        );
        await client.query('UPDATE nutrition_packs SET id = $1, updated_at = NOW() WHERE id = $2', [seed.id, oldId]);
      }
      let initial = { composition: {}, nutrition_snapshot: {}, data_conflict: false };
      if (seed.recipe_category) {
        const rows = await client.query(
          'SELECT nutrition_snapshot FROM recipes WHERE category = $1 ORDER BY id',
          [seed.recipe_category]
        );
        initial = mostFrequentRecipeSnapshot(rows.rows);
      }
      if (!Object.keys(initial.composition).length && seed.composition) {
        initial.composition = seed.composition;
      }
      if (seed.status === 'active') {
        const compositionError = validateComposition(initial.composition);
        if (compositionError) throw new Error(`${seed.name}: ${compositionError}`);
      }
      const nutritionSnapshot = {
        ...initial.nutrition_snapshot,
        source_recipe_category: seed.recipe_category,
        source_data_conflict: initial.data_conflict,
      };
      const upserted = await client.query(
        `INSERT INTO nutrition_packs
          (id, name, pack_group, category_code, recipe_category, life_stage, description,
           health_tags, product_pricing, img, composition, nutrition_snapshot, status, version, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,NULL,'',$9::jsonb,$10::jsonb,$11::"RecipeStatus",1,NOW(),NOW())
         ON CONFLICT (category_code) DO UPDATE SET
           name = EXCLUDED.name,
           pack_group = EXCLUDED.pack_group,
           recipe_category = EXCLUDED.recipe_category,
           life_stage = EXCLUDED.life_stage,
           description = COALESCE(nutrition_packs.description, EXCLUDED.description),
           health_tags = CASE WHEN nutrition_packs.health_tags = '[]'::jsonb THEN EXCLUDED.health_tags ELSE nutrition_packs.health_tags END,
           composition = CASE WHEN nutrition_packs.composition = '{}'::jsonb THEN EXCLUDED.composition ELSE nutrition_packs.composition END,
           updated_at = NOW()
         RETURNING composition, nutrition_snapshot`,
        [seed.id, seed.name, seed.pack_group, seed.category_code, seed.recipe_category,
          seed.life_stage, seed.description, JSON.stringify(seed.health_tags || []),
          JSON.stringify(initial.composition), JSON.stringify(nutritionSnapshot), seed.status]
      );
      const persistedComposition = parseJson(upserted.rows[0]?.composition, initial.composition);
      const persistedNutrition = parseJson(upserted.rows[0]?.nutrition_snapshot, nutritionSnapshot);
      if (seed.recipe_category) {
        const compatibilityNutrition = Object.fromEntries(
          NUTRIENT_FIELDS.map(key => [key, persistedNutrition[key] ?? null])
        );
        await client.query(
          `UPDATE recipes
           SET nutrition_snapshot = COALESCE(nutrition_snapshot, '{}'::jsonb)
             || $4::jsonb
             || jsonb_build_object('b_pack', $2::jsonb, 'pack_id', $3::text),
             updated_at = NOW()
           WHERE category = $1`,
          [seed.recipe_category, JSON.stringify(persistedComposition), seed.id, JSON.stringify(compatibilityNutrition)]
        );
      }
    }
    await syncNutritionPackTranslations(client);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  return listNutritionPacks({ fallback: false });
}

async function getNutritionPack(id) {
  if (!(await nutritionPacksTableExists())) return null;
  const result = await query('SELECT * FROM nutrition_packs WHERE id = $1', [id]);
  return result.rows[0] ? normalizePack(result.rows[0]) : null;
}

function validatePackClassification(packGroup, lifeStage) {
  if (!['base', 'functional'].includes(packGroup)) return '营养包分类不合法';
  if (!['幼犬', '成年犬', '老年犬'].includes(lifeStage)) return '生命阶段不合法';
  return '';
}

async function createNutritionPack(patch = {}) {
  if (!(await nutritionPacksTableExists())) {
    const error = new Error('nutrition_packs table unavailable');
    error.code = 'DB_UNAVAILABLE';
    throw error;
  }
  const suffix = Date.now();
  const packGroup = patch.pack_group || 'base';
  const lifeStage = patch.life_stage || '成年犬';
  const classificationError = validatePackClassification(packGroup, lifeStage);
  if (classificationError) {
    const error = new Error(classificationError);
    error.code = 'INVALID_NUTRITION_PACK';
    throw error;
  }
  const composition = patch.composition || {};
  const status = patch.status || 'draft';
  if (status === 'active') {
    const validationError = validateComposition(composition);
    if (validationError) {
      const error = new Error(validationError);
      error.code = 'INVALID_NUTRITION_PACK';
      throw error;
    }
  }
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('pack_id'))");
    const idRows = await client.query("SELECT id FROM nutrition_packs WHERE id LIKE 'dog_pack_%'");
    const id = String(patch.pack_id || patch.id || nextPackId(idRows.rows));
    if (!/^dog_pack_\d{3,}$/.test(id)) {
      const error = new Error('pack_id 必须使用 dog_pack_001 格式');
      error.code = 'INVALID_NUTRITION_PACK';
      throw error;
    }
    const categoryCode = String(patch.category_code || `custom_${suffix}`);
    const result = await client.query(
      `INSERT INTO nutrition_packs
        (id, name, pack_group, category_code, recipe_category, life_stage, description,
         health_tags, product_pricing, img, composition, nutrition_snapshot, status, version, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11::jsonb,$12::jsonb,$13::"RecipeStatus",$14,NOW(),NOW())
       RETURNING *`,
      [id, patch.name || '新全价营养包', packGroup, categoryCode, patch.recipe_category || null,
        lifeStage, patch.description || '', JSON.stringify(patch.health_tags || []), patch.product_pricing || null,
        patch.img || '', JSON.stringify(composition), JSON.stringify(patch.nutrition_snapshot || {}), status,
        Number(patch.version) || 1]
    );
    await client.query('COMMIT');
    return normalizePack(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function updateNutritionPack(id, patch = {}) {
  if (!(await nutritionPacksTableExists())) {
    const error = new Error('nutrition_packs table unavailable');
    error.code = 'DB_UNAVAILABLE';
    throw error;
  }
  const current = await getNutritionPack(id);
  if (!current) return null;

  const composition = patch.composition === undefined ? current.composition : patch.composition;
  const status = patch.status === undefined ? current.status : patch.status;
  const packGroup = patch.pack_group === undefined ? current.pack_group : patch.pack_group;
  const lifeStage = patch.life_stage === undefined ? current.life_stage : patch.life_stage;
  const classificationError = validatePackClassification(packGroup, lifeStage);
  if (classificationError) {
    const error = new Error(classificationError);
    error.code = 'INVALID_NUTRITION_PACK';
    throw error;
  }
  if (status === 'active') {
    const validationError = validateComposition(composition);
    if (validationError) {
      const error = new Error(validationError);
      error.code = 'INVALID_NUTRITION_PACK';
      throw error;
    }
  }

  const nutritionSnapshot = {
    ...current.nutrition_snapshot,
    ...(patch.nutrition_snapshot || {}),
    ...Object.fromEntries(NUTRIENT_FIELDS
      .filter(key => patch[key] !== undefined)
      .map(key => [key, patch[key] === '' || patch[key] === null ? null : Number(patch[key])])),
  };
  const allowed = ['name', 'pack_group', 'life_stage', 'description', 'health_tags', 'product_pricing', 'img', 'composition', 'status', 'version'];
  const values = { ...patch, composition, nutrition_snapshot: nutritionSnapshot };
  const entries = Object.entries(values).filter(([key, value]) => [...allowed, 'nutrition_snapshot'].includes(key) && value !== undefined);
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const params = [id];
    const assignments = entries.map(([key, value], index) => {
      params.push(JSON_FIELDS.has(key) ? JSON.stringify(value) : value);
      return `${key} = $${index + 2}${JSON_FIELDS.has(key) ? '::jsonb' : ''}`;
    });
    const result = await client.query(
      `UPDATE nutrition_packs SET ${assignments.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      params
    );
    if (current.recipe_category) {
      const compatibilityNutrition = Object.fromEntries(
        NUTRIENT_FIELDS.map(key => [key, nutritionSnapshot[key] ?? null])
      );
      await client.query(
        `UPDATE recipes
         SET nutrition_snapshot = COALESCE(nutrition_snapshot, '{}'::jsonb)
           || $4::jsonb
           || jsonb_build_object('b_pack', $2::jsonb, 'pack_id', $3::text),
           updated_at = NOW()
         WHERE category = $1`,
        [current.recipe_category, JSON.stringify(composition), id, JSON.stringify(compatibilityNutrition)]
      );
    }
    await client.query('COMMIT');
    return normalizePack(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function deleteNutritionPack(id) {
  if (!(await nutritionPacksTableExists())) {
    const error = new Error('nutrition_packs table unavailable');
    error.code = 'DB_UNAVAILABLE';
    throw error;
  }
  const current = await getNutritionPack(id);
  if (!current) return null;

  const references = await query(
    `SELECT COUNT(*)::int AS count
     FROM recipes
     WHERE nutrition_snapshot->>'pack_id' = $1`,
    [id]
  );
  if (Number(references.rows[0]?.count) > 0) {
    const error = new Error('该全价营养包已被食谱引用，不能删除');
    error.code = 'NUTRITION_PACK_IN_USE';
    throw error;
  }

  const result = await query('DELETE FROM nutrition_packs WHERE id = $1 RETURNING id, name', [id]);
  return result.rows[0] || null;
}

function packDescription(pack) {
  const rows = Object.entries(pack.composition || {}).map(([name, value]) => `${name} ${value}`).join(' / ');
  return rows ? `${pack.name}：${rows}` : '';
}

async function listBPackOptionsFromNutritionPacks() {
  const { packs, source } = await listNutritionPacks({ fallback: false });
  return {
    source: source === 'pg' ? 'nutrition_packs' : source,
    options: packs
      .filter(pack => pack.status === 'active' && Object.keys(pack.composition || {}).length)
      .map(pack => ({
        category: pack.recipe_category || pack.category_code,
        b_pack: packDescription(pack),
        life_stage: pack.life_stage || null,
        pack_id: pack.id,
        data_conflict: Boolean(pack.nutrition_snapshot?.source_data_conflict),
      })),
  };
}

async function listConsumerNutritionPacks(locale = 'zh') {
  const normalizedLocale = ['zh', 'en', 'de', 'fr', 'es', 'it', 'ja', 'ko'].includes(locale) ? locale : 'zh';
  const { packs, source } = await listNutritionPacks({ fallback: true });
  let translations = new Map();
  if (source === 'pg' && normalizedLocale !== 'zh') {
    try {
      const result = await query(
        `SELECT pack_id, name, description, translation_status
         FROM pack_translations
         WHERE locale = $1`,
        [normalizedLocale]
      );
      translations = new Map(result.rows.map(row => [row.pack_id, row]));
    } catch (error) {
      console.warn('[NutritionPackRepo] translated pack catalog unavailable:', error.message);
    }
  }
  return {
    source,
    packs: packs.map(pack => {
      const translated = translations.get(pack.id);
      return {
        pack_id: pack.id,
        name: translated?.name || pack.name,
        description: translated?.description || pack.description || '',
        canonical_name: pack.name,
        pack_group: pack.pack_group,
        category_code: pack.category_code,
        recipe_category: pack.recipe_category,
        life_stage: pack.life_stage,
        health_tags: pack.health_tags,
        status: pack.status,
        available: pack.status === 'active' && Object.keys(pack.composition || {}).length > 0,
        translation_status: normalizedLocale === 'zh' ? 'source' : translated?.translation_status || 'fallback',
      };
    }),
  };
}

module.exports = {
  listNutritionPacks,
  getNutritionPack,
  createNutritionPack,
  updateNutritionPack,
  deleteNutritionPack,
  syncNutritionPackSeeds,
  syncNutritionPackTranslations,
  listBPackOptionsFromNutritionPacks,
  listConsumerNutritionPacks,
  _test: { normalizePack, nextPackId, validateComposition, validatePackClassification, mostFrequentRecipeSnapshot, packDescription },
};
