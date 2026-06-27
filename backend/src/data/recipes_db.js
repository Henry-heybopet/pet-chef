// recipes_db.js — 增强版食谱数据库
// 基于40条原始食谱，新增：本地图片路径、含水量、功效描述、烹饪基准参数
const { ingredientsDb } = require('./ingredients_db');

// 计算食谱的平均含水量（用于烹饪时间估算）
function calcWaterContent(ingredients) {
  let totalWeight = 0, totalWater = 0;
  Object.entries(ingredients).forEach(([name, pct]) => {
    if (typeof pct !== 'number') return;
    const ing = ingredientsDb[name];
    const waterPct = ing ? ing.water_pct : 0.70;
    totalWeight += pct;
    totalWater += pct * waterPct;
  });
  return totalWeight > 0 ? totalWater / totalWeight : 0.70;
}

// 本地图片映射（食谱名 -> 本地路径）— 全部40条精确匹配
const imgMap = {
  // 幼犬（小型犬）
  '鸡肉苹果成长餐': '/鸡肉苹果成长餐.png',
  '三文鱼南瓜脑发育': '/三文鱼南瓜脑发育.png',
  '鸡肉藜麦免疫餐': '/鸡肉藜麦免疫餐.png',
  '火鸡南瓜肠胃餐': '/火鸡南瓜肠胃餐.png',
  '牛肉红薯活力餐': '/牛肉红薯活力餐.png',
  // 幼犬（中型犬）
  '牛肉高蛋白成长': '/牛肉高蛋白成长.png',
  '鸡肉藜麦均衡': '/鸡肉藜麦均衡.png',
  '三文鱼燕麦成长': '/三文鱼燕麦成长.png',
  '火鸡红薯成长': '/火鸡红薯成长.png',
  '鸡肉土豆成长': '/鸡肉土豆成长.png',
  // 幼犬（大型犬）
  '鸡肉稳生长': '/鸡肉稳生长.png',
  '火鸡低钙成长': '/火鸡低钙成长.png',
  '牛肉控制成长': '/牛肉控制成长.png',
  '鸡肉蔬菜成长': '/鸡肉蔬菜成长.png',
  '三文鱼缓生长': '/三文鱼缓生长.png',
  // 成年犬（小型犬）
  '牛肉能量餐': '/牛肉能量餐.png',
  '鸡肉轻盈餐': '/鸡肉轻盈餐.png',
  '火鸡低脂餐': '/火鸡低脂餐.png',
  '三文鱼均衡餐': '/三文鱼均衡餐.png',
  '鸡肉米饭经典': '/鸡肉米饭经典.png',
  // 老年犬（小型犬）
  '护关节低脂': '/护关节低脂.png',
  '易消化温和': '/易消化温和.png',
  '鸡肉高纤': '/鸡肉高纤.png',
  '鱼肉护心': '/鱼肉护心.png',
  '牛肉补能': '/牛肉补能.png',
  // 美毛
  '三文鱼亮毛': '/三文鱼亮毛.png',
  '鸡肉亚麻油': '/鸡肉亚麻油美毛.png',
  '牛肉护肤': '/牛肉护肤美毛.png',
  '火鸡抗敏': '/火鸡抗敏美毛.png',
  '鱼肉抗炎': '/鱼肉抗炎美毛.png',
  // 护肝
  '鸡肉南瓜': '/鸡肉南瓜护肝.png',
  '火鸡低脂': '/火鸡低脂护肝.png',
  '鱼肉抗氧': '/鱼肉抗氧护肝.png',
  '鸡肉姜黄': '/鸡肉姜黄护肝.png',
  '牛肉轻负担': '/牛肉轻负担护肝.png',
  // 低敏
  '鹿肉单一': '/鹿肉单一低敏.png',
  '鸭肉低敏': '/鸭肉低敏.png',
  '火鸡低敏': '/火鸡低敏.png',
  '鱼肉低敏': '/鱼肉低敏.png',
  '羊肉低敏': '/羊肉低敏.png',
};

