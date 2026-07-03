const { query, isAvailable } = require('./pg_client');
const { recipesDb } = require('./recipes_db');

async function run() {
  console.log("Checking database availability...");
  const available = await isAvailable();
  if (!available) {
    console.error("❌ Database is not configured or offline. No database sync needed (running in JSON fallback fallback mode).");
    return;
  }

  try {
    console.log("Database connected. Syncing active recipes to table 'recipes'...");
    
    // 1. 清理数据库中旧的活跃食谱
    await query("DELETE FROM recipes WHERE status = $1 OR status IS NULL", ['active']);
    console.log("Cleaned existing active recipes from database.");

    // 2. 插入刷新的40套新食谱数据，适配真实的 recipes 表结构
    for (const r of recipesDb) {
      const sql = `
        INSERT INTO recipes (
          id, name, species, category, life_stage, 
          health_tags, ingredients, cooking_profile, nutrition_snapshot, 
          status, version, created_at, updated_at
        ) VALUES (
          $1, $2, 'dog', $3, $4, 
          $5, $6, $7, $8, 
          'active', 1, NOW(), NOW()
        )
      `;
      const nutritionSnapshot = {
        protein_pct: r.protein_pct,
        fat_pct: r.fat_pct,
        carb_pct: r.carb_pct,
        fiber_pct: r.fiber_pct,
        water_content_pct: r.water_content_pct,
        b_pack: r.b_pack,
        c_pack: r.c_pack
      };
      
      const params = [
        r.id,
        r.name,
        r.category,
        r.life_stage || null,
        JSON.stringify(r.tags || []),
        JSON.stringify(r.ingredients || {}),
        JSON.stringify(r.cooking_base || {}),
        JSON.stringify(nutritionSnapshot)
      ];
      await query(sql, params);
    }
    console.log(`✅ Successfully synced ${recipesDb.length} refreshed recipes to PostgreSQL database!`);
  } catch (err) {
    console.error("❌ Failed to sync recipes to database:", err.message);
  }
}

run();
