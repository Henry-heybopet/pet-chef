// recipes_db.js — 增强版食谱数据库
// 基于40条原始食谱经过 A+B+C 营养合规审计刷新
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

// 本地图片映射（食谱名 -> 本地路径）
const imgMap = {
  "鸡肉轻盈餐": "/鸡肉轻盈餐.png",
  "鸡肉燕麦经典": "/鸡肉燕麦经典.png",
  "金枪鱼均衡餐": "/金枪鱼均衡餐.png",
  "牛肉能量餐": "/牛肉能量餐.png",
  "兔肉低脂餐": "/兔肉低脂餐.png",
  "护关节低脂": "/护关节低脂.png",
  "鸡肉高纤": "/鸡肉高纤.png",
  "金枪鱼护心": "/金枪鱼护心.png",
  "牛肉补能": "/牛肉补能.png",
  "易消化温和": "/易消化温和.png",
  "金枪鱼单一低敏": "/金枪鱼单一低敏.png",
  "兔肉菠菜单一低敏": "/兔肉菠菜单一低敏.png",
  "兔肉红薯单一低敏": "/兔肉红薯单一低敏.png",
  "鸭肉胡萝卜单一低敏": "/鸭肉胡萝卜单一低敏.png",
  "鸭肉南瓜单一低敏": "/鸭肉南瓜单一低敏.png",
  "鸡肉姜黄": "/鸡肉姜黄.png",
  "鸡肉南瓜": "/鸡肉南瓜.png",
  "金枪鱼抗氧": "/金枪鱼抗氧.png",
  "牛肉轻负担": "/牛肉轻负担.png",
  "兔肉低脂": "/兔肉低脂.png",
  "鸡肉美毛": "/鸡肉美毛.png",
  "金枪鱼抗炎": "/金枪鱼抗炎.png",
  "金枪鱼亮毛": "/金枪鱼亮毛.png",
  "牛肉护肤": "/牛肉护肤.png",
  "兔肉抗敏": "/兔肉抗敏.png",
  "鸡肉蔬菜成长": "/鸡肉蔬菜成长.png",
  "鸡肉稳生长": "/鸡肉稳生长.png",
  "金枪鱼缓生长": "/金枪鱼缓生长.png",
  "牛肉控制成长": "/牛肉控制成长.png",
  "兔肉低钙成长": "/兔肉低钙成长.png",
  "鸡肉藜麦均衡": "/鸡肉藜麦均衡.png",
  "鸡肉藜麦免疫餐": "/鸡肉藜麦免疫餐.png",
  "鸡肉苹果成长餐": "/鸡肉苹果成长餐.png",
  "鸡肉土豆成长": "/鸡肉土豆成长.png",
  "金枪鱼南瓜脑发育": "/金枪鱼南瓜脑发育.png",
  "金枪鱼燕麦成长": "/金枪鱼燕麦成长.png",
  "牛肉高蛋白成长": "/牛肉高蛋白成长.png",
  "牛肉红薯活力餐": "/牛肉红薯活力餐.png",
  "兔肉南瓜肠胃餐": "/兔肉南瓜肠胃餐.png",
  "鸭肉红薯成长": "/鸭肉红薯成长.png"
};

