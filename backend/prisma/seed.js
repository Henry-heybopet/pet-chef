const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const { recipesDb } = require('../src/data/recipes_db');
const { breedsDb } = require('../src/data/breeds_db');
const { ingredientsDb } = require('../src/data/ingredients_db');
const { db } = require('../src/services/heybo_store');

async function main() {
  console.log('开始导入种子数据...');

  // 1. 清理现有数据
  await prisma.sku.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.ingredientLibrary.deleteMany({});
  await prisma.recipe.deleteMany({});
  await prisma.recipeSource.deleteMany({});

  console.log('已清理旧数据');

  // 2. 导入食材标准库 (IngredientLibrary)
  console.log('导入食材库...');
  for (const [name, item] of Object.entries(ingredientsDb)) {
    await prisma.ingredientLibrary.create({
      data: {
        id: name, // 直接将中文名作为 ID 以简化查询，符合 MVP 映射
        name: name,
        category: item.category || 'other',
        safety_level: item.safety_level || 'safe',
        safety_note: item.safety_note || null,
        water_pct: item.water_pct !== undefined ? parseFloat(item.water_pct) : null,
        protein_pct: item.protein_pct !== undefined ? parseFloat(item.protein_pct) : null,
        fat_pct: item.fat_pct !== undefined ? parseFloat(item.fat_pct) : null,
        carb_pct: item.carb_pct !== undefined ? parseFloat(item.carb_pct) : null,
        fiber_pct: item.fiber_pct !== undefined ? parseFloat(item.fiber_pct) : null,
        calories_per_100g: item.calories_per_100g !== undefined ? parseFloat(item.calories_per_100g) : null,
        benefits: item.benefits || null,
      },
    });
  }
  console.log(`成功导入 ${Object.keys(ingredientsDb).length} 种食材`);

  // 3. 导入食谱来源 (RecipeSource)
  const defaultSource = await prisma.recipeSource.create({
    data: {
      id: 'src_default_001',
      source_type: 'manual',
      title: 'Pet Chef 官方标准营养食谱',
      author: 'Heybo Nutrition Team',
      notes: '经过兽医和宠物营养师校准的官方种子数据',
    },
  });

  // 4. 导入食谱 (Recipe)
  console.log('导入食谱库...');
  let recipeCount = 0;
  for (const item of recipesDb) {
    // 映射 species
    const species = item.id.startsWith('cat') ? 'cat' : 'dog';

    // 组合 nutrition_snapshot
    const nutritionSnapshot = {
      water_content_pct: item.water_content_pct || 0.70,
      protein_pct: item.protein_pct || 0,
      fat_pct: item.fat_pct || 0,
      carb_pct: item.carb_pct || 0,
      fiber_pct: item.fiber_pct || 0,
      veg_pct: item.veg_pct || 0,
      add_pct: item.add_pct || 0,
      ingredient_benefits: item.ingredient_benefits || '',
      b_pack: item.b_pack || '',
    };

    await prisma.recipe.create({
      data: {
        id: item.id,
        name: item.name,
        species: species,
        category: item.category,
        life_stage: item.life_stage || null,
        health_tags: item.tags || [],
        ingredients: item.ingredients || {},
        nutrition_snapshot: nutritionSnapshot,
        img: item.img || '',
        cooking_profile: item.cooking_base || {},
        status: 'active',
        version: 1,
        source_id: defaultSource.id,
      },
    });
    recipeCount++;
  }
  console.log(`成功导入 ${recipeCount} 个食谱`);

  // 5. 导入商城商品 (Product & Sku)
  console.log('导入商城 SPU 与 SKU...');
  const seedProducts = db.products && db.products.length > 0 ? db.products : [];
  for (const item of seedProducts) {
    const skuId = `${item.id}_sku`;
    await prisma.product.create({
      data: {
        id: item.id,
        name: item.name,
        category: item.category || 'meat_pack',
        target_tags: item.target_tags || [],
        description: `${item.name} - 智能设备适配耗材`,
        status: 'active',
        default_sku_id: skuId,
        skus: {
          create: {
            id: skuId,
            sku_code: `${item.id}_code`,
            name: `${item.name} 标准规格`,
            price_cents: item.price_cents || 100,
            currency: item.currency || 'CNY',
            stock_status: 'in_stock',
            status: 'active',
          },
        },
      },
    });
  }
  console.log(`成功导入 ${seedProducts.length} 个商品`);
  console.log('种子数据导入完成！');
}

main()
  .catch((e) => {
    console.error('导入种子数据出错:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
