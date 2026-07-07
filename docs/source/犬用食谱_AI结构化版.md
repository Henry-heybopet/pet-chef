# 犬用食谱（AI 结构化版）

> 本文档将原始 Word 食谱整理为固定字段的 Markdown + YAML 结构，便于 AI、脚本、数据库或前端继续读取。

## 读取说明

- `quantity`：配料数字，按原文保留。原文未说明克数或百分比，因此统一视为“配比份”。
- `quantity_text`：原始数量文本；遇到“微量”等非数字时，`quantity = null`，原文保存在 `quantity_text`。
- `labels`：只保留原文明确写出的标签；没有标签的食谱使用空数组。
- `total_numeric_quantity`：仅统计数字型配料的合计，用于检查配比完整性。

## 分组索引

| category_code | category_name | category_type | note | recipe_count |
|---:|---|---|---|---:|
| 1 | 幼犬（小型犬） | life_stage_size |  | 5 |
| 2 | 幼犬（中型犬） | life_stage_size |  | 5 |
| 3 | 幼犬（大型犬） | life_stage_size | 控钙 | 5 |
| 4 | 成年犬（小型犬） | life_stage_size |  | 5 |
| 7 | 老年犬（小型犬） | life_stage_size |  | 5 |
| 10 | 美毛 | functional |  | 5 |
| 11 | 护肝 | functional |  | 5 |
| 14 | 低敏 | functional | 非常关键 | 5 |

## 食谱快速索引

| recipe_id | category | title | labels | total_numeric_quantity |
|---|---|---|---|---:|
| dog_recipe_001 | 幼犬（小型犬） | 鸡肉苹果成长餐 | 成长、易消化 | 99 |
| dog_recipe_002 | 幼犬（小型犬） | 三文鱼南瓜脑发育 | DHA、脑发育 | 100 |
| dog_recipe_003 | 幼犬（小型犬） | 鸡肉藜麦免疫餐 | 免疫增强 | 100 |
| dog_recipe_004 | 幼犬（小型犬） | 火鸡南瓜肠胃餐 | 肠胃友好 | 100 |
| dog_recipe_005 | 幼犬（小型犬） | 牛肉红薯活力餐 | 高能量 | 100 |
| dog_recipe_006 | 幼犬（中型犬） | 牛肉高蛋白成长 |  | 100 |
| dog_recipe_007 | 幼犬（中型犬） | 鸡肉藜麦均衡 |  | 100 |
| dog_recipe_008 | 幼犬（中型犬） | 三文鱼燕麦成长 |  | 100 |
| dog_recipe_009 | 幼犬（中型犬） | 火鸡红薯成长 |  | 100 |
| dog_recipe_010 | 幼犬（中型犬） | 鸡肉土豆成长 |  | 100 |
| dog_recipe_011 | 幼犬（大型犬） | 鸡肉稳生长 |  | 100 |
| dog_recipe_012 | 幼犬（大型犬） | 火鸡低钙成长 |  | 98 |
| dog_recipe_013 | 幼犬（大型犬） | 牛肉控制成长 |  | 100 |
| dog_recipe_014 | 幼犬（大型犬） | 鸡肉蔬菜成长 |  | 100 |
| dog_recipe_015 | 幼犬（大型犬） | 三文鱼缓生长 |  | 100 |
| dog_recipe_016 | 成年犬（小型犬） | 牛肉能量餐 |  | 100 |
| dog_recipe_017 | 成年犬（小型犬） | 鸡肉轻盈餐 |  | 100 |
| dog_recipe_018 | 成年犬（小型犬） | 火鸡低脂餐 |  | 100 |
| dog_recipe_019 | 成年犬（小型犬） | 三文鱼均衡餐 |  | 100 |
| dog_recipe_020 | 成年犬（小型犬） | 鸡肉米饭经典 |  | 100 |
| dog_recipe_021 | 老年犬（小型犬） | 护关节低脂 |  | 100 |
| dog_recipe_022 | 老年犬（小型犬） | 易消化温和 |  | 100 |
| dog_recipe_023 | 老年犬（小型犬） | 鸡肉高纤 |  | 100 |
| dog_recipe_024 | 老年犬（小型犬） | 鱼肉护心 |  | 100 |
| dog_recipe_025 | 老年犬（小型犬） | 牛肉补能 |  | 100 |
| dog_recipe_026 | 美毛 | 三文鱼亮毛 |  | 100 |
| dog_recipe_027 | 美毛 | 鸡肉亚麻油 |  | 100 |
| dog_recipe_028 | 美毛 | 牛肉护肤 |  | 100 |
| dog_recipe_029 | 美毛 | 火鸡抗敏 |  | 100 |
| dog_recipe_030 | 美毛 | 鱼肉抗炎 |  | 100 |
| dog_recipe_031 | 护肝 | 鸡肉南瓜 |  | 100 |
| dog_recipe_032 | 护肝 | 火鸡低脂 |  | 100 |
| dog_recipe_033 | 护肝 | 鱼肉抗氧 |  | 100 |
| dog_recipe_034 | 护肝 | 鸡肉姜黄 |  | 95 |
| dog_recipe_035 | 护肝 | 牛肉轻负担 |  | 100 |
| dog_recipe_036 | 低敏 | 鹿肉单一 |  | 100 |
| dog_recipe_037 | 低敏 | 鸭肉低敏 |  | 100 |
| dog_recipe_038 | 低敏 | 火鸡低敏 |  | 100 |
| dog_recipe_039 | 低敏 | 鱼肉低敏 |  | 100 |
| dog_recipe_040 | 低敏 | 羊肉低敏 |  | 100 |

