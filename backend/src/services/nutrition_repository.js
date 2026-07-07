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
    'status',
    'version',
  ];
  const entries = Object.entries(patch).filter(([key, value]) => allowed.includes(key) && value !== undefined);
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

function buildRecipeIndexByName(recipes) {
  return Object.fromEntries((recipes || []).map(recipe => [recipe.name, recipe]));
}

async function getIngredientMap() {
  try {
    if (await isAvailable()) {
      const result = await query('SELECT * FROM ingredient_library', []);
      return {
        ingredients: Object.fromEntries(result.rows.map(row => [row.name, row])),
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
  updateRecipe,
  getIngredientMap,
  buildRecipeIndexByName,
};