const rawRecipes = [
  {
    "id": "dog_recipe_001",
    "category": "成犬通用",
    "category_code": 4,
    "category_type": "life_stage_size",
    "life_stage": "成年犬",
    "dog_size": null,
    "name": "鸡肉轻盈餐",
    "tags": [
      "轻盈"
    ],
    "ingredients": {
      "鸡小胸": 34.6,
      "南瓜": 19.8,
      "冬瓜丁": 14.8,
      "全熟燕麦片": 14.8,
      "菠菜": 7.9,
      "蓝莓": 4.1
    },
    "b_pack": "成犬维护营养包B：成犬维矿预混料 1.7 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）1.0 / Omega-3鱼油或藻油 1.3",
    "c_pack": "无"
  },
  {
    "id": "dog_recipe_002",
    "category": "成犬通用",
    "category_code": 4,
    "category_type": "life_stage_size",
    "life_stage": "成年犬",
    "dog_size": null,
    "name": "鸡肉燕麦经典",
    "tags": [
      "经典"
    ],
    "ingredients": {
      "鸡小胸": 35.4,
      "全熟燕麦片": 25.3,
      "胡萝卜": 10.1,
      "西兰花": 10.1,
      "菠菜": 10.1,
      "苹果": 5.0
    },
    "b_pack": "成犬维护营养包B：成犬维矿预混料 1.7 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）1.0 / Omega-3鱼油或藻油 1.3",
    "c_pack": "无"
  },
  {
    "id": "dog_recipe_003",
    "category": "成犬通用",
    "category_code": 4,
    "category_type": "life_stage_size",
    "life_stage": "成年犬",
    "dog_size": null,
    "name": "金枪鱼均衡餐",
    "tags": [
      "均衡"
    ],
    "ingredients": {
      "金枪鱼白肉": 30.3,
      "红薯": 20.2,
      "菠菜": 15.2,
      "全熟燕麦片": 15.2,
      "西兰花": 10.1,
      "蓝莓": 5.0
    },
    "b_pack": "成犬维护营养包B：成犬维矿预混料 1.7 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）1.0 / Omega-3鱼油或藻油 1.3",
    "c_pack": "无"
  },
  {
    "id": "dog_recipe_004",
    "category": "成犬通用",
    "category_code": 4,
    "category_type": "life_stage_size",
    "life_stage": "成年犬",
    "dog_size": null,
    "name": "牛肉能量餐",
    "tags": [
      "能量"
    ],
    "ingredients": {
      "牛肉": 29.4,
      "牛心": 6.0,
      "红薯": 20.2,
      "胡萝卜": 10.1,
      "西兰花": 10.1,
      "全熟燕麦片": 15.2,
      "苹果": 5.0
    },
    "b_pack": "成犬维护营养包B：成犬维矿预混料 1.7 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）1.0 / Omega-3鱼油或藻油 1.3",
    "c_pack": "无"
  },
  {
    "id": "dog_recipe_005",
    "category": "成犬通用",
    "category_code": 4,
    "category_type": "life_stage_size",
    "life_stage": "成年犬",
    "dog_size": null,
    "name": "兔肉低脂餐",
    "tags": [
      "低脂"
    ],
    "ingredients": {
      "兔里脊": 34.6,
      "南瓜": 19.8,
      "西兰花": 14.8,
      "全熟燕麦片": 14.8,
      "胡萝卜": 9.9,
      "蓝莓": 2.1
    },
    "b_pack": "成犬维护营养包B：成犬维矿预混料 1.7 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）1.0 / Omega-3鱼油或藻油 1.3",
    "c_pack": "无"
  },
  {
    "id": "dog_recipe_006",
    "category": "老年犬通用",
    "category_code": 7,
    "category_type": "life_stage_size",
    "life_stage": "老年犬",
    "dog_size": null,
    "name": "护关节低脂",
    "tags": [
      "护关节",
      "低脂"
    ],
    "ingredients": {
      "鸡小胸": 29.2,
      "南瓜": 19.5,
      "冬瓜丁": 14.6,
      "全熟燕麦片": 14.6,
      "胡萝卜": 9.7,
      "蓝莓": 6.9
    },
    "b_pack": "老年犬轻负担营养包B：老年犬维矿预混料（抗氧化支持）1.9 / 低磷钙源或钙磷维护矿物粉 0.8 / EPA-DHA鱼油或藻油 1.3",
    "c_pack": "关节支持功能包C：葡萄糖胺/软骨素/MSM/透明质酸 1.5"
  },
  {
    "id": "dog_recipe_007",
    "category": "老年犬通用",
    "category_code": 7,
    "category_type": "life_stage_size",
    "life_stage": "老年犬",
    "dog_size": null,
    "name": "鸡肉高纤",
    "tags": [
      "高纤"
    ],
    "ingredients": {
      "鸡小胸": 29.7,
      "南瓜": 24.7,
      "西兰花": 19.8,
      "全熟燕麦片": 9.9,
      "胡萝卜": 9.9,
      "蓝莓": 2.0
    },
    "b_pack": "老年犬轻负担营养包B：老年犬维矿预混料（抗氧化支持）1.9 / 低磷钙源或钙磷维护矿物粉 0.8 / EPA-DHA鱼油或藻油 1.3",
    "c_pack": "无"
  },
  {
    "id": "dog_recipe_008",
    "category": "老年犬通用",
    "category_code": 7,
    "category_type": "life_stage_size",
    "life_stage": "老年犬",
    "dog_size": null,
    "name": "金枪鱼护心",
    "tags": [
      "护心"
    ],
    "ingredients": {
      "金枪鱼白肉": 30.0,
      "红薯": 20.0,
      "菠菜": 20.0,
      "全熟燕麦片": 15.0,
      "蓝莓": 10.0
    },
    "b_pack": "老年犬轻负担营养包B：老年犬维矿预混料（抗氧化支持）1.9 / 低磷钙源或钙磷维护矿物粉 0.8 / EPA-DHA鱼油或藻油 1.3",
    "c_pack": "心脏健康支持功能包C：牛磺酸/L-肉碱/辅酶Q10 1.0"
  },
  {
    "id": "dog_recipe_009",
    "category": "老年犬通用",
    "category_code": 7,
    "category_type": "life_stage_size",
    "life_stage": "老年犬",
    "dog_size": null,
    "name": "牛肉补能",
    "tags": [
      "补能"
    ],
    "ingredients": {
      "牛肉": 24.3,
      "牛心": 6.0,
      "红薯": 25.3,
      "胡萝卜": 15.2,
      "西兰花": 10.1,
      "全熟燕麦片": 10.1,
      "蓝莓": 5.0
    },
    "b_pack": "老年犬轻负担营养包B：老年犬维矿预混料（抗氧化支持）1.9 / 低磷钙源或钙磷维护矿物粉 0.8 / EPA-DHA鱼油或藻油 1.3",
    "c_pack": "无"
  },
  {
    "id": "dog_recipe_010",
    "category": "老年犬通用",
    "category_code": 7,
    "category_type": "life_stage_size",
    "life_stage": "老年犬",
    "dog_size": null,
    "name": "易消化温和",
    "tags": [
      "温和",
      "易消化"
    ],
    "ingredients": {
      "兔里脊": 30.3,
      "红薯": 25.3,
      "南瓜": 20.2,
      "菠菜": 10.1,
      "全熟燕麦片": 10.1
    },
    "b_pack": "老年犬轻负担营养包B：老年犬维矿预混料（抗氧化支持）1.9 / 低磷钙源或钙磷维护矿物粉 0.8 / EPA-DHA鱼油或藻油 1.3",
    "c_pack": "无"
  },
  {
    "id": "dog_recipe_011",
    "category": "低敏单一蛋白",
    "category_code": 14,
    "category_type": "functional",
    "life_stage": null,
    "dog_size": null,
    "name": "金枪鱼单一低敏",
    "tags": [
      "低敏"
    ],
    "ingredients": {
      "金枪鱼白肉": 45.0,
      "红薯": 25.0,
      "冬瓜丁": 15.0,
      "全熟燕麦片": 10.0
    },
    "b_pack": "低敏单一蛋白营养包B：低敏维矿预混料 2.0 / 低敏钙源矿物粉（不含动物蛋白载体）1.2 / 藻油或高度精炼低敏油脂 0.8",
    "c_pack": "肠胃健康支持功能包C（低敏版）：FOS/MOS益生元/后生元/低敏载体 1.0"
  },
  {
    "id": "dog_recipe_012",
    "category": "低敏单一蛋白",
    "category_code": 14,
    "category_type": "functional",
    "life_stage": null,
    "dog_size": null,
    "name": "兔肉菠菜单一低敏",
    "tags": [
      "低敏"
    ],
    "ingredients": {
      "兔里脊": 45.0,
      "红薯": 25.0,
      "菠菜": 15.0,
      "全熟燕麦片": 10.0
    },
    "b_pack": "低敏单一蛋白营养包B：低敏维矿预混料 2.0 / 低敏钙源矿物粉（不含动物蛋白载体）1.2 / 藻油或高度精炼低敏油脂 0.8",
    "c_pack": "肠胃健康支持功能包C（低敏版）：FOS/MOS益生元/后生元/低敏载体 1.0"
  },
  {
    "id": "dog_recipe_013",
    "category": "低敏单一蛋白",
    "category_code": 14,
    "category_type": "functional",
    "life_stage": null,
    "dog_size": null,
    "name": "兔肉红薯单一低敏",
    "tags": [
      "单一蛋白",
      "低敏"
    ],
    "ingredients": {
      "兔里脊": 49.0,
      "红薯": 24.5,
      "冬瓜丁": 14.7,
      "蓝莓": 6.8
    },
    "b_pack": "低敏单一蛋白营养包B：低敏维矿预混料 2.0 / 低敏钙源矿物粉（不含动物蛋白载体）1.2 / 藻油或高度精炼低敏油脂 0.8",
    "c_pack": "肠胃健康支持功能包C（低敏版）：FOS/MOS益生元/后生元/低敏载体 1.0"
  },
  {
    "id": "dog_recipe_014",
    "category": "低敏单一蛋白",
    "category_code": 14,
    "category_type": "functional",
    "life_stage": null,
    "dog_size": null,
    "name": "鸭肉胡萝卜单一低敏",
    "tags": [
      "低敏"
    ],
    "ingredients": {
      "鸭小胸": 45.0,
      "南瓜": 25.0,
      "胡萝卜": 15.0,
      "全熟燕麦片": 10.0
    },
    "b_pack": "低敏单一蛋白营养包B：低敏维矿预混料 2.0 / 低敏钙源矿物粉（不含动物蛋白载体）1.2 / 藻油或高度精炼低敏油脂 0.8",
    "c_pack": "肠胃健康支持功能包C（低敏版）：FOS/MOS益生元/后生元/低敏载体 1.0"
  },
  {
    "id": "dog_recipe_015",
    "category": "低敏单一蛋白",
    "category_code": 14,
    "category_type": "functional",
    "life_stage": null,
    "dog_size": null,
    "name": "鸭肉南瓜单一低敏",
    "tags": [
      "低敏"
    ],
    "ingredients": {
      "鸭小胸": 45.0,
      "南瓜": 25.0,
      "冬瓜丁": 15.0,
      "全熟燕麦片": 10.0
    },
    "b_pack": "低敏单一蛋白营养包B：低敏维矿预混料 2.0 / 低敏钙源矿物粉（不含动物蛋白载体）1.2 / 藻油或高度精炼低敏油脂 0.8",
    "c_pack": "肠胃健康支持功能包C（低敏版）：FOS/MOS益生元/后生元/低敏载体 1.0"
  },
  {
    "id": "dog_recipe_016",
    "category": "护肝",
    "category_code": 11,
    "category_type": "functional",
    "life_stage": null,
    "dog_size": null,
    "name": "鸡肉姜黄",
    "tags": [
      "护肝"
    ],
    "ingredients": {
      "鸡小胸": 36.6,
      "南瓜": 26.1,
      "胡萝卜": 15.7,
      "全熟燕麦片": 15.6
    },
    "b_pack": "成犬/护肝基础营养包B：成犬维矿预混料 1.8 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）1.0 / Omega-3鱼油或藻油 1.2",
    "c_pack": "护肝支持功能包C：水飞蓟素/胆碱/牛磺酸/姜黄素 2.0"
  },
  {
    "id": "dog_recipe_017",
    "category": "护肝",
    "category_code": 11,
    "category_type": "functional",
    "life_stage": null,
    "dog_size": null,
    "name": "鸡肉南瓜",
    "tags": [
      "护肝"
    ],
    "ingredients": {
      "鸡小胸": 33.9,
      "南瓜": 24.2,
      "胡萝卜": 9.7,
      "全熟燕麦片": 14.5,
      "西兰花": 9.7,
      "蓝莓": 2.0
    },
    "b_pack": "成犬/护肝基础营养包B：成犬维矿预混料 1.8 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）1.0 / Omega-3鱼油或藻油 1.2",
    "c_pack": "护肝支持功能包C：水飞蓟素/胆碱/牛磺酸 2.0"
  },
  {
    "id": "dog_recipe_018",
    "category": "护肝",
    "category_code": 11,
    "category_type": "functional",
    "life_stage": null,
    "dog_size": null,
    "name": "金枪鱼抗氧",
    "tags": [
      "抗氧",
      "护肝"
    ],
    "ingredients": {
      "金枪鱼白肉": 29.7,
      "南瓜": 19.8,
      "菠菜": 19.8,
      "全熟燕麦片": 14.8,
      "蓝莓": 9.9
    },
    "b_pack": "成犬/护肝基础营养包B：成犬维矿预混料 1.8 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）1.0 / Omega-3鱼油或藻油 1.2",
    "c_pack": "护肝支持功能包C：水飞蓟素/胆碱/牛磺酸 2.0"
  },
  {
    "id": "dog_recipe_019",
    "category": "护肝",
    "category_code": 11,
    "category_type": "functional",
    "life_stage": null,
    "dog_size": null,
    "name": "牛肉轻负担",
    "tags": [
      "轻负担",
      "护肝"
    ],
    "ingredients": {
      "牛肉": 29.7,
      "南瓜": 24.7,
      "西兰花": 14.8,
      "全熟燕麦片": 14.8,
      "蓝莓": 10.0
    },
    "b_pack": "成犬/护肝基础营养包B：成犬维矿预混料 1.8 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）1.0 / Omega-3鱼油或藻油 1.2",
    "c_pack": "护肝支持功能包C：水飞蓟素/胆碱/牛磺酸 2.0"
  },
  {
    "id": "dog_recipe_020",
    "category": "护肝",
    "category_code": 11,
    "category_type": "functional",
    "life_stage": null,
    "dog_size": null,
    "name": "兔肉低脂",
    "tags": [
      "低脂",
      "护肝"
    ],
    "ingredients": {
      "兔里脊": 34.6,
      "南瓜": 24.7,
      "菠菜": 14.8,
      "全熟燕麦片": 14.8,
      "蓝莓": 5.1
    },
    "b_pack": "成犬/护肝基础营养包B：成犬维矿预混料 1.8 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）1.0 / Omega-3鱼油或藻油 1.2",
    "c_pack": "护肝支持功能包C：水飞蓟素/胆碱/牛磺酸 2.0"
  },
  {
    "id": "dog_recipe_021",
    "category": "美毛护肤",
    "category_code": 10,
    "category_type": "functional",
    "life_stage": null,
    "dog_size": null,
    "name": "鸡肉美毛",
    "tags": [
      "美毛"
    ],
    "ingredients": {
      "鸡小胸": 34.6,
      "南瓜": 19.8,
      "菠菜": 14.8,
      "全熟燕麦片": 14.8,
      "蓝莓": 10.0
    },
    "b_pack": "成犬/美毛基础营养包B：成犬维矿预混料 1.6 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）0.9 / Omega-3鱼油或藻油 1.5",
    "c_pack": "美毛护肤支持功能包C：卵磷脂/生物素/有机锌 2.0"
  },
  {
    "id": "dog_recipe_022",
    "category": "美毛护肤",
    "category_code": 10,
    "category_type": "functional",
    "life_stage": null,
    "dog_size": null,
    "name": "金枪鱼抗炎",
    "tags": [
      "抗炎",
      "美毛"
    ],
    "ingredients": {
      "金枪鱼白肉": 37.6,
      "红薯": 19.8,
      "菠菜": 14.8,
      "全熟燕麦片": 14.8,
      "蓝莓": 7.0
    },
    "b_pack": "成犬/美毛基础营养包B：成犬维矿预混料 1.6 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）0.9 / Omega-3鱼油或藻油 1.5",
    "c_pack": "抗炎免疫支持功能包C：酵母β-葡聚糖/天然维生素E/多酚或姜黄素 2.0"
  },
  {
    "id": "dog_recipe_023",
    "category": "美毛护肤",
    "category_code": 10,
    "category_type": "functional",
    "life_stage": null,
    "dog_size": null,
    "name": "金枪鱼亮毛",
    "tags": [
      "亮毛",
      "美毛"
    ],
    "ingredients": {
      "金枪鱼白肉": 43.2,
      "胡萝卜": 10.8,
      "蓝莓": 10.8,
      "全熟燕麦片": 16.2,
      "菠菜": 13.0
    },
    "b_pack": "成犬/美毛基础营养包B：成犬维矿预混料 1.6 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）0.9 / Omega-3鱼油或藻油 1.5",
    "c_pack": "美毛护肤支持功能包C：卵磷脂/生物素/有机锌 2.0"
  },
  {
    "id": "dog_recipe_024",
    "category": "美毛护肤",
    "category_code": 10,
    "category_type": "functional",
    "life_stage": null,
    "dog_size": null,
    "name": "牛肉护肤",
    "tags": [
      "护肤",
      "美毛"
    ],
    "ingredients": {
      "牛肉": 34.6,
      "红薯": 19.8,
      "胡萝卜": 14.8,
      "菠菜": 9.9,
      "全熟燕麦片": 14.9
    },
    "b_pack": "成犬/美毛基础营养包B：成犬维矿预混料 1.6 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）0.9 / Omega-3鱼油或藻油 1.5",
    "c_pack": "美毛护肤支持功能包C：卵磷脂/生物素/有机锌 2.0"
  },
  {
    "id": "dog_recipe_025",
    "category": "美毛护肤",
    "category_code": 10,
    "category_type": "functional",
    "life_stage": null,
    "dog_size": null,
    "name": "兔肉抗敏",
    "tags": [
      "抗敏",
      "美毛"
    ],
    "ingredients": {
      "兔里脊": 34.6,
      "南瓜": 19.8,
      "西兰花": 14.8,
      "全熟燕麦片": 14.8,
      "蓝莓": 10.0
    },
    "b_pack": "成犬/美毛基础营养包B：成犬维矿预混料 1.6 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）0.9 / Omega-3鱼油或藻油 1.5",
    "c_pack": "美毛护肤支持功能包C：卵磷脂/生物素/有机锌 2.0"
  },
  {
    "id": "dog_recipe_026",
    "category": "控钙幼犬（大型幼犬）",
    "category_code": 3,
    "category_type": "life_stage_size",
    "life_stage": "幼犬",
    "dog_size": "大型犬",
    "name": "鸡肉蔬菜成长",
    "tags": [
      "控钙"
    ],
    "ingredients": {
      "鸡小胸": 38.4,
      "南瓜": 20.2,
      "西兰花": 15.2,
      "胡萝卜": 10.1,
      "全熟燕麦片": 12.1
    },
    "b_pack": "大型幼犬稳骨控钙营养包B：大型幼犬低钙维矿预混料 1.8 / 控钙钙磷矿物粉（低钙，Ca:P≈1.2:1）0.9 / DHA-EPA鱼油或藻油 1.3",
    "c_pack": "无"
  },
  {
    "id": "dog_recipe_027",
    "category": "控钙幼犬（大型幼犬）",
    "category_code": 3,
    "category_type": "life_stage_size",
    "life_stage": "幼犬",
    "dog_size": "大型犬",
    "name": "鸡肉稳生长",
    "tags": [
      "控钙"
    ],
    "ingredients": {
      "鸡小胸": 39.6,
      "鸡心": 9.9,
      "红薯": 19.8,
      "冬瓜丁": 9.9,
      "胡萝卜": 9.9,
      "全熟燕麦片": 6.9
    },
    "b_pack": "大型幼犬稳骨控钙营养包B：大型幼犬低钙维矿预混料 1.8 / 控钙钙磷矿物粉（低钙，Ca:P≈1.2:1）0.9 / DHA-EPA鱼油或藻油 1.3",
    "c_pack": "无"
  },
  {
    "id": "dog_recipe_028",
    "category": "控钙幼犬（大型幼犬）",
    "category_code": 3,
    "category_type": "life_stage_size",
    "life_stage": "幼犬",
    "dog_size": "大型犬",
    "name": "金枪鱼缓生长",
    "tags": [
      "控钙"
    ],
    "ingredients": {
      "金枪鱼白肉": 35.4,
      "红薯": 20.2,
      "菠菜": 15.2,
      "全熟燕麦片": 15.2,
      "冬瓜丁": 10.0
    },
    "b_pack": "大型幼犬稳骨控钙营养包B：大型幼犬低钙维矿预混料 1.8 / 控钙钙磷矿物粉（低钙，Ca:P≈1.2:1）0.9 / DHA-EPA鱼油或藻油 1.3",
    "c_pack": "无"
  },
  {
    "id": "dog_recipe_029",
    "category": "控钙幼犬（大型幼犬）",
    "category_code": 3,
    "category_type": "life_stage_size",
    "life_stage": "幼犬",
    "dog_size": "大型犬",
    "name": "牛肉控制成长",
    "tags": [
      "控钙"
    ],
    "ingredients": {
      "牛肉": 35.4,
      "红薯": 20.2,
      "胡萝卜": 15.2,
      "西兰花": 10.1,
      "全熟燕麦片": 15.1
    },
    "b_pack": "大型幼犬稳骨控钙营养包B：大型幼犬低钙维矿预混料 1.8 / 控钙钙磷矿物粉（低钙，Ca:P≈1.2:1）0.9 / DHA-EPA鱼油或藻油 1.3",
    "c_pack": "无"
  },
  {
    "id": "dog_recipe_030",
    "category": "控钙幼犬（大型幼犬）",
    "category_code": 3,
    "category_type": "life_stage_size",
    "life_stage": "幼犬",
    "dog_size": "大型犬",
    "name": "兔肉低钙成长",
    "tags": [
      "控钙"
    ],
    "ingredients": {
      "兔里脊": 41.3,
      "南瓜": 20.6,
      "全熟燕麦片": 15.5,
      "西兰花": 10.3,
      "菠菜": 8.3
    },
    "b_pack": "大型幼犬稳骨控钙营养包B：大型幼犬低钙维矿预混料 1.8 / 控钙钙磷矿物粉（低钙，Ca:P≈1.2:1）0.9 / DHA-EPA鱼油或藻油 1.3",
    "c_pack": "无"
  },
  {
    "id": "dog_recipe_031",
    "category": "幼犬通用",
    "category_code": 1,
    "category_type": "life_stage_size",
    "life_stage": "幼犬",
    "dog_size": null,
    "name": "鸡肉藜麦均衡",
    "tags": [
      "均衡"
    ],
    "ingredients": {
      "鸡小胸": 35.4,
      "鸡心": 10.1,
      "全熟燕麦片": 20.2,
      "西兰花": 10.1,
      "红薯": 15.2,
      "蓝莓": 5.0
    },
    "b_pack": "幼犬成长营养包B：幼犬维矿预混料 1.6 / 成长期钙磷矿物粉（Ca:P≈1.3:1）1.4 / DHA-EPA鱼油或藻油 1.0",
    "c_pack": "无"
  },
  {
    "id": "dog_recipe_032",
    "category": "幼犬通用",
    "category_code": 1,
    "category_type": "life_stage_size",
    "life_stage": "幼犬",
    "dog_size": null,
    "name": "鸡肉藜麦免疫餐",
    "tags": [
      "免疫增强"
    ],
    "ingredients": {
      "鸡小胸": 35.0,
      "鸡心": 10.0,
      "全熟燕麦片": 20.0,
      "西兰花": 10.0,
      "红薯": 15.0,
      "蓝莓": 5.0
    },
    "b_pack": "幼犬成长营养包B：幼犬维矿预混料 1.6 / 成长期钙磷矿物粉（Ca:P≈1.3:1）1.4 / DHA-EPA鱼油或藻油 1.0",
    "c_pack": "抗炎免疫支持功能包C：酵母β-葡聚糖/可溶性膳食纤维/天然抗氧化物 1.0"
  },
  {
    "id": "dog_recipe_033",
    "category": "幼犬通用",
    "category_code": 1,
    "category_type": "life_stage_size",
    "life_stage": "幼犬",
    "dog_size": null,
    "name": "鸡肉苹果成长餐",
    "tags": [
      "成长",
      "易消化"
    ],
    "ingredients": {
      "鸡小胸": 31.0,
      "鸡肝": 9.7,
      "鸡心": 12.6,
      "苹果": 8.7,
      "全熟燕麦片": 3.9,
      "西兰花": 5.8,
      "红薯": 9.7,
      "南瓜": 8.7,
      "山药丁": 5.9
    },
    "b_pack": "幼犬成长营养包B：幼犬维矿预混料 1.6 / 成长期钙磷矿物粉（Ca:P≈1.3:1）1.4 / DHA-EPA鱼油或藻油 1.0",
    "c_pack": "无"
  },
  {
    "id": "dog_recipe_034",
    "category": "幼犬通用",
    "category_code": 1,
    "category_type": "life_stage_size",
    "life_stage": "幼犬",
    "dog_size": null,
    "name": "鸡肉土豆成长",
    "tags": [
      "成长"
    ],
    "ingredients": {
      "鸡小胸": 39.2,
      "红薯": 20.6,
      "胡萝卜": 10.3,
      "冬瓜丁": 10.3,
      "全熟燕麦片": 15.6
    },
    "b_pack": "幼犬成长营养包B：幼犬维矿预混料 1.6 / 成长期钙磷矿物粉（Ca:P≈1.3:1）1.4 / DHA-EPA鱼油或藻油 1.0",
    "c_pack": "无"
  },
  {
    "id": "dog_recipe_035",
    "category": "幼犬通用",
    "category_code": 1,
    "category_type": "life_stage_size",
    "life_stage": "幼犬",
    "dog_size": null,
    "name": "金枪鱼南瓜脑发育",
    "tags": [
      "DHA",
      "脑发育"
    ],
    "ingredients": {
      "金枪鱼白肉": 34.8,
      "鸡肝": 8.0,
      "全熟燕麦片": 14.9,
      "南瓜": 14.9,
      "胡萝卜": 9.9,
      "西兰花": 7.0,
      "蓝莓": 5.0
    },
    "b_pack": "幼犬成长营养包B：幼犬维矿预混料 1.6 / 成长期钙磷矿物粉（Ca:P≈1.3:1）1.4 / DHA-EPA鱼油或藻油 1.0",
    "c_pack": "脑发育支持功能包C：DHA藻油/牛磺酸/胆碱 1.5"
  },
  {
    "id": "dog_recipe_036",
    "category": "幼犬通用",
    "category_code": 1,
    "category_type": "life_stage_size",
    "life_stage": "幼犬",
    "dog_size": null,
    "name": "金枪鱼燕麦成长",
    "tags": [
      "成长"
    ],
    "ingredients": {
      "金枪鱼白肉": 37.3,
      "全熟燕麦片": 21.3,
      "南瓜": 16.0,
      "胡萝卜": 10.7,
      "菠菜": 10.7
    },
    "b_pack": "幼犬成长营养包B：幼犬维矿预混料 1.6 / 成长期钙磷矿物粉（Ca:P≈1.3:1）1.4 / DHA-EPA鱼油或藻油 1.0",
    "c_pack": "无"
  },
  {
    "id": "dog_recipe_037",
    "category": "幼犬通用",
    "category_code": 1,
    "category_type": "life_stage_size",
    "life_stage": "幼犬",
    "dog_size": null,
    "name": "牛肉高蛋白成长",
    "tags": [
      "成长"
    ],
    "ingredients": {
      "牛肉": 34.4,
      "牛心": 6.0,
      "牛肝": 8.1,
      "全熟燕麦片": 15.2,
      "南瓜": 15.2,
      "胡萝卜": 10.1,
      "菠菜": 7.0
    },
    "b_pack": "幼犬成长营养包B：幼犬维矿预混料 1.6 / 成长期钙磷矿物粉（Ca:P≈1.3:1）1.4 / DHA-EPA鱼油或藻油 1.0",
    "c_pack": "无"
  },
  {
    "id": "dog_recipe_038",
    "category": "幼犬通用",
    "category_code": 1,
    "category_type": "life_stage_size",
    "life_stage": "幼犬",
    "dog_size": null,
    "name": "牛肉红薯活力餐",
    "tags": [
      "高能量"
    ],
    "ingredients": {
      "牛肉": 30.4,
      "牛心": 5.0,
      "牛肝": 8.1,
      "红薯": 20.2,
      "胡萝卜": 10.1,
      "西兰花": 10.1,
      "全熟燕麦片": 10.1,
      "蓝莓": 2.0
    },
    "b_pack": "幼犬成长营养包B：幼犬维矿预混料 1.6 / 成长期钙磷矿物粉（Ca:P≈1.3:1）1.4 / DHA-EPA鱼油或藻油 1.0",
    "c_pack": "无"
  },
  {
    "id": "dog_recipe_039",
    "category": "幼犬通用",
    "category_code": 1,
    "category_type": "life_stage_size",
    "life_stage": "幼犬",
    "dog_size": null,
    "name": "兔肉南瓜肠胃餐",
    "tags": [
      "肠胃友好"
    ],
    "ingredients": {
      "兔里脊": 35.0,
      "南瓜": 20.0,
      "全熟燕麦片": 20.0,
      "胡萝卜": 10.0,
      "菠菜": 8.0,
      "苹果": 2.0
    },
    "b_pack": "幼犬成长营养包B：幼犬维矿预混料 1.6 / 成长期钙磷矿物粉（Ca:P≈1.3:1）1.4 / DHA-EPA鱼油或藻油 1.0",
    "c_pack": "肠胃健康支持功能包C：FOS/MOS益生元/益生菌或后生元/低敏载体 1.0"
  },
  {
    "id": "dog_recipe_040",
    "category": "幼犬通用",
    "category_code": 1,
    "category_type": "life_stage_size",
    "life_stage": "幼犬",
    "dog_size": null,
    "name": "鸭肉红薯成长",
    "tags": [
      "成长"
    ],
    "ingredients": {
      "鸭小胸": 40.4,
      "红薯": 20.2,
      "西兰花": 10.1,
      "胡萝卜": 10.1,
      "全熟燕麦片": 15.2
    },
    "b_pack": "幼犬成长营养包B：幼犬维矿预混料 1.6 / 成长期钙磷矿物粉（Ca:P≈1.3:1）1.4 / DHA-EPA鱼油或藻油 1.0",
    "c_pack": "无"
  }
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