## 机器可读数据（YAML）

```yaml
metadata:
  schema_version: '1.0'
  title: 犬用食谱
  source_file: 犬用食谱.docx
  normalization:
    quantity_unit: 配比份
    quantity_note: 原文未说明单位；所有数字按原文保留，统一标记为“配比份”。
    non_numeric_quantity_rule: 如“姜黄微量”，quantity 置为 null，并在 quantity_text 中保留原文。
    labels_rule: 仅保留原文明确写出的“标签”；未写标签的食谱 labels 为空数组。
  recipe_count: 40
  category_count: 8
recipes:
- recipe_id: dog_recipe_001
  category_code: 1
  category_name: 幼犬（小型犬）
  category_type: life_stage_size
  life_stage: 幼犬
  dog_size: 小型犬
  functional_category: null
  category_note: null
  sequence_in_category: 1
  title: 鸡肉苹果成长餐
  labels:
  - 成长
  - 易消化
  ingredients:
  - name: 鸡胸肉
    quantity: 32
    unit: 配比份
    quantity_text: '32'
  - name: 鸡肝
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 鸡心
    quantity: 13
    unit: 配比份
    quantity_text: '13'
  - name: 苹果
    quantity: 9
    unit: 配比份
    quantity_text: '9'
  - name: 燕麦
    quantity: 4
    unit: 配比份
    quantity_text: '4'
  - name: 青豆
    quantity: 6
    unit: 配比份
    quantity_text: '6'
  - name: 红薯
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 南瓜
    quantity: 9
    unit: 配比份
    quantity_text: '9'
  - name: 山药
    quantity: 6
    unit: 配比份
    quantity_text: '6'
  total_numeric_quantity: 99
  contains_non_numeric_quantity: false
  original_ingredient_text: 鸡胸肉32 / 鸡肝10 / 鸡心13 / 苹果9 / 燕麦4 / 青豆6 / 红薯10 / 南瓜9 / 山药6
- recipe_id: dog_recipe_002
  category_code: 1
  category_name: 幼犬（小型犬）
  category_type: life_stage_size
  life_stage: 幼犬
  dog_size: 小型犬
  functional_category: null
  category_note: null
  sequence_in_category: 2
  title: 三文鱼南瓜脑发育
  labels:
  - DHA
  - 脑发育
  ingredients:
  - name: 三文鱼
    quantity: 35
    unit: 配比份
    quantity_text: '35'
  - name: 鸡肝
    quantity: 8
    unit: 配比份
    quantity_text: '8'
  - name: 燕麦
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 南瓜
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 胡萝卜
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 西兰花
    quantity: 7
    unit: 配比份
    quantity_text: '7'
  - name: 蓝莓
    quantity: 5
    unit: 配比份
    quantity_text: '5'
  - name: 鱼油
    quantity: 3
    unit: 配比份
    quantity_text: '3'
  - name: 蛋壳粉
    quantity: 2
    unit: 配比份
    quantity_text: '2'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 三文鱼35 / 鸡肝8 / 燕麦15 / 南瓜15 / 胡萝卜10 / 西兰花7 / 蓝莓5 / 鱼油3 / 蛋壳粉2
- recipe_id: dog_recipe_003
  category_code: 1
  category_name: 幼犬（小型犬）
  category_type: life_stage_size
  life_stage: 幼犬
  dog_size: 小型犬
  functional_category: null
  category_note: null
  sequence_in_category: 3
  title: 鸡肉藜麦免疫餐
  labels:
  - 免疫增强
  ingredients:
  - name: 鸡胸肉
    quantity: 35
    unit: 配比份
    quantity_text: '35'
  - name: 鸡心
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 藜麦
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 西兰花
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 红薯
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 蓝莓
    quantity: 5
    unit: 配比份
    quantity_text: '5'
  - name: 鱼油
    quantity: 3
    unit: 配比份
    quantity_text: '3'
  - name: 钙粉
    quantity: 2
    unit: 配比份
    quantity_text: '2'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 鸡胸肉35 / 鸡心10 / 藜麦20 / 西兰花10 / 红薯15 / 蓝莓5 / 鱼油3 / 钙粉2
- recipe_id: dog_recipe_004
  category_code: 1
  category_name: 幼犬（小型犬）
  category_type: life_stage_size
  life_stage: 幼犬
  dog_size: 小型犬
  functional_category: null
  category_note: null
  sequence_in_category: 4
  title: 火鸡南瓜肠胃餐
  labels:
  - 肠胃友好
  ingredients:
  - name: 火鸡肉
    quantity: 35
    unit: 配比份
    quantity_text: '35'
  - name: 南瓜
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 燕麦
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 胡萝卜
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 菠菜
    quantity: 8
    unit: 配比份
    quantity_text: '8'
  - name: 亚麻籽油
    quantity: 3
    unit: 配比份
    quantity_text: '3'
  - name: 钙粉
    quantity: 2
    unit: 配比份
    quantity_text: '2'
  - name: 苹果
    quantity: 2
    unit: 配比份
    quantity_text: '2'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 火鸡肉35 / 南瓜20 / 燕麦20 / 胡萝卜10 / 菠菜8 / 亚麻籽油3 / 钙粉2 / 苹果2
- recipe_id: dog_recipe_005
  category_code: 1
  category_name: 幼犬（小型犬）
  category_type: life_stage_size
  life_stage: 幼犬
  dog_size: 小型犬
  functional_category: null
  category_note: null
  sequence_in_category: 5
  title: 牛肉红薯活力餐
  labels:
  - 高能量
  ingredients:
  - name: 牛肉
    quantity: 35
    unit: 配比份
    quantity_text: '35'
  - name: 牛肝
    quantity: 8
    unit: 配比份
    quantity_text: '8'
  - name: 红薯
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 胡萝卜
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 西兰花
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 糙米
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 鱼油
    quantity: 3
    unit: 配比份
    quantity_text: '3'
  - name: 钙粉
    quantity: 2
    unit: 配比份
    quantity_text: '2'
  - name: 蓝莓
    quantity: 2
    unit: 配比份
    quantity_text: '2'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 牛肉35 / 牛肝8 / 红薯20 / 胡萝卜10 / 西兰花10 / 糙米10 / 鱼油3 / 钙粉2 / 蓝莓2
- recipe_id: dog_recipe_006
  category_code: 2
  category_name: 幼犬（中型犬）
  category_type: life_stage_size
  life_stage: 幼犬
  dog_size: 中型犬
  functional_category: null
  category_note: null
  sequence_in_category: 1
  title: 牛肉高蛋白成长
  labels: []
  ingredients:
  - name: 牛肉
    quantity: 40
    unit: 配比份
    quantity_text: '40'
  - name: 牛肝
    quantity: 8
    unit: 配比份
    quantity_text: '8'
  - name: 糙米
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 南瓜
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 胡萝卜
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 菠菜
    quantity: 7
    unit: 配比份
    quantity_text: '7'
  - name: 亚麻籽油
    quantity: 3
    unit: 配比份
    quantity_text: '3'
  - name: 钙粉
    quantity: 2
    unit: 配比份
    quantity_text: '2'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 牛肉40 / 牛肝8 / 糙米15 / 南瓜15 / 胡萝卜10 / 菠菜7 / 亚麻籽油3 / 钙粉2
- recipe_id: dog_recipe_007
  category_code: 2
  category_name: 幼犬（中型犬）
  category_type: life_stage_size
  life_stage: 幼犬
  dog_size: 中型犬
  functional_category: null
  category_note: null
  sequence_in_category: 2
  title: 鸡肉藜麦均衡
  labels: []
  ingredients:
  - name: 鸡胸肉
    quantity: 35
    unit: 配比份
    quantity_text: '35'
  - name: 鸡心
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 藜麦
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 西兰花
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 红薯
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 蓝莓
    quantity: 5
    unit: 配比份
    quantity_text: '5'
  - name: 鱼油
    quantity: 3
    unit: 配比份
    quantity_text: '3'
  - name: 钙粉
    quantity: 2
    unit: 配比份
    quantity_text: '2'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 鸡胸肉35 / 鸡心10 / 藜麦20 / 西兰花10 / 红薯15 / 蓝莓5 / 鱼油3 / 钙粉2
- recipe_id: dog_recipe_008
  category_code: 2
  category_name: 幼犬（中型犬）
  category_type: life_stage_size
  life_stage: 幼犬
  dog_size: 中型犬
  functional_category: null
  category_note: null
  sequence_in_category: 3
  title: 三文鱼燕麦成长
  labels: []
  ingredients:
  - name: 三文鱼
    quantity: 35
    unit: 配比份
    quantity_text: '35'
  - name: 燕麦
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 南瓜
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 胡萝卜
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 菠菜
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 鱼油
    quantity: 5
    unit: 配比份
    quantity_text: '5'
  - name: 钙粉
    quantity: 5
    unit: 配比份
    quantity_text: '5'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 三文鱼35 / 燕麦20 / 南瓜15 / 胡萝卜10 / 菠菜10 / 鱼油5 / 钙粉5
- recipe_id: dog_recipe_009
  category_code: 2
  category_name: 幼犬（中型犬）
  category_type: life_stage_size
  life_stage: 幼犬
  dog_size: 中型犬
  functional_category: null
  category_note: null
  sequence_in_category: 4
  title: 火鸡红薯成长
  labels: []
  ingredients:
  - name: 火鸡
    quantity: 40
    unit: 配比份
    quantity_text: '40'
  - name: 红薯
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 西兰花
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 胡萝卜
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 燕麦
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 亚麻籽油
    quantity: 3
    unit: 配比份
    quantity_text: '3'
  - name: 钙粉
    quantity: 2
    unit: 配比份
    quantity_text: '2'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 火鸡40 / 红薯20 / 西兰花10 / 胡萝卜10 / 燕麦15 / 亚麻籽油3 / 钙粉2
- recipe_id: dog_recipe_010
  category_code: 2
  category_name: 幼犬（中型犬）
  category_type: life_stage_size
  life_stage: 幼犬
  dog_size: 中型犬
  functional_category: null
  category_note: null
  sequence_in_category: 5
  title: 鸡肉土豆成长
  labels: []
  ingredients:
  - name: 鸡胸肉
    quantity: 38
    unit: 配比份
    quantity_text: '38'
  - name: 土豆
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 胡萝卜
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 西葫芦
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 糙米
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 鱼油
    quantity: 5
    unit: 配比份
    quantity_text: '5'
  - name: 钙粉
    quantity: 2
    unit: 配比份
    quantity_text: '2'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 鸡胸肉38 / 土豆20 / 胡萝卜10 / 西葫芦10 / 糙米15 / 鱼油5 / 钙粉2
- recipe_id: dog_recipe_011
  category_code: 3
  category_name: 幼犬（大型犬）
  category_type: life_stage_size
  life_stage: 幼犬
  dog_size: 大型犬
  functional_category: null
  category_note: 控钙
  sequence_in_category: 1
  title: 鸡肉稳生长
  labels: []
  ingredients:
  - name: 鸡胸肉
    quantity: 40
    unit: 配比份
    quantity_text: '40'
  - name: 鸡心
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 红薯
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 西葫芦
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 胡萝卜
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 燕麦
    quantity: 7
    unit: 配比份
    quantity_text: '7'
  - name: 鱼油
    quantity: 2
    unit: 配比份
    quantity_text: '2'
  - name: 钙粉
    quantity: 1
    unit: 配比份
    quantity_text: '1'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 鸡胸肉40 / 鸡心10 / 红薯20 / 西葫芦10 / 胡萝卜10 / 燕麦7 / 鱼油2 / 钙粉1
- recipe_id: dog_recipe_012
  category_code: 3
  category_name: 幼犬（大型犬）
  category_type: life_stage_size
  life_stage: 幼犬
  dog_size: 大型犬
  functional_category: null
  category_note: 控钙
  sequence_in_category: 2
  title: 火鸡低钙成长
  labels: []
  ingredients:
  - name: 火鸡
    quantity: 40
    unit: 配比份
    quantity_text: '40'
  - name: 南瓜
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 糙米
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 青豆
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 菠菜
    quantity: 8
    unit: 配比份
    quantity_text: '8'
  - name: 亚麻籽油
    quantity: 3
    unit: 配比份
    quantity_text: '3'
  - name: 钙粉
    quantity: 2
    unit: 配比份
    quantity_text: '2'
  total_numeric_quantity: 98
  contains_non_numeric_quantity: false
  original_ingredient_text: 火鸡40 / 南瓜20 / 糙米15 / 青豆10 / 菠菜8 / 亚麻籽油3 / 钙粉2
- recipe_id: dog_recipe_013
  category_code: 3
  category_name: 幼犬（大型犬）
  category_type: life_stage_size
  life_stage: 幼犬
  dog_size: 大型犬
  functional_category: null
  category_note: 控钙
  sequence_in_category: 3
  title: 牛肉控制成长
  labels: []
  ingredients:
  - name: 牛肉
    quantity: 35
    unit: 配比份
    quantity_text: '35'
  - name: 红薯
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 胡萝卜
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 西兰花
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 燕麦
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 鱼油
    quantity: 3
    unit: 配比份
    quantity_text: '3'
  - name: 钙粉
    quantity: 2
    unit: 配比份
    quantity_text: '2'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 牛肉35 / 红薯20 / 胡萝卜15 / 西兰花10 / 燕麦15 / 鱼油3 / 钙粉2
- recipe_id: dog_recipe_014
  category_code: 3
  category_name: 幼犬（大型犬）
  category_type: life_stage_size
  life_stage: 幼犬
  dog_size: 大型犬
  functional_category: null
  category_note: 控钙
  sequence_in_category: 4
  title: 鸡肉蔬菜成长
  labels: []
  ingredients:
  - name: 鸡肉
    quantity: 38
    unit: 配比份
    quantity_text: '38'
  - name: 南瓜
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 西兰花
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 胡萝卜
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 糙米
    quantity: 12
    unit: 配比份
    quantity_text: '12'
  - name: 鱼油
    quantity: 3
    unit: 配比份
    quantity_text: '3'
  - name: 钙粉
    quantity: 2
    unit: 配比份
    quantity_text: '2'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 鸡肉38 / 南瓜20 / 西兰花15 / 胡萝卜10 / 糙米12 / 鱼油3 / 钙粉2
- recipe_id: dog_recipe_015
  category_code: 3
  category_name: 幼犬（大型犬）
  category_type: life_stage_size
  life_stage: 幼犬
  dog_size: 大型犬
  functional_category: null
  category_note: 控钙
  sequence_in_category: 5
  title: 三文鱼缓生长
  labels: []
  ingredients:
  - name: 三文鱼
    quantity: 35
    unit: 配比份
    quantity_text: '35'
  - name: 红薯
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 菠菜
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 燕麦
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 西葫芦
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 鱼油
    quantity: 3
    unit: 配比份
    quantity_text: '3'
  - name: 钙粉
    quantity: 2
    unit: 配比份
    quantity_text: '2'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 三文鱼35 / 红薯20 / 菠菜15 / 燕麦15 / 西葫芦10 / 鱼油3 / 钙粉2
- recipe_id: dog_recipe_016
  category_code: 4
  category_name: 成年犬（小型犬）
  category_type: life_stage_size
  life_stage: 成年犬
  dog_size: 小型犬
  functional_category: null
  category_note: null
  sequence_in_category: 1
  title: 牛肉能量餐
  labels: []
  ingredients:
  - name: 牛肉
    quantity: 35
    unit: 配比份
    quantity_text: '35'
  - name: 土豆
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 胡萝卜
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 西兰花
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 糙米
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 亚麻籽油
    quantity: 3
    unit: 配比份
    quantity_text: '3'
  - name: 钙粉
    quantity: 2
    unit: 配比份
    quantity_text: '2'
  - name: 苹果
    quantity: 5
    unit: 配比份
    quantity_text: '5'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 牛肉35 / 土豆20 / 胡萝卜10 / 西兰花10 / 糙米15 / 亚麻籽油3 / 钙粉2 / 苹果5
- recipe_id: dog_recipe_017
  category_code: 4
  category_name: 成年犬（小型犬）
  category_type: life_stage_size
  life_stage: 成年犬
  dog_size: 小型犬
  functional_category: null
  category_note: null
  sequence_in_category: 2
  title: 鸡肉轻盈餐
  labels: []
  ingredients:
  - name: 鸡胸肉
    quantity: 35
    unit: 配比份
    quantity_text: '35'
  - name: 南瓜
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 西葫芦
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 燕麦
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 菠菜
    quantity: 8
    unit: 配比份
    quantity_text: '8'
  - name: 鱼油
    quantity: 3
    unit: 配比份
    quantity_text: '3'
  - name: 蓝莓
    quantity: 4
    unit: 配比份
    quantity_text: '4'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 鸡胸肉35 / 南瓜20 / 西葫芦15 / 燕麦15 / 菠菜8 / 鱼油3 / 蓝莓4
- recipe_id: dog_recipe_018
  category_code: 4
  category_name: 成年犬（小型犬）
  category_type: life_stage_size
  life_stage: 成年犬
  dog_size: 小型犬
  functional_category: null
  category_note: null
  sequence_in_category: 3
  title: 火鸡低脂餐
  labels: []
  ingredients:
  - name: 火鸡
    quantity: 35
    unit: 配比份
    quantity_text: '35'
  - name: 南瓜
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 西兰花
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 燕麦
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 胡萝卜
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 亚麻籽油
    quantity: 3
    unit: 配比份
    quantity_text: '3'
  - name: 蓝莓
    quantity: 2
    unit: 配比份
    quantity_text: '2'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 火鸡35 / 南瓜20 / 西兰花15 / 燕麦15 / 胡萝卜10 / 亚麻籽油3 / 蓝莓2
- recipe_id: dog_recipe_019
  category_code: 4
  category_name: 成年犬（小型犬）
  category_type: life_stage_size
  life_stage: 成年犬
  dog_size: 小型犬
  functional_category: null
  category_note: null
  sequence_in_category: 4
  title: 三文鱼均衡餐
  labels: []
  ingredients:
  - name: 三文鱼
    quantity: 30
    unit: 配比份
    quantity_text: '30'
  - name: 红薯
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 菠菜
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 燕麦
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 西兰花
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 鱼油
    quantity: 5
    unit: 配比份
    quantity_text: '5'
  - name: 蓝莓
    quantity: 5
    unit: 配比份
    quantity_text: '5'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 三文鱼30 / 红薯20 / 菠菜15 / 燕麦15 / 西兰花10 / 鱼油5 / 蓝莓5
- recipe_id: dog_recipe_020
  category_code: 4
  category_name: 成年犬（小型犬）
  category_type: life_stage_size
  life_stage: 成年犬
  dog_size: 小型犬
  functional_category: null
  category_note: null
  sequence_in_category: 5
  title: 鸡肉米饭经典
  labels: []
  ingredients:
  - name: 鸡肉
    quantity: 35
    unit: 配比份
    quantity_text: '35'
  - name: 米饭
    quantity: 25
    unit: 配比份
    quantity_text: '25'
  - name: 胡萝卜
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 西兰花
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 菠菜
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 鱼油
    quantity: 5
    unit: 配比份
    quantity_text: '5'
  - name: 苹果
    quantity: 5
    unit: 配比份
    quantity_text: '5'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 鸡肉35 / 米饭25 / 胡萝卜10 / 西兰花10 / 菠菜10 / 鱼油5 / 苹果5
- recipe_id: dog_recipe_021
  category_code: 7
  category_name: 老年犬（小型犬）
  category_type: life_stage_size
  life_stage: 老年犬
  dog_size: 小型犬
  functional_category: null
  category_note: null
  sequence_in_category: 1
  title: 护关节低脂
  labels: []
  ingredients:
  - name: 鸡胸肉
    quantity: 30
    unit: 配比份
    quantity_text: '30'
  - name: 南瓜
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 西葫芦
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 燕麦
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 胡萝卜
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 鱼油
    quantity: 2
    unit: 配比份
    quantity_text: '2'
  - name: 葡萄糖胺
    quantity: 1
    unit: 配比份
    quantity_text: '1'
  - name: 蓝莓
    quantity: 7
    unit: 配比份
    quantity_text: '7'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 鸡胸肉30 / 南瓜20 / 西葫芦15 / 燕麦15 / 胡萝卜10 / 鱼油2 / 葡萄糖胺1 / 蓝莓7
- recipe_id: dog_recipe_022
  category_code: 7
  category_name: 老年犬（小型犬）
  category_type: life_stage_size
  life_stage: 老年犬
  dog_size: 小型犬
  functional_category: null
  category_note: null
  sequence_in_category: 2
  title: 易消化温和
  labels: []
  ingredients:
  - name: 火鸡
    quantity: 30
    unit: 配比份
    quantity_text: '30'
  - name: 红薯
    quantity: 25
    unit: 配比份
    quantity_text: '25'
  - name: 南瓜
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 菠菜
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 燕麦
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 亚麻籽油
    quantity: 3
    unit: 配比份
    quantity_text: '3'
  - name: 钙粉
    quantity: 2
    unit: 配比份
    quantity_text: '2'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 火鸡30 / 红薯25 / 南瓜20 / 菠菜10 / 燕麦10 / 亚麻籽油3 / 钙粉2
- recipe_id: dog_recipe_023
  category_code: 7
  category_name: 老年犬（小型犬）
  category_type: life_stage_size
  life_stage: 老年犬
  dog_size: 小型犬
  functional_category: null
  category_note: null
  sequence_in_category: 3
  title: 鸡肉高纤
  labels: []
  ingredients:
  - name: 鸡肉
    quantity: 30
    unit: 配比份
    quantity_text: '30'
  - name: 南瓜
    quantity: 25
    unit: 配比份
    quantity_text: '25'
  - name: 西兰花
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 燕麦
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 胡萝卜
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 鱼油
    quantity: 3
    unit: 配比份
    quantity_text: '3'
  - name: 蓝莓
    quantity: 2
    unit: 配比份
    quantity_text: '2'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 鸡肉30 / 南瓜25 / 西兰花20 / 燕麦10 / 胡萝卜10 / 鱼油3 / 蓝莓2
- recipe_id: dog_recipe_024
  category_code: 7
  category_name: 老年犬（小型犬）
  category_type: life_stage_size
  life_stage: 老年犬
  dog_size: 小型犬
  functional_category: null
  category_note: null
  sequence_in_category: 4
  title: 鱼肉护心
  labels: []
  ingredients:
  - name: 三文鱼
    quantity: 30
    unit: 配比份
    quantity_text: '30'
  - name: 红薯
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 菠菜
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 燕麦
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 蓝莓
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 鱼油
    quantity: 3
    unit: 配比份
    quantity_text: '3'
  - name: 钙粉
    quantity: 2
    unit: 配比份
    quantity_text: '2'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 三文鱼30 / 红薯20 / 菠菜20 / 燕麦15 / 蓝莓10 / 鱼油3 / 钙粉2
- recipe_id: dog_recipe_025
  category_code: 7
  category_name: 老年犬（小型犬）
  category_type: life_stage_size
  life_stage: 老年犬
  dog_size: 小型犬
  functional_category: null
  category_note: null
  sequence_in_category: 5
  title: 牛肉补能
  labels: []
  ingredients:
  - name: 牛肉
    quantity: 30
    unit: 配比份
    quantity_text: '30'
  - name: 土豆
    quantity: 25
    unit: 配比份
    quantity_text: '25'
  - name: 胡萝卜
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 西兰花
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 燕麦
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 鱼油
    quantity: 5
    unit: 配比份
    quantity_text: '5'
  - name: 蓝莓
    quantity: 5
    unit: 配比份
    quantity_text: '5'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 牛肉30 / 土豆25 / 胡萝卜15 / 西兰花10 / 燕麦10 / 鱼油5 / 蓝莓5
- recipe_id: dog_recipe_026
  category_code: 10
  category_name: 美毛
  category_type: functional
  life_stage: null
  dog_size: null
  functional_category: 美毛
  category_note: null
  sequence_in_category: 1
  title: 三文鱼亮毛
  labels: []
  ingredients:
  - name: 三文鱼
    quantity: 40
    unit: 配比份
    quantity_text: '40'
  - name: 鸡蛋
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 胡萝卜
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 蓝莓
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 燕麦
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 亚麻籽油
    quantity: 3
    unit: 配比份
    quantity_text: '3'
  - name: 菠菜
    quantity: 12
    unit: 配比份
    quantity_text: '12'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 三文鱼40 / 鸡蛋10 / 胡萝卜10 / 蓝莓10 / 燕麦15 / 亚麻籽油3 / 菠菜12
- recipe_id: dog_recipe_027
  category_code: 10
  category_name: 美毛
  category_type: functional
  life_stage: null
  dog_size: null
  functional_category: 美毛
  category_note: null
  sequence_in_category: 2
  title: 鸡肉亚麻油
  labels: []
  ingredients:
  - name: 鸡肉
    quantity: 35
    unit: 配比份
    quantity_text: '35'
  - name: 南瓜
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 菠菜
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 燕麦
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 蓝莓
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 亚麻籽油
    quantity: 5
    unit: 配比份
    quantity_text: '5'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 鸡肉35 / 南瓜20 / 菠菜15 / 燕麦15 / 蓝莓10 / 亚麻籽油5
- recipe_id: dog_recipe_028
  category_code: 10
  category_name: 美毛
  category_type: functional
  life_stage: null
  dog_size: null
  functional_category: 美毛
  category_note: null
  sequence_in_category: 3
  title: 牛肉护肤
  labels: []
  ingredients:
  - name: 牛肉
    quantity: 35
    unit: 配比份
    quantity_text: '35'
  - name: 红薯
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 胡萝卜
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 菠菜
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 燕麦
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 鱼油
    quantity: 5
    unit: 配比份
    quantity_text: '5'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 牛肉35 / 红薯20 / 胡萝卜15 / 菠菜10 / 燕麦15 / 鱼油5
- recipe_id: dog_recipe_029
  category_code: 10
  category_name: 美毛
  category_type: functional
  life_stage: null
  dog_size: null
  functional_category: 美毛
  category_note: null
  sequence_in_category: 4
  title: 火鸡抗敏
  labels: []
  ingredients:
  - name: 火鸡
    quantity: 35
    unit: 配比份
    quantity_text: '35'
  - name: 南瓜
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 西兰花
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 燕麦
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 蓝莓
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 亚麻籽油
    quantity: 5
    unit: 配比份
    quantity_text: '5'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 火鸡35 / 南瓜20 / 西兰花15 / 燕麦15 / 蓝莓10 / 亚麻籽油5
- recipe_id: dog_recipe_030
  category_code: 10
  category_name: 美毛
  category_type: functional
  life_stage: null
  dog_size: null
  functional_category: 美毛
  category_note: null
  sequence_in_category: 5
  title: 鱼肉抗炎
  labels: []
  ingredients:
  - name: 三文鱼
    quantity: 38
    unit: 配比份
    quantity_text: '38'
  - name: 红薯
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 菠菜
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 燕麦
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 蓝莓
    quantity: 7
    unit: 配比份
    quantity_text: '7'
  - name: 鱼油
    quantity: 5
    unit: 配比份
    quantity_text: '5'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 三文鱼38 / 红薯20 / 菠菜15 / 燕麦15 / 蓝莓7 / 鱼油5
- recipe_id: dog_recipe_031
  category_code: 11
  category_name: 护肝
  category_type: functional
  life_stage: null
  dog_size: null
  functional_category: 护肝
  category_note: null
  sequence_in_category: 1
  title: 鸡肉南瓜
  labels: []
  ingredients:
  - name: 鸡肉
    quantity: 35
    unit: 配比份
    quantity_text: '35'
  - name: 南瓜
    quantity: 25
    unit: 配比份
    quantity_text: '25'
  - name: 胡萝卜
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 燕麦
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 西兰花
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 鱼油
    quantity: 3
    unit: 配比份
    quantity_text: '3'
  - name: 蓝莓
    quantity: 2
    unit: 配比份
    quantity_text: '2'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 鸡肉35 / 南瓜25 / 胡萝卜10 / 燕麦15 / 西兰花10 / 鱼油3 / 蓝莓2
- recipe_id: dog_recipe_032
  category_code: 11
  category_name: 护肝
  category_type: functional
  life_stage: null
  dog_size: null
  functional_category: 护肝
  category_note: null
  sequence_in_category: 2
  title: 火鸡低脂
  labels: []
  ingredients:
  - name: 火鸡
    quantity: 35
    unit: 配比份
    quantity_text: '35'
  - name: 南瓜
    quantity: 25
    unit: 配比份
    quantity_text: '25'
  - name: 菠菜
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 燕麦
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 蓝莓
    quantity: 5
    unit: 配比份
    quantity_text: '5'
  - name: 亚麻籽油
    quantity: 5
    unit: 配比份
    quantity_text: '5'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 火鸡35 / 南瓜25 / 菠菜15 / 燕麦15 / 蓝莓5 / 亚麻籽油5
- recipe_id: dog_recipe_033
  category_code: 11
  category_name: 护肝
  category_type: functional
  life_stage: null
  dog_size: null
  functional_category: 护肝
  category_note: null
  sequence_in_category: 3
  title: 鱼肉抗氧
  labels: []
  ingredients:
  - name: 三文鱼
    quantity: 30
    unit: 配比份
    quantity_text: '30'
  - name: 南瓜
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 菠菜
    quantity: 20
    unit: 配比份
    quantity_text: '20'
  - name: 燕麦
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 蓝莓
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 鱼油
    quantity: 5
    unit: 配比份
    quantity_text: '5'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 三文鱼30 / 南瓜20 / 菠菜20 / 燕麦15 / 蓝莓10 / 鱼油5
- recipe_id: dog_recipe_034
  category_code: 11
  category_name: 护肝
  category_type: functional
  life_stage: null
  dog_size: null
  functional_category: 护肝
  category_note: null
  sequence_in_category: 4
  title: 鸡肉姜黄
  labels: []
  ingredients:
  - name: 鸡肉
    quantity: 35
    unit: 配比份
    quantity_text: '35'
  - name: 南瓜
    quantity: 25
    unit: 配比份
    quantity_text: '25'
  - name: 胡萝卜
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 燕麦
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 姜黄
    quantity: null
    unit: null
    quantity_text: 微量
  - name: 鱼油
    quantity: 5
    unit: 配比份
    quantity_text: '5'
  total_numeric_quantity: 95
  contains_non_numeric_quantity: true
  original_ingredient_text: 鸡肉35 / 南瓜25 / 胡萝卜15 / 燕麦15 / 姜黄微量 / 鱼油5
- recipe_id: dog_recipe_035
  category_code: 11
  category_name: 护肝
  category_type: functional
  life_stage: null
  dog_size: null
  functional_category: 护肝
  category_note: null
  sequence_in_category: 5
  title: 牛肉轻负担
  labels: []
  ingredients:
  - name: 牛肉
    quantity: 30
    unit: 配比份
    quantity_text: '30'
  - name: 南瓜
    quantity: 25
    unit: 配比份
    quantity_text: '25'
  - name: 西兰花
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 燕麦
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 蓝莓
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 鱼油
    quantity: 5
    unit: 配比份
    quantity_text: '5'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 牛肉30 / 南瓜25 / 西兰花15 / 燕麦15 / 蓝莓10 / 鱼油5
- recipe_id: dog_recipe_036
  category_code: 14
  category_name: 低敏
  category_type: functional
  life_stage: null
  dog_size: null
  functional_category: 低敏
  category_note: 非常关键
  sequence_in_category: 1
  title: 鹿肉单一
  labels: []
  ingredients:
  - name: 鹿肉
    quantity: 50
    unit: 配比份
    quantity_text: '50'
  - name: 红薯
    quantity: 25
    unit: 配比份
    quantity_text: '25'
  - name: 西葫芦
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 橄榄油
    quantity: 3
    unit: 配比份
    quantity_text: '3'
  - name: 蓝莓
    quantity: 7
    unit: 配比份
    quantity_text: '7'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 鹿肉50 / 红薯25 / 西葫芦15 / 橄榄油3 / 蓝莓7
- recipe_id: dog_recipe_037
  category_code: 14
  category_name: 低敏
  category_type: functional
  life_stage: null
  dog_size: null
  functional_category: 低敏
  category_note: 非常关键
  sequence_in_category: 2
  title: 鸭肉低敏
  labels: []
  ingredients:
  - name: 鸭肉
    quantity: 45
    unit: 配比份
    quantity_text: '45'
  - name: 南瓜
    quantity: 25
    unit: 配比份
    quantity_text: '25'
  - name: 西葫芦
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 燕麦
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 鱼油
    quantity: 5
    unit: 配比份
    quantity_text: '5'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 鸭肉45 / 南瓜25 / 西葫芦15 / 燕麦10 / 鱼油5
- recipe_id: dog_recipe_038
  category_code: 14
  category_name: 低敏
  category_type: functional
  life_stage: null
  dog_size: null
  functional_category: 低敏
  category_note: 非常关键
  sequence_in_category: 3
  title: 火鸡低敏
  labels: []
  ingredients:
  - name: 火鸡
    quantity: 45
    unit: 配比份
    quantity_text: '45'
  - name: 红薯
    quantity: 25
    unit: 配比份
    quantity_text: '25'
  - name: 菠菜
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 燕麦
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 亚麻籽油
    quantity: 5
    unit: 配比份
    quantity_text: '5'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 火鸡45 / 红薯25 / 菠菜15 / 燕麦10 / 亚麻籽油5
- recipe_id: dog_recipe_039
  category_code: 14
  category_name: 低敏
  category_type: functional
  life_stage: null
  dog_size: null
  functional_category: 低敏
  category_note: 非常关键
  sequence_in_category: 4
  title: 鱼肉低敏
  labels: []
  ingredients:
  - name: 白鱼
    quantity: 45
    unit: 配比份
    quantity_text: '45'
  - name: 土豆
    quantity: 25
    unit: 配比份
    quantity_text: '25'
  - name: 西葫芦
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 燕麦
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 鱼油
    quantity: 5
    unit: 配比份
    quantity_text: '5'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 白鱼45 / 土豆25 / 西葫芦15 / 燕麦10 / 鱼油5
- recipe_id: dog_recipe_040
  category_code: 14
  category_name: 低敏
  category_type: functional
  life_stage: null
  dog_size: null
  functional_category: 低敏
  category_note: 非常关键
  sequence_in_category: 5
  title: 羊肉低敏
  labels: []
  ingredients:
  - name: 羊肉
    quantity: 45
    unit: 配比份
    quantity_text: '45'
  - name: 南瓜
    quantity: 25
    unit: 配比份
    quantity_text: '25'
  - name: 胡萝卜
    quantity: 15
    unit: 配比份
    quantity_text: '15'
  - name: 燕麦
    quantity: 10
    unit: 配比份
    quantity_text: '10'
  - name: 鱼油
    quantity: 5
    unit: 配比份
    quantity_text: '5'
  total_numeric_quantity: 100
  contains_non_numeric_quantity: false
  original_ingredient_text: 羊肉45 / 南瓜25 / 胡萝卜15 / 燕麦10 / 鱼油5
```
