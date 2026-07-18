// Pet Chef Ver B1.00 — 2026-06-22
// Seed script: import ingredients and recipes from JS files to PostgreSQL

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { Pool } = require('pg');

const ingredientsDb = require('../src/data/ingredients_db').ingredientsDb;
const recipesDb = require('../src/data/recipes_db').recipesDb;

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('ERROR: SUPABASE_DB_URL or DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function seedIngredients() {
  const client = await pool.connect();
  let successCount = 0;
  let errorCount = 0;

  try {
    console.log(`\n📦 Seeding ${Object.keys(ingredientsDb).length} ingredients...`);

    for (const [name, data] of Object.entries(ingredientsDb)) {
      try {
        const id = name; // Use name as ID
        const sql = `
          INSERT INTO ingredient_library (
            id, name, category, water_pct, protein_pct, fat_pct,
            carb_pct, fiber_pct, calories_per_100g, benefits
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            water_pct = EXCLUDED.water_pct,
            protein_pct = EXCLUDED.protein_pct,
            fat_pct = EXCLUDED.fat_pct,
            carb_pct = EXCLUDED.carb_pct,
            fiber_pct = EXCLUDED.fiber_pct,
            calories_per_100g = EXCLUDED.calories_per_100g,
            benefits = EXCLUDED.benefits,
            updated_at = NOW()
        `;

        const values = [
          id,
          name,
          data.category || 'protein',
          data.water_pct || null,
          data.protein_pct || null,
          data.fat_pct || null,
          data.carb_pct || null,
          data.fiber_pct || null,
          data.calories_per_100g || null,
          data.benefits || null,
        ];

        await client.query(sql, values);
        successCount++;
      } catch (err) {
        console.error(`  ❌ Failed to seed ingredient "${name}":`, err.message);
        errorCount++;
      }
    }

    console.log(`✅ Ingredients: ${successCount} success, ${errorCount} errors`);
  } finally {
    client.release();
  }
}

async function seedRecipes() {
  const client = await pool.connect();
  let successCount = 0;
  let errorCount = 0;

  try {
    console.log(`\n📦 Seeding ${recipesDb.length} recipes...`);

    for (const recipe of recipesDb) {
      try {
        const sql = `
          INSERT INTO recipes (
            id, name, category, category_code, life_stage, dog_size,
            tags, ingredients, water_content_pct, protein_pct,
            carb_pct, veg_pct, add_pct, cooking_base
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            category = EXCLUDED.category,
            category_code = EXCLUDED.category_code,
            life_stage = EXCLUDED.life_stage,
            dog_size = EXCLUDED.dog_size,
            tags = EXCLUDED.tags,
            ingredients = EXCLUDED.ingredients,
            water_content_pct = EXCLUDED.water_content_pct,
            protein_pct = EXCLUDED.protein_pct,
            carb_pct = EXCLUDED.carb_pct,
            veg_pct = EXCLUDED.veg_pct,
            add_pct = EXCLUDED.add_pct,
            cooking_base = EXCLUDED.cooking_base,
            updated_at = NOW()
        `;

        const values = [
          recipe.id,
          recipe.name,
          recipe.category || null,
          recipe.category_code || null,
          recipe.life_stage || null,
          recipe.dog_size || null,
          recipe.tags || [],
          JSON.stringify(recipe.ingredients),
          recipe.water_content_pct || null,
          recipe.protein_pct || null,
          recipe.carb_pct || null,
          recipe.veg_pct || null,
          recipe.add_pct || null,
          recipe.cooking_base ? JSON.stringify(recipe.cooking_base) : null,
        ];

        await client.query(sql, values);
        successCount++;
      } catch (err) {
        console.error(`  ❌ Failed to seed recipe "${recipe.name}" (${recipe.id}):`, err.message);
        errorCount++;
      }
    }

    console.log(`✅ Recipes: ${successCount} success, ${errorCount} errors`);
  } finally {
    client.release();
  }
}

async function main() {
  console.log('🚀 Pet Chef Seed Script — Ver B1.00');
  console.log('='.repeat(50));

  try {
    await seedIngredients();
    await seedRecipes();

    console.log('\n✅ Seed completed!');
  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
