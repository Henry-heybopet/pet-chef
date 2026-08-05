const { syncNutritionPackSeeds } = require('../services/nutrition_pack_repository');
const { getPool } = require('./pg_client');

syncNutritionPackSeeds()
  .then(({ packs, source }) => {
    console.log(`全价营养包同步完成：${packs.length} 个，数据源 ${source}`);
  })
  .catch(error => {
    console.error('全价营养包同步失败：', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPool()?.end();
  });