const rawRecipes = [
  { id: 'dog_recipe_001', category: '幼犬（小型犬）', category_code: 1, category_type: 'life_stage_size', life_stage: '幼犬', dog_size: '小型犬', name: '鸡肉苹果成长餐', tags: ['成长', '易消化'], ingredients: { '鸡胸肉': 32, '鸡肝': 10, '鸡心': 13, '苹果': 9, '燕麦': 4, '青豆': 6, '红薯': 10, '南瓜': 9, '山药': 6 } },
  { id: 'dog_recipe_002', category: '幼犬（小型犬）', category_code: 1, category_type: 'life_stage_size', life_stage: '幼犬', dog_size: '小型犬', name: '三文鱼南瓜脑发育', tags: ['DHA', '脑发育'], ingredients: { '三文鱼': 35, '鸡肝': 8, '燕麦': 15, '南瓜': 15, '胡萝卜': 10, '西兰花': 7, '蓝莓': 5, '鱼油': 3, '蛋壳粉': 2 } },
  { id: 'dog_recipe_003', category: '幼犬（小型犬）', category_code: 1, category_type: 'life_stage_size', life_stage: '幼犬', dog_size: '小型犬', name: '鸡肉藜麦免疫餐', tags: ['免疫增强'], ingredients: { '鸡胸肉': 35, '鸡心': 10, '藜麦': 20, '西兰花': 10, '红薯': 15, '蓝莓': 5, '鱼油': 3, '钙粉': 2 } },
  { id: 'dog_recipe_004', category: '幼犬（小型犬）', category_code: 1, category_type: 'life_stage_size', life_stage: '幼犬', dog_size: '小型犬', name: '火鸡南瓜肠胃餐', tags: ['肠胃友好'], ingredients: { '火鸡肉': 35, '南瓜': 20, '燕麦': 20, '胡萝卜': 10, '菠菜': 8, '亚麻籽油': 3, '钙粉': 2, '苹果': 2 } },
  { id: 'dog_recipe_005', category: '幼犬（小型犬）', category_code: 1, category_type: 'life_stage_size', life_stage: '幼犬', dog_size: '小型犬', name: '牛肉红薯活力餐', tags: ['高能量'], ingredients: { '牛肉': 35, '牛肝': 8, '红薯': 20, '胡萝卜': 10, '西兰花': 10, '糙米': 10, '鱼油': 3, '钙粉': 2, '蓝莓': 2 } },
  { id: 'dog_recipe_006', category: '幼犬（中型犬）', category_code: 2, category_type: 'life_stage_size', life_stage: '幼犬', dog_size: '中型犬', name: '牛肉高蛋白成长', tags: ['成长'], ingredients: { '牛肉': 40, '牛肝': 8, '糙米': 15, '南瓜': 15, '胡萝卜': 10, '菠菜': 7, '亚麻籽油': 3, '钙粉': 2 } },
  { id: 'dog_recipe_007', category: '幼犬（中型犬）', category_code: 2, category_type: 'life_stage_size', life_stage: '幼犬', dog_size: '中型犬', name: '鸡肉藜麦均衡', tags: ['均衡'], ingredients: { '鸡胸肉': 35, '鸡心': 10, '藜麦': 20, '西兰花': 10, '红薯': 15, '蓝莓': 5, '鱼油': 3, '钙粉': 2 } },
  { id: 'dog_recipe_008', category: '幼犬（中型犬）', category_code: 2, category_type: 'life_stage_size', life_stage: '幼犬', dog_size: '中型犬', name: '三文鱼燕麦成长', tags: ['成长'], ingredients: { '三文鱼': 35, '燕麦': 20, '南瓜': 15, '胡萝卜': 10, '菠菜': 10, '鱼油': 5, '钙粉': 5 } },
  { id: 'dog_recipe_009', category: '幼犬（中型犬）', category_code: 2, category_type: 'life_stage_size', life_stage: '幼犬', dog_size: '中型犬', name: '火鸡红薯成长', tags: ['成长'], ingredients: { '火鸡': 40, '红薯': 20, '西兰花': 10, '胡萝卜': 10, '燕麦': 15, '亚麻籽油': 3, '钙粉': 2 } },
  { id: 'dog_recipe_010', category: '幼犬（中型犬）', category_code: 2, category_type: 'life_stage_size', life_stage: '幼犬', dog_size: '中型犬', name: '鸡肉土豆成长', tags: ['成长'], ingredients: { '鸡胸肉': 38, '土豆': 20, '胡萝卜': 10, '西葫芦': 10, '糙米': 15, '鱼油': 5, '钙粉': 2 } },
  { id: 'dog_recipe_011', category: '幼犬（大型犬）', category_code: 3, category_type: 'life_stage_size', life_stage: '幼犬', dog_size: '大型犬', name: '鸡肉稳生长', tags: ['控钙'], ingredients: { '鸡胸肉': 40, '鸡心': 10, '红薯': 20, '西葫芦': 10, '胡萝卜': 10, '燕麦': 7, '鱼油': 2, '钙粉': 1 } },
  { id: 'dog_recipe_012', category: '幼犬（大型犬）', category_code: 3, category_type: 'life_stage_size', life_stage: '幼犬', dog_size: '大型犬', name: '火鸡低钙成长', tags: ['控钙'], ingredients: { '火鸡': 40, '南瓜': 20, '糙米': 15, '青豆': 10, '菠菜': 8, '亚麻籽油': 3, '钙粉': 2 } },
  { id: 'dog_recipe_013', category: '幼犬（大型犬）', category_code: 3, category_type: 'life_stage_size', life_stage: '幼犬', dog_size: '大型犬', name: '牛肉控制成长', tags: ['控钙'], ingredients: { '牛肉': 35, '红薯': 20, '胡萝卜': 15, '西兰花': 10, '燕麦': 15, '鱼油': 3, '钙粉': 2 } },
  { id: 'dog_recipe_014', category: '幼犬（大型犬）', category_code: 3, category_type: 'life_stage_size', life_stage: '幼犬', dog_size: '大型犬', name: '鸡肉蔬菜成长', tags: ['控钙'], ingredients: { '鸡肉': 38, '南瓜': 20, '西兰花': 15, '胡萝卜': 10, '糙米': 12, '鱼油': 3, '钙粉': 2 } },
  { id: 'dog_recipe_015', category: '幼犬（大型犬）', category_code: 3, category_type: 'life_stage_size', life_stage: '幼犬', dog_size: '大型犬', name: '三文鱼缓生长', tags: ['控钙'], ingredients: { '三文鱼': 35, '红薯': 20, '菠菜': 15, '燕麦': 15, '西葫芦': 10, '鱼油': 3, '钙粉': 2 } },
  { id: 'dog_recipe_016', category: '成年犬（小型犬）', category_code: 4, category_type: 'life_stage_size', life_stage: '成年犬', dog_size: '小型犬', name: '牛肉能量餐', tags: ['能量'], ingredients: { '牛肉': 35, '土豆': 20, '胡萝卜': 10, '西兰花': 10, '糙米': 15, '亚麻籽油': 3, '钙粉': 2, '苹果': 5 } },
  { id: 'dog_recipe_017', category: '成年犬（小型犬）', category_code: 4, category_type: 'life_stage_size', life_stage: '成年犬', dog_size: '小型犬', name: '鸡肉轻盈餐', tags: ['轻盈'], ingredients: { '鸡胸肉': 35, '南瓜': 20, '西葫芦': 15, '燕麦': 15, '菠菜': 8, '鱼油': 3, '蓝莓': 4 } },
  { id: 'dog_recipe_018', category: '成年犬（小型犬）', category_code: 4, category_type: 'life_stage_size', life_stage: '成年犬', dog_size: '小型犬', name: '火鸡低脂餐', tags: ['低脂'], ingredients: { '火鸡': 35, '南瓜': 20, '西兰花': 15, '燕麦': 15, '胡萝卜': 10, '亚麻籽油': 3, '蓝莓': 2 } },
  { id: 'dog_recipe_019', category: '成年犬（小型犬）', category_code: 4, category_type: 'life_stage_size', life_stage: '成年犬', dog_size: '小型犬', name: '三文鱼均衡餐', tags: ['均衡'], ingredients: { '三文鱼': 30, '红薯': 20, '菠菜': 15, '燕麦': 15, '西兰花': 10, '鱼油': 5, '蓝莓': 5 } },
  { id: 'dog_recipe_020', category: '成年犬（小型犬）', category_code: 4, category_type: 'life_stage_size', life_stage: '成年犬', dog_size: '小型犬', name: '鸡肉米饭经典', tags: ['经典'], ingredients: { '鸡肉': 35, '米饭': 25, '胡萝卜': 10, '西兰花': 10, '菠菜': 10, '鱼油': 5, '苹果': 5 } },
  { id: 'dog_recipe_021', category: '老年犬（小型犬）', category_code: 7, category_type: 'life_stage_size', life_stage: '老年犬', dog_size: '小型犬', name: '护关节低脂', tags: ['护关节', '低脂'], ingredients: { '鸡胸肉': 30, '南瓜': 20, '西葫芦': 15, '燕麦': 15, '胡萝卜': 10, '鱼油': 2, '葡萄糖胺': 1, '蓝莓': 7 } },
  { id: 'dog_recipe_022', category: '老年犬（小型犬）', category_code: 7, category_type: 'life_stage_size', life_stage: '老年犬', dog_size: '小型犬', name: '易消化温和', tags: ['温和', '易消化'], ingredients: { '火鸡': 30, '红薯': 25, '南瓜': 20, '菠菜': 10, '燕麦': 10, '亚麻籽油': 3, '钙粉': 2 } },
  { id: 'dog_recipe_023', category: '老年犬（小型犬）', category_code: 7, category_type: 'life_stage_size', life_stage: '老年犬', dog_size: '小型犬', name: '鸡肉高纤', tags: ['高纤'], ingredients: { '鸡肉': 30, '南瓜': 25, '西兰花': 20, '燕麦': 10, '胡萝卜': 10, '鱼油': 3, '蓝莓': 2 } },
  { id: 'dog_recipe_024', category: '老年犬（小型犬）', category_code: 7, category_type: 'life_stage_size', life_stage: '老年犬', dog_size: '小型犬', name: '鱼肉护心', tags: ['护心'], ingredients: { '三文鱼': 30, '红薯': 20, '菠菜': 20, '燕麦': 15, '蓝莓': 10, '鱼油': 3, '钙粉': 2 } },
  { id: 'dog_recipe_025', category: '老年犬（小型犬）', category_code: 7, category_type: 'life_stage_size', life_stage: '老年犬', dog_size: '小型犬', name: '牛肉补能', tags: ['补能'], ingredients: { '牛肉': 30, '土豆': 25, '胡萝卜': 15, '西兰花': 10, '燕麦': 10, '鱼油': 5, '蓝莓': 5 } },
  { id: 'dog_recipe_026', category: '美毛', category_code: 10, category_type: 'functional', life_stage: null, dog_size: null, name: '三文鱼亮毛', tags: ['亮毛', '美毛'], ingredients: { '三文鱼': 40, '鸡蛋': 10, '胡萝卜': 10, '蓝莓': 10, '燕麦': 15, '亚麻籽油': 3, '菠菜': 12 } },
  { id: 'dog_recipe_027', category: '美毛', category_code: 10, category_type: 'functional', life_stage: null, dog_size: null, name: '鸡肉亚麻油', tags: ['美毛'], ingredients: { '鸡肉': 35, '南瓜': 20, '菠菜': 15, '燕麦': 15, '蓝莓': 10, '亚麻籽油': 5 } },
  { id: 'dog_recipe_028', category: '美毛', category_code: 10, category_type: 'functional', life_stage: null, dog_size: null, name: '牛肉护肤', tags: ['护肤', '美毛'], ingredients: { '牛肉': 35, '红薯': 20, '胡萝卜': 15, '菠菜': 10, '燕麦': 15, '鱼油': 5 } },
  { id: 'dog_recipe_029', category: '美毛', category_code: 10, category_type: 'functional', life_stage: null, dog_size: null, name: '火鸡抗敏', tags: ['抗敏', '美毛'], ingredients: { '火鸡': 35, '南瓜': 20, '西兰花': 15, '燕麦': 15, '蓝莓': 10, '亚麻籽油': 5 } },
  { id: 'dog_recipe_030', category: '美毛', category_code: 10, category_type: 'functional', life_stage: null, dog_size: null, name: '鱼肉抗炎', tags: ['抗炎', '美毛'], ingredients: { '三文鱼': 38, '红薯': 20, '菠菜': 15, '燕麦': 15, '蓝莓': 7, '鱼油': 5 } },
  { id: 'dog_recipe_031', category: '护肝', category_code: 11, category_type: 'functional', life_stage: null, dog_size: null, name: '鸡肉南瓜', tags: ['护肝'], ingredients: { '鸡肉': 35, '南瓜': 25, '胡萝卜': 10, '燕麦': 15, '西兰花': 10, '鱼油': 3, '蓝莓': 2 } },
  { id: 'dog_recipe_032', category: '护肝', category_code: 11, category_type: 'functional', life_stage: null, dog_size: null, name: '火鸡低脂', tags: ['低脂', '护肝'], ingredients: { '火鸡': 35, '南瓜': 25, '菠菜': 15, '燕麦': 15, '蓝莓': 5, '亚麻籽油': 5 } },
  { id: 'dog_recipe_033', category: '护肝', category_code: 11, category_type: 'functional', life_stage: null, dog_size: null, name: '鱼肉抗氧', tags: ['抗氧', '护肝'], ingredients: { '三文鱼': 30, '南瓜': 20, '菠菜': 20, '燕麦': 15, '蓝莓': 10, '鱼油': 5 } },
  { id: 'dog_recipe_034', category: '护肝', category_code: 11, category_type: 'functional', life_stage: null, dog_size: null, name: '鸡肉姜黄', tags: ['护肝'], ingredients: { '鸡肉': 38, '南瓜': 25, '胡萝卜': 15, '燕麦': 17, '鱼油': 5 } },
  { id: 'dog_recipe_035', category: '护肝', category_code: 11, category_type: 'functional', life_stage: null, dog_size: null, name: '牛肉轻负担', tags: ['轻负担', '护肝'], ingredients: { '牛肉': 30, '南瓜': 25, '西兰花': 15, '燕麦': 15, '蓝莓': 10, '鱼油': 5 } },
  { id: 'dog_recipe_036', category: '低敏', category_code: 14, category_type: 'functional', life_stage: null, dog_size: null, name: '鹿肉单一', tags: ['单一蛋白', '低敏'], ingredients: { '鹿肉': 50, '红薯': 25, '西葫芦': 15, '橄榄油': 3, '蓝莓': 7 } },
  { id: 'dog_recipe_037', category: '低敏', category_code: 14, category_type: 'functional', life_stage: null, dog_size: null, name: '鸭肉低敏', tags: ['低敏'], ingredients: { '鸭肉': 45, '南瓜': 25, '西葫芦': 15, '燕麦': 10, '鱼油': 5 } },
  { id: 'dog_recipe_038', category: '低敏', category_code: 14, category_type: 'functional', life_stage: null, dog_size: null, name: '火鸡低敏', tags: ['低敏'], ingredients: { '火鸡': 45, '红薯': 25, '菠菜': 15, '燕麦': 10, '亚麻籽油': 5 } },
  { id: 'dog_recipe_039', category: '低敏', category_code: 14, category_type: 'functional', life_stage: null, dog_size: null, name: '鱼肉低敏', tags: ['低敏'], ingredients: { '白鱼': 45, '土豆': 25, '西葫芦': 15, '燕麦': 10, '鱼油': 5 } },
  { id: 'dog_recipe_040', category: '低敏', category_code: 14, category_type: 'functional', life_stage: null, dog_size: null, name: '羊肉低敏', tags: ['低敏'], ingredients: { '羊肉': 45, '南瓜': 25, '胡萝卜': 15, '燕麦': 10, '鱼油': 5 } },
];

