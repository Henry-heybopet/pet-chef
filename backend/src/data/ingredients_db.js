// Pet Chef Ver B1.00 — Safety Filter · 2026-06-22
// ingredients_db.js — 食材营养功效数据库
const ingredientsDb = {
  // ===== 蛋白质类 =====
  '鸡胸肉': {
    category: 'protein', water_pct: 0.72,
    benefits: '高质量瘦肉蛋白，富含亮氨酸等必需氨基酸，低脂肪，适合体重管理和肌肉维持。',
    calories_per_100g: 165, protein_pct: 31, fat_pct: 4,
    safety_level: 'safe', safety_note: null,
  },
  '鸡肉': {
    category: 'protein', water_pct: 0.70,
    benefits: '优质蛋白质来源，含有丰富的B族维生素，易消化，适合各年龄段犬只。',
    calories_per_100g: 180, protein_pct: 27, fat_pct: 8,
    safety_level: 'safe', safety_note: null,
  },
  '鸡骨肉': {
    category: 'protein', water_pct: 0.65,
    benefits: '含有天然骨胶原和钙质，支持关节和骨骼健康，蛋白质丰富。',
    calories_per_100g: 200, protein_pct: 20, fat_pct: 14,
    safety_level: 'safe', safety_note: null,
  },
  '鸡肝': {
    category: 'protein', water_pct: 0.70,
    benefits: '极富维生素A、B12、铁和铜，是天然的微量元素宝库，增强免疫力，促进造血。',
    calories_per_100g: 119, protein_pct: 18, fat_pct: 4,
    safety_level: 'safe', safety_note: null,
  },
  '鸡心': {
    category: 'protein', water_pct: 0.68,
    benefits: '富含牛磺酸（支持心脏健康）和辅酶Q10，含有天然肌酸，支持肌肉能量代谢。',
    calories_per_100g: 153, protein_pct: 15, fat_pct: 10,
    safety_level: 'safe', safety_note: null,
  },
  '火鸡肉': {
    category: 'protein', water_pct: 0.70,
    benefits: '极低脂肪的白肉蛋白，色氨酸含量高（支持神经健康），低敏感性，肠胃友好。',
    calories_per_100g: 135, protein_pct: 29, fat_pct: 1.5,
    safety_level: 'safe', safety_note: null,
  },
  '火鸡': {
    category: 'protein', water_pct: 0.70,
    benefits: '优质低脂白肉，低致敏性，适合食物过敏犬只，蛋白质含量高，脂肪极低。',
    calories_per_100g: 135, protein_pct: 29, fat_pct: 1.5,
    safety_level: 'safe', safety_note: null,
  },
  '牛肉': {
    category: 'protein', water_pct: 0.65,
    benefits: '高质量红肉蛋白，富含肌酸、锌、铁和B12，增强肌肉量和活力，适合高活跃犬只。',
    calories_per_100g: 213, protein_pct: 26, fat_pct: 12,
    safety_level: 'safe', safety_note: null,
  },
  '牛肝': {
    category: 'protein', water_pct: 0.68,
    benefits: '营养密度最高的食材之一，富含维生素A、D、K2、铜、铁，支持肝脏功能和造血。',
    calories_per_100g: 135, protein_pct: 20, fat_pct: 4,
    safety_level: 'safe', safety_note: null,
  },
  '三文鱼': {
    category: 'protein', water_pct: 0.68,
    benefits: '富含EPA和DHA（Omega-3脂肪酸），促进大脑发育、改善毛发光泽、抗炎，是美毛明星食材。',
    calories_per_100g: 208, protein_pct: 20, fat_pct: 13,
    safety_level: 'safe', safety_note: null,
  },
  '白鱼': {
    category: 'protein', water_pct: 0.78,
    benefits: '低脂肪高蛋白的鱼类，低过敏性，适合食物敏感犬只，含有Omega-3和碘。',
    calories_per_100g: 90, protein_pct: 19, fat_pct: 1,
    safety_level: 'safe', safety_note: null,
  },
  '鸭肉': {
    category: 'protein', water_pct: 0.66,
    benefits: '低致敏性的红肉，适合对鸡肉过敏的犬只，含有铁和锌，支持免疫功能。',
    calories_per_100g: 200, protein_pct: 19, fat_pct: 11,
    safety_level: 'safe', safety_note: null,
  },
  '羊肉': {
    category: 'protein', water_pct: 0.64,
    benefits: '低致敏性蛋白，含有共轭亚油酸（CLA），支持肌肉发育和体脂管理，适合低敏食谱。',
    calories_per_100g: 250, protein_pct: 25, fat_pct: 17,
    safety_level: 'safe', safety_note: null,
  },
  '鹿肉': {
    category: 'protein', water_pct: 0.72,
    benefits: '最低致敏性的肉类之一，极低脂肪，富含B族维生素，是低敏食谱的理想选择。',
    calories_per_100g: 158, protein_pct: 30, fat_pct: 3,
    safety_level: 'safe', safety_note: null,
  },
  '鸡蛋': {
    category: 'protein', water_pct: 0.75,
    benefits: '完整的氨基酸谱，生物利用率最高的蛋白质，含有叶黄素（眼部健康），卵磷脂（脑部）。',
    calories_per_100g: 155, protein_pct: 13, fat_pct: 11,
    safety_level: 'safe', safety_note: null,
  },

  '鸡小胸': {
    category: 'protein', water_pct: 0.74,
    benefits: '肉质鲜嫩易消化，高蛋白质、极低脂肪，适合生长期和体重控制。',
    calories_per_100g: 110, protein_pct: 22, fat_pct: 1.5,
    safety_level: 'safe', safety_note: null,
  },
  '鸭小胸': {
    category: 'protein', water_pct: 0.72,
    benefits: '低致敏性优质禽肉，降火温和，富含B族维生素和铁元素，提供皮毛与免疫支持。',
    calories_per_100g: 120, protein_pct: 21, fat_pct: 2.5,
    safety_level: 'safe', safety_note: null,
  },
  '兔里脊': {
    category: 'protein', water_pct: 0.72,
    benefits: '极低脂肪、极低致敏性高蛋白白肉，易于消化，非常适合低敏排敏与体重管理。',
    calories_per_100g: 115, protein_pct: 22, fat_pct: 2,
    safety_level: 'safe', safety_note: null,
  },
  '金枪鱼白肉': {
    category: 'protein', water_pct: 0.74,
    benefits: '极低脂高蛋白，富含牛磺酸、EPA和DHA，支持心脏健康和认知发育。',
    calories_per_100g: 105, protein_pct: 24, fat_pct: 0.6,
    safety_level: 'safe', safety_note: null,
  },
  '牛心': {
    category: 'protein', water_pct: 0.70,
    benefits: '富含天然辅酶Q10、牛磺酸和铁，支持心肌健康，提供充足活力和耐力。',
    calories_per_100g: 130, protein_pct: 17, fat_pct: 6,
    safety_level: 'safe', safety_note: null,
  },

  // ===== 碳水/主食类 =====
  '红薯': {
    category: 'carb', water_pct: 0.78,
    benefits: '低GI缓释碳水，富含β-胡萝卜素（抗氧化）和维生素C，膳食纤维帮助消化，能量持久稳定。',
    calories_per_100g: 86, carb_pct: 20, fiber_pct: 3,
    safety_level: 'safe', safety_note: null,
  },
  '山药丁': {
    category: 'carb', water_pct: 0.75,
    benefits: '健脾养胃易吸收，黏液多糖保护胃黏膜，低升糖碳水，适合消化道敏感个体。',
    calories_per_100g: 63, carb_pct: 14, fiber_pct: 1.7,
    safety_level: 'safe', safety_note: null,
  },
  '全熟燕麦片': {
    category: 'carb', water_pct: 0.08,
    benefits: '优质熟化粗粮，水溶性膳食纤维丰富，保护肠道，平稳血糖，提供饱腹感。',
    calories_per_100g: 367, carb_pct: 68, fiber_pct: 9,
    safety_level: 'safe', safety_note: null,
  },
  '南瓜': {
    category: 'carb', water_pct: 0.92,
    benefits: '极高水分，低热量，富含β-胡萝卜素和膳食纤维，调节肠道菌群，是消化友好的首选食材。',
    calories_per_100g: 26, carb_pct: 7, fiber_pct: 0.5,
    safety_level: 'safe', safety_note: null,
  },
  '燕麦': {
    category: 'carb', water_pct: 0.08,
    benefits: '优质全谷物，富含可溶性膳食纤维（β-葡聚糖），稳定血糖，支持肠道健康，含有硅（皮毛健康）。',
    calories_per_100g: 389, carb_pct: 67, fiber_pct: 10,
    safety_level: 'safe', safety_note: null,
  },
  '糙米': {
    category: 'carb', water_pct: 0.12,
    benefits: '含有更多维生素B族和矿物质的全谷物，低GI，支持稳定能量供应，适合成年犬。',
    calories_per_100g: 355, carb_pct: 77, fiber_pct: 3.5,
    safety_level: 'safe', safety_note: null,
  },
  '米饭': {
    category: 'carb', water_pct: 0.68,
    benefits: '易消化的温和碳水，适合肠胃敏感或术后恢复的犬只，提供快速能量，低纤维负担。',
    calories_per_100g: 130, carb_pct: 28, fiber_pct: 0.4,
    safety_level: 'safe', safety_note: null,
  },
  '土豆': {
    category: 'carb', water_pct: 0.79,
    benefits: '天然淀粉来源，含有钾（心脏和肌肉健康），维生素B6（蛋白质代谢），煮熟后易消化。',
    calories_per_100g: 77, carb_pct: 17, fiber_pct: 2.2,
    safety_level: 'safe', safety_note: null,
  },
  '藜麦': {
    category: 'carb', water_pct: 0.72,
    benefits: '完整氨基酸的植物蛋白，含有铁、镁、锌，高膳食纤维，免疫增强，是功能性超级食材。',
    calories_per_100g: 120, carb_pct: 22, fiber_pct: 2.8,
    safety_level: 'safe', safety_note: null,
  },
  '山药': {
    category: 'carb', water_pct: 0.75,
    benefits: '易消化的温和碳水，含有消化酶帮助吸收，黏液素保护肠胃黏膜，适合胃肠敏感犬只。',
    calories_per_100g: 63, carb_pct: 14, fiber_pct: 1.7,
    safety_level: 'safe', safety_note: null,
  },

  // ===== 蔬菜类 =====
  '胡萝卜': {
    category: 'veg', water_pct: 0.88,
    benefits: '富含β-胡萝卜素（转化为维生素A，保护视力和皮肤），天然甜味，膳食纤维促进肠蠕动。',
    calories_per_100g: 41, carb_pct: 10,
    safety_level: 'safe', safety_note: null,
  },
  '西兰花': {
    category: 'veg', water_pct: 0.89,
    benefits: '十字花科超级食材，含有硫代葡萄糖苷（抗癌），维生素C、K，叶酸，抗炎功效显著。',
    calories_per_100g: 34, carb_pct: 7,
    safety_level: 'safe', safety_note: null,
  },
  '菠菜': {
    category: 'veg', water_pct: 0.91,
    benefits: '富含铁、叶酸、维生素K和镁，含有叶黄素和玉米黄质（眼部保健），抗氧化能力强。',
    calories_per_100g: 23, carb_pct: 3.6,
    safety_level: 'caution', safety_note: '草酸含量高，大量食用可能影响钙吸收',
  },
  '青豆': {
    category: 'veg', water_pct: 0.79,
    benefits: '植物蛋白和膳食纤维的良好来源，含有维生素K（骨骼健康），低热量，适合体重管理。',
    calories_per_100g: 81, carb_pct: 14, protein_pct: 5,
    safety_level: 'safe', safety_note: null,
  },
  '西葫芦': {
    category: 'veg', water_pct: 0.94,
    benefits: '水分含量极高，低热量，含有维生素C和钾，消化轻负担，适合老年犬和需要控制热量的犬只。',
    calories_per_100g: 17, carb_pct: 3.1,
    safety_level: 'safe', safety_note: null,
  },
  '冬瓜丁': {
    category: 'veg', water_pct: 0.96,
    benefits: '水分含量极高，清热利尿，热量极低，有助于老年犬及肥胖犬体重管理。',
    calories_per_100g: 12, carb_pct: 2,
    safety_level: 'safe', safety_note: null,
  },
  '苹果': {
    category: 'veg', water_pct: 0.86,
    benefits: '含有槲皮素（强效抗炎抗氧化），果胶（益生元），维生素C，天然甜味提升适口性（去核）。',
    calories_per_100g: 52, carb_pct: 14,
    safety_level: 'safe', safety_note: null,
  },
  '蓝莓': {
    category: 'veg', water_pct: 0.84,
    benefits: '花青素含量冠绝水果，强效抗氧化，保护认知功能，抗炎，保护眼部视力，是超级水果。',
    calories_per_100g: 57, carb_pct: 14,
    safety_level: 'safe', safety_note: null,
  },

  // ===== 添加剂/营养素类 =====
  '鱼油': {
    category: 'addition', water_pct: 0.00,
    benefits: 'EPA和DHA的高度浓缩来源，促进大脑发育、减少炎症、改善毛发光泽和皮肤健康，心脏保护。',
    calories_per_100g: 900, fat_pct: 100,
    safety_level: 'safe', safety_note: null,
  },
  '三文鱼油': {
    category: 'addition', water_pct: 0.00,
    benefits: '三文鱼来源的EPA和DHA浓缩油脂，用于补充必需脂肪酸；用量应按产品标注或专业建议确认。',
    calories_per_100g: 900, fat_pct: 100,
    safety_level: 'safe', safety_note: null,
  },
  '亚麻籽油': {
    category: 'addition', water_pct: 0.00,
    benefits: '植物性Omega-3（ALA）来源，抗炎，皮肤保湿，适合不耐受鱼类犬只的Omega-3补充。',
    calories_per_100g: 884,
    safety_level: 'safe', safety_note: null,
  },
  '橄榄油': {
    category: 'addition', water_pct: 0.00,
    benefits: '单不饱和脂肪酸（油酸）来源，抗炎，促进脂溶性维生素吸收，维护皮肤和毛发健康。',
    calories_per_100g: 884,
    safety_level: 'safe', safety_note: null,
  },
  '钙粉': {
    category: 'addition', water_pct: 0.00,
    benefits: '骨骼和牙齿的核心矿物质，支持神经传导和肌肉收缩，幼犬和老年犬尤其重要。',
    calories_per_100g: 0,
    safety_level: 'safe', safety_note: null,
  },
  '蛋壳粉': {
    category: 'addition', water_pct: 0.00,
    benefits: '天然碳酸钙来源，生物利用率高，含有骨胶原蛋白的天然共生矩阵，关节和骨骼双重保护。',
    calories_per_100g: 0,
    safety_level: 'safe', safety_note: null,
  },
  '葡萄糖胺': {
    category: 'addition', water_pct: 0.00,
    benefits: '软骨基质的关键构成成分，修复和保护关节软骨，减少关节炎疼痛，适合中老年犬和大型犬。',
    calories_per_100g: 0,
    safety_level: 'safe', safety_note: null,
  },
  '姜黄': {
    category: 'addition', water_pct: 0.10,
    benefits: '姜黄素是强效天然抗炎剂，保护肝脏（促进胆汁分泌），抗氧化，支持消化功能。',
    calories_per_100g: 354,
    safety_level: 'safe', safety_note: null,
  },

  // ===== 毒性食材（严禁喂食）=====
  '葡萄': {
    category: 'toxic', water_pct: 0.81,
    benefits: '⚠️ 危险：对狗有剧毒，可导致急性肾功能衰竭',
    calories_per_100g: 69, carb_pct: 18,
    safety_level: 'toxic', safety_note: '对狗有剧毒，可导致急性肾功能衰竭',
  },
  '洋葱': {
    category: 'toxic', water_pct: 0.89,
    benefits: '⚠️ 危险：含有硫代硫酸盐，可导致溶血性贫血',
    calories_per_100g: 40, carb_pct: 9,
    safety_level: 'toxic', safety_note: '含有硫代硫酸盐，可导致溶血性贫血',
  },
  '大蒜': {
    category: 'toxic', water_pct: 0.59,
    benefits: '⚠️ 危险：含有硫代硫酸盐，可导致溶血性贫血',
    calories_per_100g: 149, carb_pct: 33,
    safety_level: 'toxic', safety_note: '含有硫代硫酸盐，可导致溶血性贫血',
  },
  '巧克力': {
    category: 'toxic', water_pct: 0.01,
    benefits: '⚠️ 危险：含有可可碱，可导致中毒',
    calories_per_100g: 546, carb_pct: 61, fat_pct: 31,
    safety_level: 'toxic', safety_note: '含有可可碱，可导致中毒',
  },
  '夏威夷果': {
    category: 'toxic', water_pct: 0.02,
    benefits: '⚠️ 危险：含有未知神经毒素，可导致肌肉震颤和虚弱',
    calories_per_100g: 718, fat_pct: 76,
    safety_level: 'toxic', safety_note: '含有未知神经毒素，可导致肌肉震颤和虚弱',
  },
  '澳洲坚果': {
    category: 'toxic', water_pct: 0.02,
    benefits: '⚠️ 危险：含有未知神经毒素，可导致肌肉震颤和虚弱',
    calories_per_100g: 718, fat_pct: 76,
    safety_level: 'toxic', safety_note: '含有未知神经毒素，可导致肌肉震颤和虚弱',
  },
  '木糖醇': {
    category: 'toxic', water_pct: 0.01,
    benefits: '⚠️ 危险：可导致急性低血糖和肝功能衰竭',
    calories_per_100g: 240,
    safety_level: 'toxic', safety_note: '可导致急性低血糖和肝功能衰竭',
  },

  // ===== 警示食材（需谨慎喂食）=====
  '牛油果': {
    category: 'caution', water_pct: 0.73,
    benefits: '含有persin，大量食用有风险，建议少量且去核去皮',
    calories_per_100g: 160, fat_pct: 15,
    safety_level: 'caution', safety_note: '含有persin，大量食用有风险，建议少量且去核去皮',
  },
  '生鸡蛋': {
    category: 'caution', water_pct: 0.75,
    benefits: '生蛋白含avidin可能影响生物素吸收，建议煮熟后喂食',
    calories_per_100g: 155, protein_pct: 13, fat_pct: 11,
    safety_level: 'caution', safety_note: '生蛋白含avidin可能影响生物素吸收，建议煮熟后喂食',
  },
  '生三文鱼': {
    category: 'caution', water_pct: 0.68,
    benefits: '可能含有寄生虫，建议煮熟后喂食',
    calories_per_100g: 208, protein_pct: 20, fat_pct: 13,
    safety_level: 'caution', safety_note: '可能含有寄生虫，建议煮熟后喂食',
  },
};

module.exports = { ingredientsDb };
