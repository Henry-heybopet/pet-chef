const { query, isAvailable } = require('../data/pg_client');
const { recipesDb } = require('../data/recipes_db');
const { ingredientsDb } = require('../data/ingredients_db');
const { analyzeRecipeIngredients } = require('./recipe_ingredient_analysis');

const canonicalRecipeById = new Map(recipesDb.map(recipe => [recipe.id, recipe]));

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

function bPackText(value, name = '全价营养包B') {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const composition = Object.entries(value)
      .filter(([ingredient, amount]) => String(ingredient).trim() && amount !== null && amount !== undefined && amount !== '')
      .map(([ingredient, amount]) => `${ingredient} ${amount}`)
      .join(' / ');
    return composition ? `${name}：${composition}` : '';
  }
  const text = String(value || '').trim();
  return /^(无|none|null|undefined)$/i.test(text) ? '' : text;
}

function firstConfiguredBPack(name, ...values) {
  return values.map(value => bPackText(value, name)).find(Boolean) || '无';
}

function validateBPackObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return 'B包必须是“成分名称: 数值”的对象';
  }
  const entries = Object.entries(value);
  if (!entries.length || entries.some(([name, amount]) => !String(name).trim() || !Number.isFinite(Number(amount)) || Number(amount) <= 0)) {
    return 'B包每项必须包含成分名称和大于0的数值';
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
  return missing.length ? `B包缺少明确来源：${missing.join('、')}` : '';
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
  const canonicalRecipe = canonicalRecipeById.get(row.id);
  const canonicalBPackName = String(canonicalRecipe?.b_pack || '').split('：')[0] || '全价营养包B';

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
    b_pack: firstConfiguredBPack(canonicalBPackName, nutrition.b_pack, row.b_pack, canonicalRecipe?.b_pack),
    c_pack: row.c_pack || nutrition.c_pack || '无',
    img: row.img || '',
  };
}

function withIngredientAnalysis(recipe, ingredientMap) {
  const analysis = analyzeRecipeIngredients(recipe.ingredients, ingredientMap);
  return {
    ...recipe,
    ingredient_groups: analysis.groups,
    calculated_nutrition: analysis.energy,
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
  const ingredientLibrary = await getIngredientMap();
  try {
    const rows = await fetchRecipeRows('ORDER BY id', [], { activeOnly: false });
    if (rows) {
      return {
        recipes: rows.map(recipe => withIngredientAnalysis(recipe, ingredientLibrary.ingredients)),
        source: 'pg',
      };
    }
  } catch (err) {
    console.warn('[NutritionRepo] admin recipes table unavailable, using seed data:', err.message);
  }

  return {
    recipes: recipesDb.map(recipe => withIngredientAnalysis(recipe, ingredientLibrary.ingredients)),
    source: 'json_fallback',
  };
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

  const bPack = patch.nutrition_snapshot?.b_pack;
  if (bPack !== undefined && patch.status !== 'draft') {
    const validationError = validateBPackObject(bPack);
    if (validationError) {
      const error = new Error(validationError);
      error.code = 'INVALID_B_PACK';
      throw error;
    }
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
  const recipe = result.rows[0] ? normalizeRecipe(result.rows[0]) : null;
  const ingredientLibrary = await getIngredientMap();
  return {
    recipe: recipe ? withIngredientAnalysis(recipe, ingredientLibrary.ingredients) : null,
    source: 'pg',
  };
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
  const recipe = result.rows[0] ? normalizeRecipe(result.rows[0]) : null;
  const ingredientLibrary = await getIngredientMap();
  return {
    recipe: recipe ? withIngredientAnalysis(recipe, ingredientLibrary.ingredients) : null,
    source: 'pg',
  };
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
    if (definedFields.category === 'catalog' && merged[name]?.category && merged[name].category !== 'catalog') {
      delete definedFields.category;
    }
    merged[name] = { ...(merged[name] || {}), ...definedFields };
  }
  return merged;
}

function mergeIngredientAliases(ingredients, rows = []) {
  const merged = { ...ingredients };
  const canonicalKeys = new Set(Object.keys(ingredients).map(name => String(name).normalize('NFKC').trim().toLowerCase()));
  const aliasOwners = new Map();
  const ambiguousAliases = new Set();
  for (const row of rows) {
    const alias = String(row.alias_name || '').trim();
    const canonicalName = String(row.canonical_name || '').trim();
    const canonical = ingredients[canonicalName];
    const normalizedAlias = alias.normalize('NFKC').toLowerCase();
    if (!alias || !canonical || canonicalKeys.has(normalizedAlias) || ambiguousAliases.has(normalizedAlias)) continue;
    const owner = aliasOwners.get(normalizedAlias);
    if (owner && owner.canonicalName !== canonicalName) {
      delete merged[owner.alias];
      aliasOwners.delete(normalizedAlias);
      ambiguousAliases.add(normalizedAlias);
      continue;
    }
    merged[alias] = { ...canonical, canonical_name: canonicalName, alias_locale: row.locale || null };
    aliasOwners.set(normalizedAlias, { alias, canonicalName });
  }
  return merged;
}

async function getIngredientMap() {
  try {
    if (await isAvailable()) {
      const result = await query('SELECT * FROM ingredient_library', []);
      const canonical = mergeIngredientRows(ingredientsDb, result.rows);
      let translations = [];
      try {
        const translationResult = await query(
          `SELECT i.name AS canonical_name, t.locale, t.name AS alias_name
           FROM ingredient_translations t
           JOIN ingredient_library i ON i.id = t.ingredient_id
           WHERE t.translation_status = 'translated'`,
          []
        );
        translations = translationResult.rows;
      } catch (error) {
        if (error.code !== '42P01') console.warn('[NutritionRepo] ingredient aliases unavailable:', error.message);
      }
      return {
        ingredients: mergeIngredientAliases(canonical, translations),
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
  _test: { mergeIngredientRows, mergeIngredientAliases, normalizeRecipe, validateBPackObject, withIngredientAnalysis },
};
