import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import dotenv from 'dotenv';
import pg from 'pg';
import { demoRecipes } from '../../frontend/src/data/demoRecipes.js';
import { hasBenefitTranslation, hasDataTranslation, tBenefit, tData } from '../../frontend/src/i18n/dataTranslations.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { NUTRITION_PACK_TRANSLATIONS } = require('../src/data/nutrition_pack_translations_db');
const { syncNutritionPackTranslations } = require('../src/services/nutrition_pack_repository');
dotenv.config({ path: path.resolve(scriptDir, '../.env') });

const locales = ['zh', 'en', 'de', 'fr', 'es', 'it', 'ja', 'ko'];
const benefitByIngredient = new Map();
for (const recipe of demoRecipes) {
  for (const [name, benefit] of Object.entries(recipe.ingredient_benefits || {})) {
    if (!benefitByIngredient.has(name)) benefitByIngredient.set(name, benefit);
  }
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const client = await pool.connect();
try {
  await client.query('BEGIN');
  const recipes = (await client.query('SELECT id, name FROM recipes')).rows;
  const existingIngredients = (await client.query('SELECT id, name FROM ingredient_library')).rows;
  const ingredientIdByName = new Map(existingIngredients.map(row => [row.name, row.id]));
  for (const name of new Set(demoRecipes.flatMap(recipe => Object.keys(recipe.ingredients || {})))) {
    if (ingredientIdByName.has(name)) continue;
    const id = `catalog_${createHash('sha1').update(name).digest('hex').slice(0, 16)}`;
    await client.query(
      `INSERT INTO ingredient_library (id, name, category, safety_level, benefits, created_at)
       VALUES ($1, $2, 'catalog', 'safe', $3, NOW())
       ON CONFLICT (id) DO NOTHING`,
      [id, name, benefitByIngredient.get(name) || null]
    );
  }
  const ingredients = (await client.query('SELECT id, name, benefits FROM ingredient_library')).rows;

  for (const recipe of recipes) {
    for (const locale of locales) {
      const name = tData(recipe.name, locale);
      await client.query(
        `INSERT INTO recipe_translations (recipe_id, locale, name, translation_status, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (recipe_id, locale) DO UPDATE SET name = EXCLUDED.name, translation_status = EXCLUDED.translation_status, updated_at = NOW()`,
        [recipe.id, locale, name, locale === 'zh' ? 'source' : (hasDataTranslation(recipe.name, locale) ? 'translated' : 'fallback')]
      );
    }
  }

  for (const ingredient of ingredients) {
    const canonicalBenefit = ingredient.benefits || benefitByIngredient.get(ingredient.name) || null;
    for (const locale of locales) {
      const name = tData(ingredient.name, locale);
      const benefits = canonicalBenefit ? tBenefit(ingredient.name, canonicalBenefit, locale) : null;
      const translated = locale === 'zh' || (hasDataTranslation(ingredient.name, locale) && (!canonicalBenefit || hasBenefitTranslation(ingredient.name, locale)));
      await client.query(
        `INSERT INTO ingredient_translations (ingredient_id, locale, name, benefits, translation_status, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (ingredient_id, locale) DO UPDATE SET name = EXCLUDED.name, benefits = EXCLUDED.benefits, translation_status = EXCLUDED.translation_status, updated_at = NOW()`,
        [ingredient.id, locale, name, benefits, locale === 'zh' ? 'source' : (translated ? 'translated' : 'fallback')]
      );
    }
  }

  await syncNutritionPackTranslations(client);

  await client.query('COMMIT');
  console.log(JSON.stringify({
    recipes: recipes.length,
    ingredients: ingredients.length,
    packs: new Set(NUTRITION_PACK_TRANSLATIONS.map(row => row.pack_id)).size,
    locales: locales.length,
  }));
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