// 计算每个食谱的含水量、功效说明、烹饪基准参数
const recipesDb = rawRecipes.map(r => {
  const waterContent = calcWaterContent(r.ingredients);
  const totalPct = Object.values(r.ingredients).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);

  // 计算各类别占比
  let proteinPct = 0, carbPct = 0, vegPct = 0, addPct = 0;
  Object.entries(r.ingredients).forEach(([name, pct]) => {
    if (typeof pct !== 'number') return;
    const cat = ingredientsDb[name]?.category || 'addition';
    if (cat === 'protein') proteinPct += pct;
    else if (cat === 'carb') carbPct += pct;
    else if (cat === 'veg') vegPct += pct;
    else addPct += pct;
  });

  // 烹饪基准（100g食材）
  // 基于实测数据推导：纯肉(60%水) 45s预热/9min烹饪；混合(75%水) 30s预热/8min烹饪
  const waterFactor = Math.max(0, (waterContent - 0.60));
  const preheat_seconds = Math.round((22.5 - waterFactor * 60) * 2); // per 100g extrapolation
  const cook_seconds = Math.round((320 - waterFactor * 300) * 1.0); // per 100g, full cook

  const ossBaseUrl = process.env.OSS_BASE_URL || '';
  return {
    ...r,
    img: imgMap[r.name] ? `${ossBaseUrl}${imgMap[r.name]}` : `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&h=400&q=80`,
    water_content_pct: Math.round(waterContent * 100),
    protein_pct: Math.round(proteinPct),
    carb_pct: Math.round(carbPct),
    veg_pct: Math.round(vegPct),
    add_pct: Math.round(addPct),
    // 食材功效（汇总各食材功效）
    ingredient_benefits: Object.keys(r.ingredients).reduce((acc, name) => {
      if (ingredientsDb[name]) acc[name] = ingredientsDb[name].benefits;
      return acc;
    }, {}),
    // 烹饪基准（100g食材）
    cooking_base: {
      mode: 'diy',
      temperature: 85,
      power: 8,
      speed: '1',
      water_ratio: 0.15,
      preheat_seconds_per_100g: Math.max(15, preheat_seconds),
      cook_seconds_per_100g: Math.max(240, cook_seconds),
    },
  };
});

module.exports = { recipesDb };
