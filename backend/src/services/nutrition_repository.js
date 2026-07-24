const { query, isAvailable } = require('../data/pg_client');
const { recipesDb } = require('../data/recipes_db');
const { ingredientsDb } = require('../data/ingredients_db');

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function asPercent(value, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return num > 0 && num <= 1 ? num * 100 : num;
}

let recipeColumnCache = null;

async function getRecipeColumns() {
  if (recipeColumnCache) return recipeColumnCache;
  const result = await query(
    `SELECT column_name FROM information_schema.columns WHERE table_name = 'recipes' AND table_schema = 'public'`,
    []
  );
  recipeColumnCache = new Set(result.rows.map(row => row.column_name));
  return recipeColumnCache;
}

function normalizeRecipe(row) {
  const healthTags = parseJson(row.health_tags, []);
  const ingredients = parseJson(row.ingredients, {});
  const cookingProfile = parseJson(row.cooking_profile, {});
  const nutrition = parseJson(row.nutrition_snapshot, {});

  return {
    ...row,
    health_tags: Array.isArray(healthTags) ? healthTags : [],
    cooking_profile: cookingProfile || {},
    tags: Array.isArray(healthTags) ? healthTags : [],
    ingredients: ingredients || {},
    cooking_base: cookingProfile || {},
    nutrition_snapshot: nutrition || {},
    water_content_pct: asPercent(row.water_content_pct ?? nutrition.water_content_pct, 70),
    protein_pct: asPercent(row.protein_pct ?? nutrition.protein_pct, 30),
    fat_pct: asPercent(row.fat_pct ?? nutrition.fat_pct, 15),
    carb_pct: asPercent(row.carb_pct ?? nutrition.carb_pct, 35),
    fiber_pct: asPercent(row.fiber_pct ?? nutrition.fiber_pct, 5),
    b_pack: row.b_pack || nutrition.b_pack || '无',
    c_pack: row.c_pack || nutrition.c_pack || '无',
    img: row.img || '',
  };
}

async function fetchRecipeRows(whereSql = '', params = [], { activeOnly = true } = {}) {
  if (!(await isAvailable())) return null;
  const baseWhere = activeOnly ? 'WHERE status = $1' : 'WHERE 1 = $1';
  const result = await query(`SELECT * FROM recipes ${baseWhere} ${whereSql}`, [activeOnly ? 'active' : 1, ...params]);
  return result.rows.map(normalizeRecipe);
}

async function listRecipes(filterFn) {
  try {
    const rows = await fetchRecipeRows();
    if (rows) return { recipes: filterFn ? rows.filter(filterFn) : rows, source: 'pg' };
  } catch (err) {
    console.warn('[NutritionRepo] recipes table unavailable, using seed data:', err.message);
  }

  const recipes = filterFn ? recipesDb.filter(filterFn) : recipesDb;
  return { recipes, source: 'json_fallback' };
}

async function listAdminRecipes() {
  try {
    const rows = await fetchRecipeRows('ORDER BY id', [], { activeOnly: false });
    if (rows) return { recipes: rows, source: 'pg' };
  } catch (err) {
    console.warn('[NutritionRepo] admin recipes table unavailable, using seed data:', err.message);
  }

  return { recipes: recipesDb, source: 'json_fallback' };
}

async function getRecipeById(id) {
  try {
    const rows = await fetchRecipeRows('AND id = $2', [id]);
    if (rows && rows[0]) return { recipe: rows[0], source: 'pg' };
  } catch (err) {
    console.warn('[NutritionRepo] recipe lookup failed, using seed data:', err.message);
  }

  return { recipe: recipesDb.find(recipe => recipe.id === id) || null, source: 'json_fallback' };
}

async function getRecipeNames() {
  const { recipes } = await listRecipes();
  return recipes.map(recipe => recipe.name);
}

async function listBPackOptions() {
  const { recipes, source } = await listRecipes();
  const grouped = new Map();
  for (const recipe of recipes) {
    if (!recipe.category || !recipe.b_pack || recipe.b_pack === '无') continue;
    if (!grouped.has(recipe.category)) grouped.set(recipe.category, new Map());
    grouped.get(recipe.category).set(recipe.b_pack, recipe.life_stage || null);
  }
  return {
    source,
    options: [...grouped.entries()].map(([category, variants]) => {
      const entries = [...variants.entries()];
      return {
        category,
        b_pack: entries[0]?.[0] || '',
        life_stage: entries[0]?.[1] || null,
        data_conflict: entries.length > 1,
      };
    }),
  };
}

