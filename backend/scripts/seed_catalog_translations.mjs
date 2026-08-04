import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import dotenv from 'dotenv';
import pg from 'pg';
import { demoRecipes } from '../../frontend/src/data/demoRecipes.js';
import { hasBenefitTranslation, hasDataTranslation, tBenefit, tData, tPack } from '../../frontend/src/i18n/dataTranslations.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(scriptDir, '../.env') });

const locales = ['zh', 'en', 'de', 'fr', 'es', 'it', 'ja', 'ko'];
const packCodes = {
  '幼犬成长营养包B': 'PUPPY_GROWTH_B',
  '大型幼犬稳骨控钙营养包B': 'LARGE_PUPPY_CALCIUM_B',
  '成犬维护营养包B': 'ADULT_MAINTENANCE_B',
  '成犬/美毛基础营养包B': 'ADULT_COAT_B',
  '成犬/护肝基础营养包B': 'ADULT_LIVER_B',
  '老年犬轻负担营养包B': 'SENIOR_LIGHT_B',
  '低敏单一蛋白营养包B': 'HYPOALLERGENIC_B',
};

const canonicalPackName = value => String(value || '').split(/[：:（(]/)[0].trim();
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
  const packNames = new Set();
  for (const recipe of demoRecipes) {
    for (const value of [recipe.b_pack]) {
      const name = canonicalPackName(value);
      if (name && name !== '无') packNames.add(name);
    }
  }

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

  for (const canonicalName of packNames) {
    const packCode = packCodes[canonicalName];
    if (!packCode) throw new Error(`Missing stable pack code for ${canonicalName}`);
    for (const locale of locales) {
      const rendered = tPack(canonicalName, locale);
      const separator = rendered.indexOf(':');
      const name = separator >= 0 ? rendered.slice(0, separator).trim() : rendered;
      const description = separator >= 0 ? rendered.slice(separator + 1).trim() : null;
      await client.query(
        `INSERT INTO pack_translations (pack_code, locale, canonical_name, name, description, translation_status, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         ON CONFLICT (pack_code, locale) DO UPDATE SET canonical_name = EXCLUDED.canonical_name, name = EXCLUDED.name, description = EXCLUDED.description, translation_status = EXCLUDED.translation_status, updated_at = NOW()`,
        [packCode, locale, canonicalName, name, description, locale === 'zh' ? 'source' : (hasDataTranslation(canonicalName, locale) ? 'translated' : 'fallback')]
      );
    }
  }

  await client.query('COMMIT');
  console.log(JSON.stringify({ recipes: recipes.length, ingredients: ingredients.length, packs: packNames.size, locales: locales.length }));
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
