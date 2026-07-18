# 犬用食谱（AI 结构化版）

> 本文档已自动从营养审查版 Excel 转换为固定字段的 Markdown + YAML 结构，供 AI 与前端作为结构化数据事实源读取。
> 已经剔除豆类风险食材，升级为模块化 A+B+C 组合。

## 索引表格

| 序列号 | 类别 | 细分大类 | 配方名称 | 核心标签 |
|---|---|---|---|---|
| dog_recipe_001 | 成犬通用 | 成年犬 | 鸡肉轻盈餐 | 轻盈 |
| dog_recipe_002 | 成犬通用 | 成年犬 | 鸡肉燕麦经典 | 经典 |
| dog_recipe_003 | 成犬通用 | 成年犬 | 金枪鱼均衡餐 | 均衡 |
| dog_recipe_004 | 成犬通用 | 成年犬 | 牛肉能量餐 | 能量 |
| dog_recipe_005 | 成犬通用 | 成年犬 | 兔肉低脂餐 | 低脂 |
| dog_recipe_006 | 老年犬通用 | 老年犬 | 护关节低脂 | 护关节、低脂 |
| dog_recipe_007 | 老年犬通用 | 老年犬 | 鸡肉高纤 | 高纤 |
| dog_recipe_008 | 老年犬通用 | 老年犬 | 金枪鱼护心 | 护心 |
| dog_recipe_009 | 老年犬通用 | 老年犬 | 牛肉补能 | 补能 |
| dog_recipe_010 | 老年犬通用 | 老年犬 | 易消化温和 | 温和、易消化 |
| dog_recipe_011 | 低敏单一蛋白 | 功能支持 | 金枪鱼单一低敏 | 低敏 |
| dog_recipe_012 | 低敏单一蛋白 | 功能支持 | 兔肉菠菜单一低敏 | 低敏 |
| dog_recipe_013 | 低敏单一蛋白 | 功能支持 | 兔肉红薯单一低敏 | 单一蛋白、低敏 |
| dog_recipe_014 | 低敏单一蛋白 | 功能支持 | 鸭肉胡萝卜单一低敏 | 低敏 |
| dog_recipe_015 | 低敏单一蛋白 | 功能支持 | 鸭肉南瓜单一低敏 | 低敏 |
| dog_recipe_016 | 护肝 | 功能支持 | 鸡肉姜黄 | 护肝 |
| dog_recipe_017 | 护肝 | 功能支持 | 鸡肉南瓜 | 护肝 |
| dog_recipe_018 | 护肝 | 功能支持 | 金枪鱼抗氧 | 抗氧、护肝 |
| dog_recipe_019 | 护肝 | 功能支持 | 牛肉轻负担 | 轻负担、护肝 |
| dog_recipe_020 | 护肝 | 功能支持 | 兔肉低脂 | 低脂、护肝 |
| dog_recipe_021 | 美毛护肤 | 功能支持 | 鸡肉美毛 | 美毛 |
| dog_recipe_022 | 美毛护肤 | 功能支持 | 金枪鱼抗炎 | 抗炎、美毛 |
| dog_recipe_023 | 美毛护肤 | 功能支持 | 金枪鱼亮毛 | 亮毛、美毛 |
| dog_recipe_024 | 美毛护肤 | 功能支持 | 牛肉护肤 | 护肤、美毛 |
| dog_recipe_025 | 美毛护肤 | 功能支持 | 兔肉抗敏 | 抗敏、美毛 |
| dog_recipe_026 | 控钙幼犬（大型幼犬） | 幼犬 | 鸡肉蔬菜成长 | 控钙 |
| dog_recipe_027 | 控钙幼犬（大型幼犬） | 幼犬 | 鸡肉稳生长 | 控钙 |
| dog_recipe_028 | 控钙幼犬（大型幼犬） | 幼犬 | 金枪鱼缓生长 | 控钙 |
| dog_recipe_029 | 控钙幼犬（大型幼犬） | 幼犬 | 牛肉控制成长 | 控钙 |
| dog_recipe_030 | 控钙幼犬（大型幼犬） | 幼犬 | 兔肉低钙成长 | 控钙 |
| dog_recipe_031 | 幼犬通用 | 幼犬 | 鸡肉藜麦均衡 | 均衡 |
| dog_recipe_032 | 幼犬通用 | 幼犬 | 鸡肉藜麦免疫餐 | 免疫增强 |
| dog_recipe_033 | 幼犬通用 | 幼犬 | 鸡肉苹果成长餐 | 成长、易消化 |
| dog_recipe_034 | 幼犬通用 | 幼犬 | 鸡肉土豆成长 | 成长 |
| dog_recipe_035 | 幼犬通用 | 幼犬 | 金枪鱼南瓜脑发育 | DHA、脑发育 |
| dog_recipe_036 | 幼犬通用 | 幼犬 | 金枪鱼燕麦成长 | 成长 |
| dog_recipe_037 | 幼犬通用 | 幼犬 | 牛肉高蛋白成长 | 成长 |
| dog_recipe_038 | 幼犬通用 | 幼犬 | 牛肉红薯活力餐 | 高能量 |
| dog_recipe_039 | 幼犬通用 | 幼犬 | 兔肉南瓜肠胃餐 | 肠胃友好 |
| dog_recipe_040 | 幼犬通用 | 幼犬 | 鸭肉红薯成长 | 成长 |

## 机器可读数据（YAML）