async function updateRecipe(id, patch = {}) {
  if (!(await isAvailable())) {
    const error = new Error('recipes table unavailable');
    error.code = 'DB_UNAVAILABLE';
    throw error;
  }

  const allowed = [
    'name',
    'category',
    'life_stage',
    'health_tags',
    'ingredients',
    'nutrition_snapshot',
    'cooking_profile',
    'b_pack',
    'c_pack',
    'img',
    'water_content_pct',
    'protein_pct',
    'fat_pct',
    'carb_pct',
    'fiber_pct',
    'ash_pct',
    'calcium_pct',
    'phosphorus_pct',
    'chloride_pct',
    'lysine_pct',
    'calories_per_100g',
    'status',
    'version',
  ];
  const columns = await getRecipeColumns();
  const entries = Object.entries(patch).filter(([key, value]) => allowed.includes(key) && columns.has(key) && value !== undefined);
  if (entries.length === 0) return getRecipeById(id);

  const params = [id];
  const assignments = entries.map(([key, value], idx) => {
    params.push(['health_tags', 'ingredients', 'nutrition_snapshot', 'cooking_profile'].includes(key) ? JSON.stringify(value) : value);
    return `${key} = $${idx + 2}`;
  });
  const result = await query(
    `UPDATE recipes SET ${assignments.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    params
  );
  return { recipe: result.rows[0] ? normalizeRecipe(result.rows[0]) : null, source: 'pg' };
}

async function createRecipe(patch = {}) {
  if (!(await isAvailable())) {
    const error = new Error('recipes table unavailable');
    error.code = 'DB_UNAVAILABLE';
    throw error;
  }

  const idRows = await query(`SELECT id FROM recipes WHERE id LIKE 'dog_recipe_%'`, []);
  const maxId = idRows.rows.reduce((max, row) => {
    const match = String(row.id || '').match(/^dog_recipe_(\d+)$/);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  const id = patch.id || `dog_recipe_${String(maxId + 1).padStart(3, '0')}`;
  const defaults = {
    id,
    name: `新食谱 ${String(maxId + 1).padStart(3, '0')}`,
    species: 'dog',
    category: '成犬通用',
    life_stage: '成年犬',
    health_tags: [],
    ingredients: {},
    nutrition_snapshot: {},
    cooking_profile: {
      mode: 'diy',
      protein_group: 'other',
      temperature: 85,
      power: 8,
      speed: '1',
      water_ratio: 0.15,
    },
    b_pack: '',
    c_pack: '无',
    img: '',
    status: 'draft',
    version: 1,
  };
  const payload = { ...defaults, ...patch, id };
  const columns = await getRecipeColumns();
  const entries = Object.entries(payload).filter(([key, value]) => columns.has(key) && value !== undefined);
  const jsonKeys = new Set(['health_tags', 'ingredients', 'nutrition_snapshot', 'cooking_profile']);
  const params = entries.map(([key, value]) => jsonKeys.has(key) ? JSON.stringify(value) : value);
  const columnSql = entries.map(([key]) => key).join(', ');
  const valueSql = entries.map((_, index) => `$${index + 1}`).join(', ');
  const result = await query(
    `INSERT INTO recipes (${columnSql}) VALUES (${valueSql}) RETURNING *`,
    params
  );
  return { recipe: result.rows[0] ? normalizeRecipe(result.rows[0]) : null, source: 'pg' };
}

function buildRecipeIndexByName(recipes) {
  return Object.fromEntries((recipes || []).map(recipe => [recipe.name, recipe]));
}

function mergeIngredientRows(seedIngredients, rows) {
  const merged = Object.fromEntries(
    Object.entries(seedIngredients || {}).map(([name, record]) => [name, { ...record }])
  );
  for (const row of rows || []) {
    const name = String(row?.name || '').trim();
    if (!name) continue;
    const definedFields = Object.fromEntries(
      Object.entries(row).filter(([, value]) => value !== null && value !== undefined && value !== '')
    );
    merged[name] = { ...(merged[name] || {}), ...definedFields };
  }
  return merged;
}

async function getIngredientMap() {
  try {
    if (await isAvailable()) {
      const result = await query('SELECT * FROM ingredient_library', []);
      return {
        ingredients: mergeIngredientRows(ingredientsDb, result.rows),
        source: 'pg',
      };
    }
  } catch (err) {
    console.warn('[NutritionRepo] ingredient_library unavailable, using seed data:', err.message);
  }

  return { ingredients: ingredientsDb, source: 'json_fallback' };
}

module.exports = {
  listRecipes,
  listAdminRecipes,
  getRecipeById,
  getRecipeNames,
  listBPackOptions,
  createRecipe,
  updateRecipe,
  getIngredientMap,
  buildRecipeIndexByName,
  _test: { mergeIngredientRows },
};