```yaml
metadata:
  schema_version: '2.0'
  title: 犬用鲜食配方 A+B+C 优化版
  refreshed_from: 犬用鲜食配方_A+B+C_40种优化版_营养合规审查（0630）.xlsx
  normalization:
    quantity_unit: 百分比 %
    notes: 去除了高风险豆类等食材，重构为 A+B+C 配方体系
  recipe_count: 40
recipes:
  - recipe_id: dog_recipe_001
    category_code: 4
    category_name: 成犬通用
    category_type: life_stage_size
    life_stage: 成年犬
    dog_size: null
    title: 鸡肉轻盈餐
    labels:
      - 轻盈
    ingredients:
      - name: 鸡小胸
        percent: 34.6
      - name: 南瓜
        percent: 19.8
      - name: 冬瓜丁
        percent: 14.8
      - name: 全熟燕麦片
        percent: 14.8
      - name: 菠菜
        percent: 7.9
      - name: 蓝莓
        percent: 4.1
    b_pack: 成犬维护营养包B：成犬维矿预混料 1.7 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）1.0 / Omega-3鱼油或藻油 1.3
    c_pack: 无
    notes: 原油脂/钙源移入B包：鱼油；A包替换：鸡胸肉→鸡小胸；西葫芦→冬瓜丁；燕麦→全熟燕麦片；蓝莓→蓝莓
  - recipe_id: dog_recipe_002
    category_code: 4
    category_name: 成犬通用
    category_type: life_stage_size
    life_stage: 成年犬
    dog_size: null
    title: 鸡肉燕麦经典
    labels:
      - 经典
    ingredients:
      - name: 鸡小胸
        percent: 35.4
      - name: 全熟燕麦片
        percent: 25.3
      - name: 胡萝卜
        percent: 10.1
      - name: 西兰花
        percent: 10.1
      - name: 菠菜
        percent: 10.1
      - name: 苹果
        percent: 5
    b_pack: 成犬维护营养包B：成犬维矿预混料 1.7 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）1.0 / Omega-3鱼油或藻油 1.3
    c_pack: 无
    notes: 原油脂/钙源移入B包：鱼油；A包替换：鸡肉→鸡小胸；米饭→全熟燕麦片；西兰花→西兰花
  - recipe_id: dog_recipe_003
    category_code: 4
    category_name: 成犬通用
    category_type: life_stage_size
    life_stage: 成年犬
    dog_size: null
    title: 金枪鱼均衡餐
    labels:
      - 均衡
    ingredients:
      - name: 金枪鱼白肉
        percent: 30.3
      - name: 红薯
        percent: 20.2
      - name: 菠菜
        percent: 15.2
      - name: 全熟燕麦片
        percent: 15.2
      - name: 西兰花
        percent: 10.1
      - name: 蓝莓
        percent: 5
    b_pack: 成犬维护营养包B：成犬维矿预混料 1.7 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）1.0 / Omega-3鱼油或藻油 1.3
    c_pack: 无
    notes: 原油脂/钙源移入B包：鱼油；A包替换：三文鱼→金枪鱼白肉；燕麦→全熟燕麦片；西兰花→西兰花；蓝莓→蓝莓
  - recipe_id: dog_recipe_004
    category_code: 4
    category_name: 成犬通用
    category_type: life_stage_size
    life_stage: 成年犬
    dog_size: null
    title: 牛肉能量餐
    labels:
      - 能量
    ingredients:
      - name: 牛肉
        percent: 29.4
      - name: 牛心
        percent: 6
      - name: 红薯
        percent: 20.2
      - name: 胡萝卜
        percent: 10.1
      - name: 西兰花
        percent: 10.1
      - name: 全熟燕麦片
        percent: 15.2
      - name: 苹果
        percent: 5
    b_pack: 成犬维护营养包B：成犬维矿预混料 1.7 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）1.0 / Omega-3鱼油或藻油 1.3
    c_pack: 无
    notes: 原油脂/钙源移入B包：亚麻籽油、钙粉；A包替换：牛肉→牛肉（前腿）；土豆→红薯；西兰花→西兰花；糙米→全熟燕麦片；牛心按6%加入成犬牛肉能量线；不使用牛肉米龙，保持低成本
  - recipe_id: dog_recipe_005
    category_code: 4
    category_name: 成犬通用
    category_type: life_stage_size
    life_stage: 成年犬
    dog_size: null
    title: 兔肉低脂餐
    labels:
      - 低脂
    ingredients:
      - name: 兔里脊
        percent: 34.6
      - name: 南瓜
        percent: 19.8
      - name: 西兰花
        percent: 14.8
      - name: 全熟燕麦片
        percent: 14.8
      - name: 胡萝卜
        percent: 9.9
      - name: 蓝莓
        percent: 2.1
    b_pack: 成犬维护营养包B：成犬维矿预混料 1.7 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）1.0 / Omega-3鱼油或藻油 1.3
    c_pack: 无
    notes: 原油脂/钙源移入B包：亚麻籽油；A包替换：火鸡→兔里脊；西兰花→西兰花；燕麦→全熟燕麦片；蓝莓→蓝莓
  - recipe_id: dog_recipe_006
    category_code: 7
    category_name: 老年犬通用
    category_type: life_stage_size
    life_stage: 老年犬
    dog_size: null
    title: 护关节低脂
    labels:
      - 护关节
      - 低脂
    ingredients:
      - name: 鸡小胸
        percent: 29.2
      - name: 南瓜
        percent: 19.5
      - name: 冬瓜丁
        percent: 14.6
      - name: 全熟燕麦片
        percent: 14.6
      - name: 胡萝卜
        percent: 9.7
      - name: 蓝莓
        percent: 6.9
    b_pack: 老年犬轻负担营养包B：老年犬维矿预混料（抗氧化支持）1.9 / 低磷钙源或钙磷维护矿物粉 0.8 / EPA-DHA鱼油或藻油 1.3
    c_pack: 关节支持功能包C：葡萄糖胺/软骨素/MSM/透明质酸 1.5
    notes: 原油脂/钙源移入B包：鱼油；原功能/非供货项移入C包：葡萄糖胺；A包替换：鸡胸肉→鸡小胸；西葫芦→冬瓜丁；燕麦→全熟燕麦片；蓝莓→蓝莓
  - recipe_id: dog_recipe_007
    category_code: 7
    category_name: 老年犬通用
    category_type: life_stage_size
    life_stage: 老年犬
    dog_size: null
    title: 鸡肉高纤
    labels:
      - 高纤
    ingredients:
      - name: 鸡小胸
        percent: 29.7
      - name: 南瓜
        percent: 24.7
      - name: 西兰花
        percent: 19.8
      - name: 全熟燕麦片
        percent: 9.9
      - name: 胡萝卜
        percent: 9.9
      - name: 蓝莓
        percent: 2
    b_pack: 老年犬轻负担营养包B：老年犬维矿预混料（抗氧化支持）1.9 / 低磷钙源或钙磷维护矿物粉 0.8 / EPA-DHA鱼油或藻油 1.3
    c_pack: 无
    notes: 原油脂/钙源移入B包：鱼油；A包替换：鸡肉→鸡小胸；西兰花→西兰花；燕麦→全熟燕麦片；蓝莓→蓝莓
  - recipe_id: dog_recipe_008
    category_code: 7
    category_name: 老年犬通用
    category_type: life_stage_size
    life_stage: 老年犬
    dog_size: null
    title: 金枪鱼护心
    labels:
      - 护心
    ingredients:
      - name: 金枪鱼白肉
        percent: 30
      - name: 红薯
        percent: 20
      - name: 菠菜
        percent: 20
      - name: 全熟燕麦片
        percent: 15
      - name: 蓝莓
        percent: 10
    b_pack: 老年犬轻负担营养包B：老年犬维矿预混料（抗氧化支持）1.9 / 低磷钙源或钙磷维护矿物粉 0.8 / EPA-DHA鱼油或藻油 1.3
    c_pack: 心脏健康支持功能包C：牛磺酸/L-肉碱/辅酶Q10 1.0
    notes: 原油脂/钙源移入B包：钙粉、鱼油；A包替换：三文鱼→金枪鱼白肉；燕麦→全熟燕麦片；蓝莓→蓝莓
  - recipe_id: dog_recipe_009
    category_code: 7
    category_name: 老年犬通用
    category_type: life_stage_size
    life_stage: 老年犬
    dog_size: null
    title: 牛肉补能
    labels:
      - 补能
    ingredients:
      - name: 牛肉
        percent: 24.3
      - name: 牛心
        percent: 6
      - name: 红薯
        percent: 25.3
      - name: 胡萝卜
        percent: 15.2
      - name: 西兰花
        percent: 10.1
      - name: 全熟燕麦片
        percent: 10.1
      - name: 蓝莓
        percent: 5
    b_pack: 老年犬轻负担营养包B：老年犬维矿预混料（抗氧化支持）1.9 / 低磷钙源或钙磷维护矿物粉 0.8 / EPA-DHA鱼油或藻油 1.3
    c_pack: 无
    notes: 原油脂/钙源移入B包：鱼油；A包替换：牛肉→牛肉（前腿）；土豆→红薯；西兰花→西兰花；燕麦→全熟燕麦片；蓝莓→蓝莓；牛心按6%加入老年犬牛肉补能线；护肝/低敏线不加入牛心
  - recipe_id: dog_recipe_010
    category_code: 7
    category_name: 老年犬通用
    category_type: life_stage_size
    life_stage: 老年犬
    dog_size: null
    title: 易消化温和
    labels:
      - 温和
      - 易消化
    ingredients:
      - name: 兔里脊
        percent: 30.3
      - name: 红薯
        percent: 25.3
      - name: 南瓜
        percent: 20.2
      - name: 菠菜
        percent: 10.1
      - name: 全熟燕麦片
        percent: 10.1
    b_pack: 老年犬轻负担营养包B：老年犬维矿预混料（抗氧化支持）1.9 / 低磷钙源或钙磷维护矿物粉 0.8 / EPA-DHA鱼油或藻油 1.3
    c_pack: 无
    notes: 原油脂/钙源移入B包：亚麻籽油、钙粉；A包替换：火鸡→兔里脊；燕麦→全熟燕麦片
  - recipe_id: dog_recipe_011
    category_code: 14
    category_name: 低敏单一蛋白
    category_type: functional
    life_stage: null
    dog_size: null
    title: 金枪鱼单一低敏
    labels:
      - 低敏
    ingredients:
      - name: 金枪鱼白肉
        percent: 45
      - name: 红薯
        percent: 25
      - name: 冬瓜丁
        percent: 15
      - name: 全熟燕麦片
        percent: 10
    b_pack: 低敏单一蛋白营养包B：低敏维矿预混料 2.0 / 低敏钙源矿物粉（不含动物蛋白载体）1.2 / 藻油或高度精炼低敏油脂 0.8
    c_pack: 肠胃健康支持功能包C（低敏版）：FOS/MOS益生元/后生元/低敏载体 1.0
    notes: 原油脂/钙源移入B包：鱼油；A包替换：白鱼→金枪鱼白肉；土豆→红薯；西葫芦→冬瓜丁；燕麦→全熟燕麦片；低敏款保持单一动物蛋白原则；不建议混牛+鸡；低敏线保持单一动物蛋白，不混牛心/鸡心/虾仁/鲍鱼/海茄子/海虹
  - recipe_id: dog_recipe_012
    category_code: 14
    category_name: 低敏单一蛋白
    category_type: functional
    life_stage: null
    dog_size: null
    title: 兔肉菠菜单一低敏
    labels:
      - 低敏
    ingredients:
      - name: 兔里脊
        percent: 45
      - name: 红薯
        percent: 25
      - name: 菠菜
        percent: 15
      - name: 全熟燕麦片
        percent: 10
    b_pack: 低敏单一蛋白营养包B：低敏维矿预混料 2.0 / 低敏钙源矿物粉（不含动物蛋白载体）1.2 / 藻油或高度精炼低敏油脂 0.8
    c_pack: 肠胃健康支持功能包C（低敏版）：FOS/MOS益生元/后生元/低敏载体 1.0
    notes: 原油脂/钙源移入B包：亚麻籽油；A包替换：火鸡→兔里脊；燕麦→全熟燕麦片；低敏款保持单一动物蛋白原则；不建议混牛+鸡；低敏线保持单一动物蛋白，不混牛心/鸡心/虾仁/鲍鱼/海茄子/海虹
  - recipe_id: dog_recipe_013
    category_code: 14
    category_name: 低敏单一蛋白
    category_type: functional
    life_stage: null
    dog_size: null
    title: 兔肉红薯单一低敏
    labels:
      - 单一蛋白
      - 低敏
    ingredients:
      - name: 兔里脊
        percent: 49
      - name: 红薯
        percent: 24.5
      - name: 冬瓜丁
        percent: 14.7
      - name: 蓝莓
        percent: 6.8
    b_pack: 低敏单一蛋白营养包B：低敏维矿预混料 2.0 / 低敏钙源矿物粉（不含动物蛋白载体）1.2 / 藻油或高度精炼低敏油脂 0.8
    c_pack: 肠胃健康支持功能包C（低敏版）：FOS/MOS益生元/后生元/低敏载体 1.0
    notes: 原油脂/钙源移入B包：橄榄油；A包替换：鹿肉→兔里脊；西葫芦→冬瓜丁；蓝莓→蓝莓；低敏款保持单一动物蛋白原则；不建议混牛+鸡；低敏线保持单一动物蛋白，不混牛心/鸡心/虾仁/鲍鱼/海茄子/海虹
  - recipe_id: dog_recipe_014
    category_code: 14
    category_name: 低敏单一蛋白
    category_type: functional
    life_stage: null
    dog_size: null
    title: 鸭肉胡萝卜单一低敏
    labels:
      - 低敏
    ingredients:
      - name: 鸭小胸
        percent: 45
      - name: 南瓜
        percent: 25
      - name: 胡萝卜
        percent: 15
      - name: 全熟燕麦片
        percent: 10
    b_pack: 低敏单一蛋白营养包B：低敏维矿预混料 2.0 / 低敏钙源矿物粉（不含动物蛋白载体）1.2 / 藻油或高度精炼低敏油脂 0.8
    c_pack: 肠胃健康支持功能包C（低敏版）：FOS/MOS益生元/后生元/低敏载体 1.0
    notes: 原油脂/钙源移入B包：鱼油；A包替换：羊肉→鸭小胸；燕麦→全熟燕麦片；低敏款保持单一动物蛋白原则；不建议混牛+鸡；低敏线保持单一动物蛋白，不混牛心/鸡心/虾仁/鲍鱼/海茄子/海虹
  - recipe_id: dog_recipe_015
    category_code: 14
    category_name: 低敏单一蛋白
    category_type: functional
    life_stage: null
    dog_size: null
    title: 鸭肉南瓜单一低敏
    labels:
      - 低敏
    ingredients:
      - name: 鸭小胸
        percent: 45
      - name: 南瓜
        percent: 25
      - name: 冬瓜丁
        percent: 15
      - name: 全熟燕麦片
        percent: 10
    b_pack: 低敏单一蛋白营养包B：低敏维矿预混料 2.0 / 低敏钙源矿物粉（不含动物蛋白载体）1.2 / 藻油或高度精炼低敏油脂 0.8
    c_pack: 肠胃健康支持功能包C（低敏版）：FOS/MOS益生元/后生元/低敏载体 1.0
    notes: 原油脂/钙源移入B包：鱼油；A包替换：鸭肉→鸭小胸；西葫芦→冬瓜丁；燕麦→全熟燕麦片；低敏款保持单一动物蛋白原则；不建议混牛+鸡；低敏线保持单一动物蛋白，不混牛心/鸡心/虾仁/鲍鱼/海茄子/海虹
  - recipe_id: dog_recipe_016
    category_code: 11
    category_name: 护肝
    category_type: functional
    life_stage: null
    dog_size: null
    title: 鸡肉姜黄
    labels:
      - 护肝
    ingredients:
      - name: 鸡小胸
        percent: 36.6
      - name: 南瓜
        percent: 26.1
      - name: 胡萝卜
        percent: 15.7
      - name: 全熟燕麦片
        percent: 15.6
    b_pack: 成犬/护肝基础营养包B：成犬维矿预混料 1.8 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）1.0 / Omega-3鱼油或藻油 1.2
    c_pack: 护肝支持功能包C：水飞蓟素/胆碱/牛磺酸/姜黄素 2.0
    notes: 原油脂/钙源移入B包：鱼油；原功能/非供货项移入C包：姜黄；A包替换：鸡肉→鸡小胸；燕麦→全熟燕麦片
  - recipe_id: dog_recipe_017
    category_code: 11
    category_name: 护肝
    category_type: functional
    life_stage: null
    dog_size: null
    title: 鸡肉南瓜
    labels:
      - 护肝
    ingredients:
      - name: 鸡小胸
        percent: 33.9
      - name: 南瓜
        percent: 24.2
      - name: 胡萝卜
        percent: 9.7
      - name: 全熟燕麦片
        percent: 14.5
      - name: 西兰花
        percent: 9.7
      - name: 蓝莓
        percent: 2
    b_pack: 成犬/护肝基础营养包B：成犬维矿预混料 1.8 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）1.0 / Omega-3鱼油或藻油 1.2
    c_pack: 护肝支持功能包C：水飞蓟素/胆碱/牛磺酸 2.0
    notes: 原油脂/钙源移入B包：鱼油；A包替换：鸡肉→鸡小胸；燕麦→全熟燕麦片；西兰花→西兰花；蓝莓→蓝莓
  - recipe_id: dog_recipe_018
    category_code: 11
    category_name: 护肝
    category_type: functional
    life_stage: null
    dog_size: null
    title: 金枪鱼抗氧
    labels:
      - 抗氧
      - 护肝
    ingredients:
      - name: 金枪鱼白肉
        percent: 29.7
      - name: 南瓜
        percent: 19.8
      - name: 菠菜
        percent: 19.8
      - name: 全熟燕麦片
        percent: 14.8
      - name: 蓝莓
        percent: 9.9
    b_pack: 成犬/护肝基础营养包B：成犬维矿预混料 1.8 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）1.0 / Omega-3鱼油或藻油 1.2
    c_pack: 护肝支持功能包C：水飞蓟素/胆碱/牛磺酸 2.0
    notes: 原油脂/钙源移入B包：鱼油；A包替换：三文鱼→金枪鱼白肉；燕麦→全熟燕麦片；蓝莓→蓝莓
  - recipe_id: dog_recipe_019
    category_code: 11
    category_name: 护肝
    category_type: functional
    life_stage: null
    dog_size: null
    title: 牛肉轻负担
    labels:
      - 轻负担
      - 护肝
    ingredients:
      - name: 牛肉
        percent: 29.7
      - name: 南瓜
        percent: 24.7
      - name: 西兰花
        percent: 14.8
      - name: 全熟燕麦片
        percent: 14.8
      - name: 蓝莓
        percent: 10
    b_pack: 成犬/护肝基础营养包B：成犬维矿预混料 1.8 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）1.0 / Omega-3鱼油或藻油 1.2
    c_pack: 护肝支持功能包C：水飞蓟素/胆碱/牛磺酸 2.0
    notes: 原油脂/钙源移入B包：鱼油；A包替换：牛肉→牛肉（前腿）；西兰花→西兰花；燕麦→全熟燕麦片；蓝莓→蓝莓
  - recipe_id: dog_recipe_020
    category_code: 11
    category_name: 护肝
    category_type: functional
    life_stage: null
    dog_size: null
    title: 兔肉低脂
    labels:
      - 低脂
      - 护肝
    ingredients:
      - name: 兔里脊
        percent: 34.6
      - name: 南瓜
        percent: 24.7
      - name: 菠菜
        percent: 14.8
      - name: 全熟燕麦片
        percent: 14.8
      - name: 蓝莓
        percent: 5.1
    b_pack: 成犬/护肝基础营养包B：成犬维矿预混料 1.8 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）1.0 / Omega-3鱼油或藻油 1.2
    c_pack: 护肝支持功能包C：水飞蓟素/胆碱/牛磺酸 2.0
    notes: 原油脂/钙源移入B包：亚麻籽油；A包替换：火鸡→兔里脊；燕麦→全熟燕麦片；蓝莓→蓝莓
  - recipe_id: dog_recipe_021
    category_code: 10
    category_name: 美毛护肤
    category_type: functional
    life_stage: null
    dog_size: null
    title: 鸡肉美毛
    labels:
      - 美毛
    ingredients:
      - name: 鸡小胸
        percent: 34.6
      - name: 南瓜
        percent: 19.8
      - name: 菠菜
        percent: 14.8
      - name: 全熟燕麦片
        percent: 14.8
      - name: 蓝莓
        percent: 10
    b_pack: 成犬/美毛基础营养包B：成犬维矿预混料 1.6 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）0.9 / Omega-3鱼油或藻油 1.5
    c_pack: 美毛护肤支持功能包C：卵磷脂/生物素/有机锌 2.0
    notes: 原油脂/钙源移入B包：亚麻籽油；A包替换：鸡肉→鸡小胸；燕麦→全熟燕麦片；蓝莓→蓝莓
  - recipe_id: dog_recipe_022
    category_code: 10
    category_name: 美毛护肤
    category_type: functional
    life_stage: null
    dog_size: null
    title: 金枪鱼抗炎
    labels:
      - 抗炎
      - 美毛
    ingredients:
      - name: 金枪鱼白肉
        percent: 37.6
      - name: 红薯
        percent: 19.8
      - name: 菠菜
        percent: 14.8
      - name: 全熟燕麦片
        percent: 14.8
      - name: 蓝莓
        percent: 7
    b_pack: 成犬/美毛基础营养包B：成犬维矿预混料 1.6 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）0.9 / Omega-3鱼油或藻油 1.5
    c_pack: 抗炎免疫支持功能包C：酵母β-葡聚糖/天然维生素E/多酚或姜黄素 2.0
    notes: 原油脂/钙源移入B包：鱼油；A包替换：三文鱼→金枪鱼白肉；燕麦→全熟燕麦片；蓝莓→蓝莓
  - recipe_id: dog_recipe_023
    category_code: 10
    category_name: 美毛护肤
    category_type: functional
    life_stage: null
    dog_size: null
    title: 金枪鱼亮毛
    labels:
      - 亮毛
      - 美毛
    ingredients:
      - name: 金枪鱼白肉
        percent: 43.2
      - name: 胡萝卜
        percent: 10.8
      - name: 蓝莓
        percent: 10.8
      - name: 全熟燕麦片
        percent: 16.2
      - name: 菠菜
        percent: 13
    b_pack: 成犬/美毛基础营养包B：成犬维矿预混料 1.6 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）0.9 / Omega-3鱼油或藻油 1.5
    c_pack: 美毛护肤支持功能包C：卵磷脂/生物素/有机锌 2.0
    notes: 原油脂/钙源移入B包：亚麻籽油；原功能/非供货项移入C包：鸡蛋；A包替换：三文鱼→金枪鱼白肉；蓝莓→蓝莓；燕麦→全熟燕麦片
  - recipe_id: dog_recipe_024
    category_code: 10
    category_name: 美毛护肤
    category_type: functional
    life_stage: null
    dog_size: null
    title: 牛肉护肤
    labels:
      - 护肤
      - 美毛
    ingredients:
      - name: 牛肉
        percent: 34.6
      - name: 红薯
        percent: 19.8
      - name: 胡萝卜
        percent: 14.8
      - name: 菠菜
        percent: 9.9
      - name: 全熟燕麦片
        percent: 14.9
    b_pack: 成犬/美毛基础营养包B：成犬维矿预混料 1.6 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）0.9 / Omega-3鱼油或藻油 1.5
    c_pack: 美毛护肤支持功能包C：卵磷脂/生物素/有机锌 2.0
    notes: 原油脂/钙源移入B包：鱼油；A包替换：牛肉→牛肉（前腿）；燕麦→全熟燕麦片
  - recipe_id: dog_recipe_025
    category_code: 10
    category_name: 美毛护肤
    category_type: functional
    life_stage: null
    dog_size: null
    title: 兔肉抗敏
    labels:
      - 抗敏
      - 美毛
    ingredients:
      - name: 兔里脊
        percent: 34.6
      - name: 南瓜
        percent: 19.8
      - name: 西兰花
        percent: 14.8
      - name: 全熟燕麦片
        percent: 14.8
      - name: 蓝莓
        percent: 10
    b_pack: 成犬/美毛基础营养包B：成犬维矿预混料 1.6 / 成犬钙磷维护矿物粉（Ca:P≈1.2–1.4:1）0.9 / Omega-3鱼油或藻油 1.5
    c_pack: 美毛护肤支持功能包C：卵磷脂/生物素/有机锌 2.0
    notes: 原油脂/钙源移入B包：亚麻籽油；A包替换：火鸡→兔里脊；西兰花→西兰花；燕麦→全熟燕麦片；蓝莓→蓝莓
  - recipe_id: dog_recipe_026
    category_code: 3
    category_name: 控钙幼犬（大型幼犬）
    category_type: life_stage_size
    life_stage: 幼犬
    dog_size: 大型犬
    title: 鸡肉蔬菜成长
    labels:
      - 控钙
    ingredients:
      - name: 鸡小胸
        percent: 38.4
      - name: 南瓜
        percent: 20.2
      - name: 西兰花
        percent: 15.2
      - name: 胡萝卜
        percent: 10.1
      - name: 全熟燕麦片
        percent: 12.1
    b_pack: 大型幼犬稳骨控钙营养包B：大型幼犬低钙维矿预混料 1.8 / 控钙钙磷矿物粉（低钙，Ca:P≈1.2:1）0.9 / DHA-EPA鱼油或藻油 1.3
    c_pack: 无
    notes: 原油脂/钙源移入B包：钙粉、鱼油；A包替换：鸡肉→鸡小胸；西兰花→西兰花；糙米→全熟燕麦片
  - recipe_id: dog_recipe_027
    category_code: 3
    category_name: 控钙幼犬（大型幼犬）
    category_type: life_stage_size
    life_stage: 幼犬
    dog_size: 大型犬
    title: 鸡肉稳生长
    labels:
      - 控钙
    ingredients:
      - name: 鸡小胸
        percent: 39.6
      - name: 鸡心
        percent: 9.9
      - name: 红薯
        percent: 19.8
      - name: 冬瓜丁
        percent: 9.9
      - name: 胡萝卜
        percent: 9.9
      - name: 全熟燕麦片
        percent: 6.9
    b_pack: 大型幼犬稳骨控钙营养包B：大型幼犬低钙维矿预混料 1.8 / 控钙钙磷矿物粉（低钙，Ca:P≈1.2:1）0.9 / DHA-EPA鱼油或藻油 1.3
    c_pack: 无
    notes: 原油脂/钙源移入B包：钙粉、鱼油；A包替换：鸡胸肉→鸡小胸；西葫芦→冬瓜丁；燕麦→全熟燕麦片
  - recipe_id: dog_recipe_028
    category_code: 3
    category_name: 控钙幼犬（大型幼犬）
    category_type: life_stage_size
    life_stage: 幼犬
    dog_size: 大型犬
    title: 金枪鱼缓生长
    labels:
      - 控钙
    ingredients:
      - name: 金枪鱼白肉
        percent: 35.4
      - name: 红薯
        percent: 20.2
      - name: 菠菜
        percent: 15.2
      - name: 全熟燕麦片
        percent: 15.2
      - name: 冬瓜丁
        percent: 10
    b_pack: 大型幼犬稳骨控钙营养包B：大型幼犬低钙维矿预混料 1.8 / 控钙钙磷矿物粉（低钙，Ca:P≈1.2:1）0.9 / DHA-EPA鱼油或藻油 1.3
    c_pack: 无
    notes: 原油脂/钙源移入B包：钙粉、鱼油；A包替换：三文鱼→金枪鱼白肉；燕麦→全熟燕麦片；西葫芦→冬瓜丁
  - recipe_id: dog_recipe_029
    category_code: 3
    category_name: 控钙幼犬（大型幼犬）
    category_type: life_stage_size
    life_stage: 幼犬
    dog_size: 大型犬
    title: 牛肉控制成长
    labels:
      - 控钙
    ingredients:
      - name: 牛肉
        percent: 35.4
      - name: 红薯
        percent: 20.2
      - name: 胡萝卜
        percent: 15.2
      - name: 西兰花
        percent: 10.1
      - name: 全熟燕麦片
        percent: 15.1
    b_pack: 大型幼犬稳骨控钙营养包B：大型幼犬低钙维矿预混料 1.8 / 控钙钙磷矿物粉（低钙，Ca:P≈1.2:1）0.9 / DHA-EPA鱼油或藻油 1.3
    c_pack: 无
    notes: 原油脂/钙源移入B包：钙粉、鱼油；A包替换：牛肉→牛肉（前腿）；西兰花→西兰花；燕麦→全熟燕麦片
  - recipe_id: dog_recipe_030
    category_code: 3
    category_name: 控钙幼犬（大型幼犬）
    category_type: life_stage_size
    life_stage: 幼犬
    dog_size: 大型犬
    title: 兔肉低钙成长
    labels:
      - 控钙
    ingredients:
      - name: 兔里脊
        percent: 41.3
      - name: 南瓜
        percent: 20.6
      - name: 全熟燕麦片
        percent: 15.5
      - name: 西兰花
        percent: 10.3
      - name: 菠菜
        percent: 8.3
    b_pack: 大型幼犬稳骨控钙营养包B：大型幼犬低钙维矿预混料 1.8 / 控钙钙磷矿物粉（低钙，Ca:P≈1.2:1）0.9 / DHA-EPA鱼油或藻油 1.3
    c_pack: 无
    notes: 原油脂/钙源移入B包：亚麻籽油、钙粉；A包替换：火鸡→兔里脊；糙米→全熟燕麦片；青豆移出基础A包，以西兰花替代，控钙幼犬线保持低风险食材
  - recipe_id: dog_recipe_031
    category_code: 1
    category_name: 幼犬通用
    category_type: life_stage_size
    life_stage: 幼犬
    dog_size: null
    title: 鸡肉藜麦均衡
    labels:
      - 均衡
    ingredients:
      - name: 鸡小胸
        percent: 35.4
      - name: 鸡心
        percent: 10.1
      - name: 全熟燕麦片
        percent: 20.2
      - name: 西兰花
        percent: 10.1
      - name: 红薯
        percent: 15.2
      - name: 蓝莓
        percent: 5
    b_pack: 幼犬成长营养包B：幼犬维矿预混料 1.6 / 成长期钙磷矿物粉（Ca:P≈1.3:1）1.4 / DHA-EPA鱼油或藻油 1.0
    c_pack: 无
    notes: 原油脂/钙源移入B包：钙粉、鱼油；A包替换：鸡胸肉→鸡小胸；藜麦→全熟燕麦片；西兰花→西兰花；蓝莓→蓝莓
  - recipe_id: dog_recipe_032
    category_code: 1
    category_name: 幼犬通用
    category_type: life_stage_size
    life_stage: 幼犬
    dog_size: null
    title: 鸡肉藜麦免疫餐
    labels:
      - 免疫增强
    ingredients:
      - name: 鸡小胸
        percent: 35
      - name: 鸡心
        percent: 10
      - name: 全熟燕麦片
        percent: 20
      - name: 西兰花
        percent: 10
      - name: 红薯
        percent: 15
      - name: 蓝莓
        percent: 5
    b_pack: 幼犬成长营养包B：幼犬维矿预混料 1.6 / 成长期钙磷矿物粉（Ca:P≈1.3:1）1.4 / DHA-EPA鱼油或藻油 1.0
    c_pack: 抗炎免疫支持功能包C：酵母β-葡聚糖/可溶性膳食纤维/天然抗氧化物 1.0
    notes: 原油脂/钙源移入B包：钙粉、鱼油；A包替换：鸡胸肉→鸡小胸；藜麦→全熟燕麦片；西兰花→西兰花；蓝莓→蓝莓
  - recipe_id: dog_recipe_033
    category_code: 1
    category_name: 幼犬通用
    category_type: life_stage_size
    life_stage: 幼犬
    dog_size: null
    title: 鸡肉苹果成长餐
    labels:
      - 成长
      - 易消化
    ingredients:
      - name: 鸡小胸
        percent: 31
      - name: 鸡肝
        percent: 9.7
      - name: 鸡心
        percent: 12.6
      - name: 苹果
        percent: 8.7
      - name: 全熟燕麦片
        percent: 3.9
      - name: 西兰花
        percent: 5.8
      - name: 红薯
        percent: 9.7
      - name: 南瓜
        percent: 8.7
      - name: 山药丁
        percent: 5.9
    b_pack: 幼犬成长营养包B：幼犬维矿预混料 1.6 / 成长期钙磷矿物粉（Ca:P≈1.3:1）1.4 / DHA-EPA鱼油或藻油 1.0
    c_pack: 无
    notes: A包替换：鸡胸肉→鸡小胸；燕麦→全熟燕麦片；山药→山药丁；青豆移出基础A包，以西兰花替代，降低豆类熟化不足和配方争议风险
  - recipe_id: dog_recipe_034
    category_code: 1
    category_name: 幼犬通用
    category_type: life_stage_size
    life_stage: 幼犬
    dog_size: null
    title: 鸡肉土豆成长
    labels:
      - 成长
    ingredients:
      - name: 鸡小胸
        percent: 39.2
      - name: 红薯
        percent: 20.6
      - name: 胡萝卜
        percent: 10.3
      - name: 冬瓜丁
        percent: 10.3
      - name: 全熟燕麦片
        percent: 15.6
    b_pack: 幼犬成长营养包B：幼犬维矿预混料 1.6 / 成长期钙磷矿物粉（Ca:P≈1.3:1）1.4 / DHA-EPA鱼油或藻油 1.0
    c_pack: 无
    notes: 原油脂/钙源移入B包：钙粉、鱼油；A包替换：鸡胸肉→鸡小胸；土豆→红薯；西葫芦→冬瓜丁；糙米→全熟燕麦片
  - recipe_id: dog_recipe_035
    category_code: 1
    category_name: 幼犬通用
    category_type: life_stage_size
    life_stage: 幼犬
    dog_size: null
    title: 金枪鱼南瓜脑发育
    labels:
      - DHA
      - 脑发育
    ingredients:
      - name: 金枪鱼白肉
        percent: 34.8
      - name: 鸡肝
        percent: 8
      - name: 全熟燕麦片
        percent: 14.9
      - name: 南瓜
        percent: 14.9
      - name: 胡萝卜
        percent: 9.9
      - name: 西兰花
        percent: 7
      - name: 蓝莓
        percent: 5
    b_pack: 幼犬成长营养包B：幼犬维矿预混料 1.6 / 成长期钙磷矿物粉（Ca:P≈1.3:1）1.4 / DHA-EPA鱼油或藻油 1.0
    c_pack: 脑发育支持功能包C：DHA藻油/牛磺酸/胆碱 1.5
    notes: 原油脂/钙源移入B包：蛋壳粉、鱼油；A包替换：三文鱼→金枪鱼白肉；燕麦→全熟燕麦片；西兰花→西兰花；蓝莓→蓝莓
  - recipe_id: dog_recipe_036
    category_code: 1
    category_name: 幼犬通用
    category_type: life_stage_size
    life_stage: 幼犬
    dog_size: null
    title: 金枪鱼燕麦成长
    labels:
      - 成长
    ingredients:
      - name: 金枪鱼白肉
        percent: 37.3
      - name: 全熟燕麦片
        percent: 21.3
      - name: 南瓜
        percent: 16
      - name: 胡萝卜
        percent: 10.7
      - name: 菠菜
        percent: 10.7
    b_pack: 幼犬成长营养包B：幼犬维矿预混料 1.6 / 成长期钙磷矿物粉（Ca:P≈1.3:1）1.4 / DHA-EPA鱼油或藻油 1.0
    c_pack: 无
    notes: 原油脂/钙源移入B包：钙粉、鱼油；A包替换：三文鱼→金枪鱼白肉；燕麦→全熟燕麦片
  - recipe_id: dog_recipe_037
    category_code: 1
    category_name: 幼犬通用
    category_type: life_stage_size
    life_stage: 幼犬
    dog_size: null
    title: 牛肉高蛋白成长
    labels:
      - 成长
    ingredients:
      - name: 牛肉
        percent: 34.4
      - name: 牛心
        percent: 6
      - name: 牛肝
        percent: 8.1
      - name: 全熟燕麦片
        percent: 15.2
      - name: 南瓜
        percent: 15.2
      - name: 胡萝卜
        percent: 10.1
      - name: 菠菜
        percent: 7
    b_pack: 幼犬成长营养包B：幼犬维矿预混料 1.6 / 成长期钙磷矿物粉（Ca:P≈1.3:1）1.4 / DHA-EPA鱼油或藻油 1.0
    c_pack: 无
    notes: 原油脂/钙源移入B包：亚麻籽油、钙粉；A包替换：牛肉→牛肉（前腿）；糙米→全熟燕麦片；牛心按6%加入牛肉成长线，控制在5%–8%范围内
  - recipe_id: dog_recipe_038
    category_code: 1
    category_name: 幼犬通用
    category_type: life_stage_size
    life_stage: 幼犬
    dog_size: null
    title: 牛肉红薯活力餐
    labels:
      - 高能量
    ingredients:
      - name: 牛肉
        percent: 30.4
      - name: 牛心
        percent: 5
      - name: 牛肝
        percent: 8.1
      - name: 红薯
        percent: 20.2
      - name: 胡萝卜
        percent: 10.1
      - name: 西兰花
        percent: 10.1
      - name: 全熟燕麦片
        percent: 10.1
      - name: 蓝莓
        percent: 2
    b_pack: 幼犬成长营养包B：幼犬维矿预混料 1.6 / 成长期钙磷矿物粉（Ca:P≈1.3:1）1.4 / DHA-EPA鱼油或藻油 1.0
    c_pack: 无
    notes: 原油脂/钙源移入B包：钙粉、鱼油；A包替换：牛肉→牛肉（前腿）；西兰花→西兰花；糙米→全熟燕麦片；蓝莓→蓝莓；牛心按5%加入牛肉成长/活力线，增加副蛋白多样性；牛肉前腿相应下调
  - recipe_id: dog_recipe_039
    category_code: 1
    category_name: 幼犬通用
    category_type: life_stage_size
    life_stage: 幼犬
    dog_size: null
    title: 兔肉南瓜肠胃餐
    labels:
      - 肠胃友好
    ingredients:
      - name: 兔里脊
        percent: 35
      - name: 南瓜
        percent: 20
      - name: 全熟燕麦片
        percent: 20
      - name: 胡萝卜
        percent: 10
      - name: 菠菜
        percent: 8
      - name: 苹果
        percent: 2
    b_pack: 幼犬成长营养包B：幼犬维矿预混料 1.6 / 成长期钙磷矿物粉（Ca:P≈1.3:1）1.4 / DHA-EPA鱼油或藻油 1.0
    c_pack: 肠胃健康支持功能包C：FOS/MOS益生元/益生菌或后生元/低敏载体 1.0
    notes: 原油脂/钙源移入B包：亚麻籽油、钙粉；A包替换：火鸡肉→兔里脊；燕麦→全熟燕麦片
  - recipe_id: dog_recipe_040
    category_code: 1
    category_name: 幼犬通用
    category_type: life_stage_size
    life_stage: 幼犬
    dog_size: null
    title: 鸭肉红薯成长
    labels:
      - 成长
    ingredients:
      - name: 鸭小胸
        percent: 40.4
      - name: 红薯
        percent: 20.2
      - name: 西兰花
        percent: 10.1
      - name: 胡萝卜
        percent: 10.1
      - name: 全熟燕麦片
        percent: 15.2
    b_pack: 幼犬成长营养包B：幼犬维矿预混料 1.6 / 成长期钙磷矿物粉（Ca:P≈1.3:1）1.4 / DHA-EPA鱼油或藻油 1.0
    c_pack: 无
    notes: 原油脂/钙源移入B包：亚麻籽油、钙粉；A包替换：火鸡→鸭小胸；西兰花→西兰花；燕麦→全熟燕麦片
```
