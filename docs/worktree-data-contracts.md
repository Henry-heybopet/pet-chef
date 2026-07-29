# Pet Chef worktree 数据交互与存储规则

更新时间：2026-06-27

## 1. 工作区分工

```text
你现在一共有 10 个 worktree 工作区：

1.  /Users/yhl/Antigravity/pet chef                  Ver-B1.00 主工作区 / App 集成入口
2.  /Users/yhl/Antigravity/pet-chef-tuya-sdk         Tuya SDK / 设备配网 / DP 联调
3.  /Users/yhl/Antigravity/pet-chef-account-auth     账号 / 登录旧实现参考，后续合并或废弃
4.  /Users/yhl/Antigravity/pet-chef-account-system   Heybo 账号系统 / 登录主方向
5.  /Users/yhl/Antigravity/pet-chef-payments         支付总工作区
6.  /Users/yhl/Antigravity/pet-chef-db-schema        数据库 / Prisma / 数据契约
7.  /Users/yhl/Antigravity/pet-chef-deploy           部署 / Docker / Nginx / ECS
8.  /Users/yhl/Antigravity/pet-chef-native-shell     iOS / Android 壳 / 原生能力桥接
9.  /Users/yhl/Antigravity/pet-chef-ai-recipe-rules  AI 食谱 / 营养规则 / 安全规则
10. /Users/yhl/Antigravity/pet-chef-wechat-app-pay   微信支付旧工作区，后续并入 payments 后废弃
```

## 2. 总原则

1. `pet chef` 主工作区是 App 集成入口和业务编排层。
2. `pet-chef-db-schema` 是长期数据命名和表结构的唯一准口径。
3. Tuya SDK、支付、账号、AI 食谱等工作区不直接互相写数据；它们通过主工作区或后端 API 交换数据。
4. 长期业务数据必须进数据库；过程临时状态可以进内存/缓存；排错过程写日志文件。
5. 日志只用于追踪和审计，不能作为业务数据的唯一存储。

## 3. 数据流关系

| 上游工作区 | 下游工作区 | 交互数据 | 存储位置 | 备注 |
| --- | --- | --- | --- | --- |
| `pet-chef-tuya-sdk` | `pet chef` | `tuya_device_id`、`tuya_home_id`、`tuya_pid`、设备在线状态、DP 上报、DP 下发结果 | 主工作区接收后写入 DB 或日志 | Tuya SDK 不直接写数据库 |
| `pet chef` | `pet-chef-db-schema` | 用户、家庭、宠物、设备、食谱、烹饪、喂食、健康、订单、支付 | PostgreSQL / Prisma | 长期业务数据都按 schema 存 |
| `pet-chef-account-system` | `pet chef` | `user_id`、`identity_id`、`household_id`、登录会话、Tuya UID 映射 | `users`、`user_identities`、`households`、`tuya_user_mappings` | Heybo 账号是主账号，Tuya 账号是映射 |
| `pet-chef-payments` | `pet chef` | `order_id`、`payment_id`、支付状态、支付平台流水号、回调结果 | `orders`、`payments`、支付回调日志 | 中国区第一阶段微信支付，海外第一阶段 Stripe Card |
| `pet-chef-native-shell` | `pet chef` | 原生能力结果：Tuya 配网、扫码、微信/Apple/Google 登录、支付 App 拉起结果 | 结果回传主业务层，再决定写 DB 或日志 | 原生壳不保存长期业务数据 |
| `pet-chef-ai-recipe-rules` | `pet chef` | 推荐食谱、AI 生成食谱、营养分析、禁忌检查结果 | `recipes`、`recipe_sources`、`cooking_operations` 快照 | 医疗/营养结论必须保留来源 |
| `pet-chef-deploy` | 全部 | 环境变量、服务地址、日志路径、备份策略 | ECS / Docker / Nginx / 对象存储 | 不产生业务数据，只管理运行环境 |
| `pet-chef-wechat-app-pay` | `pet-chef-payments` | 微信 App Pay 下单、通知验签、支付回调实现 | 迁移到 payments 后，旧工作区只做历史参考 | 不再新增业务规则 |
| `pet-chef-account-auth` | `pet-chef-account-system` | 工厂测试账号、JWT 小修、兼容接口 | 合并到 account-system 后，旧工作区只做历史参考 | 不再作为主方向 |

## 4. 统一命名规则

### 4.1 ID 命名

| 名称 | 含义 | 示例 | 规则 |
| --- | --- | --- | --- |
| `user_id` | Heybo 用户主 ID | `usr_xxx` | 业务主账号 ID |
| `identity_id` | 登录身份 ID | `idt_xxx` | 手机、邮箱、微信、Apple、Google 都是 identity |
| `household_id` | 家庭空间 ID | `hhd_xxx` | 宠物、设备、订单、记录都归属家庭 |
| `pet_id` | 宠物 ID | `pet_xxx` | 一户可多宠 |
| `device_id` | Heybo 内部设备绑定 ID | `dev_xxx` | App 和数据库使用这个做内部引用 |
| `tuya_device_id` | Tuya 设备 ID | 工厂/涂鸦返回 | 外部设备 ID，不替代 `device_id` |
| `tuya_pid` | Tuya 产品 PID | `ak2kofibhuvdtqip` | 标识硬件产品定义 |
| `tuya_home_id` | Tuya 家庭 ID | Tuya 返回 | 只用于 Tuya SDK/Home 体系 |
| `mac_address` | 设备 MAC 地址 | `AA:BB:CC:DD:EE:FF` | App 从 Tuya SDK `DeviceBean.getMac()` 上报，后端规范化为大写冒号格式 |
| `recipe_id` | 食谱 ID | `rcp_xxx` | 标准食谱或审核后的 AI 食谱 |
| `cooking_operation_id` | 一次烹饪操作 ID | `cop_xxx` | 连接宠物、食谱、设备和 DP 指令 |
| `feeding_record_id` | 喂食记录 ID | `fee_xxx` | 可由烹饪完成自动生成 |
| `order_id` | 订单 ID | `ord_xxx` | 商城订单 |
| `payment_id` | 支付流水 ID | `pay_xxx` | 支付回调和对账使用 |
| `request_id` | 单次请求链路 ID | `req_xxx` | 写日志，不做业务主键 |

### 4.2 DP 命名

| 字段 | 含义 | 存储规则 |
| --- | --- | --- |
| `dp_id` | Tuya DP 数字 ID，例如 `9` | 原样保留，用于和工厂、Tuya 平台核对 |
| `dp_code` | Tuya DP 标识符，例如 `cook_temperature` | 业务代码优先使用这个 |
| `dp_value` | DP 当前值或下发值 | 按 Tuya 类型保留 bool/string/number/object |
| `dp_type` | Tuya 类型：bool、enum、value、fault、raw | 存 DP 映射表，不要每次重复写 |
| `dp_direction` | `rw` / `ro` | 存 DP 映射表 |
| `tuya_dp_payload` | 一次下发或上报的完整 DP 快照 | 存 `cooking_operations` 或日志 |

第一阶段 85 摄氏度 DIY 烹饪的标准下发快照：

```json
{
  "power": true,
  "mode": "diy",
  "cook_time": 1200,
  "cook_temperature": 85,
  "cook_mode_power": 8,
  "cook_mode_speed": "1",
  "cook_s_p_r": "start"
}
```

需要同时保留原始 DP ID 版本：

```json
{
  "1": true,
  "3": "diy",
  "7": 1200,
  "9": 85,
  "102": 8,
  "108": "1",
  "107": "start"
}
```

## 5. 长期数据库存储

这些数据必须进入数据库，并参与备份：

| 数据 | 表/集合 | 说明 |
| --- | --- | --- |
| 用户账号 | `users`、`user_identities` | 手机、邮箱、微信、Apple、Google 都映射到同一个 Heybo 用户 |
| 家庭 | `households`、`household_members` | 后续支持多人家庭 |
| 宠物档案 | `pets` | 基础档案长期保存 |
| 健康变化 | `health_records` | 14 天观察周期和长期 30/60/90/180/360 天记录 |
| 医疗数据 | `medical_records`、`vet_reviews` | 化验单、医院截图、医生审核结果 |
| 设备绑定 | `devices`、`device_pet_bindings` | 内部 `device_id` + 外部 `tuya_device_id` |
| 烹饪操作 | `cooking_operations` | 每次启动/暂停/完成/失败都要留记录 |
| 喂食记录 | `feeding_records` | 连接宠物、食谱、烹饪结果 |
| 食谱 | `recipes`、`recipe_sources` | 内置、AI、医生、兽医认证来源 |
| 商城 | `products`、`skus`、`orders`、`order_items`、`payments` | 支付和订单必须可对账 |
| 关键审计 | `audit_logs` | 登录、绑定、支付、医生审核、数据删除 |

### 5.1 宠物档案 (pets) 元数据定义

**主数据规则：**
* `pets` 是宠物档案唯一可信来源。页面 state、localStorage、AI 输入页对象只能作为草稿或展示缓存。
* AI 营养分析、配餐推荐、配方比较、烹饪参数计算等正式业务流程必须优先传 `pet_id`，由后端按 `user_id + pet_id` 读取已保存宠物档案。
* AI/推荐缓存必须绑定 `pets.updated_at`。宠物档案修改后，旧缓存必须失效并重新生成。
* 前端 camelCase 字段进入后端时必须映射为 `pets` 表字段，例如 `birthDate -> birth_date`、`weight -> current_weight_kg`、`targetWeight -> target_weight_kg`、`feedingGoal -> feeding_goal`。
* 中文文案只用于展示；业务判断使用 `feeding_goal`、`life_stage`、`activity_level` 等正式枚举值。

### 5.2 食谱与食材库主数据

**主数据规则：**
* `recipes` 和 `ingredient_library` 是推荐、AI、烹饪参数、安全检查的正式来源。
* 运行时业务代码应通过统一 repository/service 读取食谱和食材；`recipes_db.js`、`ingredients_db.js` 只作为 seed/mock/fallback。
* 食谱对外兼容字段可以由 service 映射，例如 `health_tags -> tags`、`cooking_profile -> cooking_base`，但接口内部不得各自重复解析正式表字段。

**基础档案：**
* `id` (String, 主键): `pet_xxx` 格式
* `name` (String): 宠物姓名
* `species` (PetSpecies, 必填): `dog` (狗) / `cat` (猫)
* `breed` (String, 可选): 宠物品种
* `sex` (PetSex, 可选): `male` (公) / `female` (母) / `unknown` (未知)
* `neutered` (Boolean, 必填): 绝育状态
* `birth_date` (DateTime, 可选): 出生日期
* `age_months` (Int, 可选): 缓存月龄，配合出生日期计算
* `current_weight_kg` (Float, 可选): 当前体重
* `target_weight_kg` (Float, 可选): 目标体重
* `body_condition_score` (String, 可选): BCS 体况评分 (1-9 分制)
* `activity_level` (ActivityLevel, 默认 medium): 活动水平。可选值：`low` (低)、`medium` (中)、`high` (高)、`working` (工作犬)
* `life_stage` (LifeStage, 默认 adult): 生命阶段。可选值：`puppy` (幼宠)、`adult` (成宠)、`senior` (老年宠)
* `feeding_goal` (FeedingGoal, 可选): 喂养目标。可选值：
  * `maintenance` (维持)
  * `weight_loss` (减重)
  * `muscle_gain` (增肌)
  * `post_surgery_recovery` (术后恢复)
  * `coat_care` (美毛)
  * `gastrointestinal_care` (护肠胃)
* `body_size` (BodySize, 可选): 宠物体型。根据品种给默认推荐，用户可修改。可选值：
  * `mini` (迷你型)
  * `small` (小型)
  * `medium` (中型)
  * `large` (大型)
  * `giant` (巨型)
* `environment` (Environment, 可选): 喂养环境。可选值：`indoor` (室内)、`outdoor` (室外)、`mixed` (混合)

**健康档案：**
* `health_tags` (Json, 默认 `[]`): 宠物健康问题标签列表 (如 `["obesity", "cardiac", "kidney"]` 等)
* `allergens` (Json, 默认 `[]`): 过敏源标签列表 (如 `["chicken", "beef", "fish", "egg", "dairy", "grain", "soybean", "other"]` 等)
* `allergy_symptoms` (Json, 默认 `[]`): 过敏表现 (如 `["itching" 皮肤瘙痒, "loose_stool" 软便, "vomiting" 呕吐, "ear_infection" 耳朵发炎, "tear_stain" 泪痕, "other"]` 等)
* `allergy_severity` (AllergySeverity, 可选): 过敏程度。可选值：`mild` (轻微)、`moderate` (中等)、`severe` (严重)
* `special_period` (SpecialPeriod, 可选): 宠物特殊生理/休养时期。可选值：
  * `pregnancy` (妊娠期)
  * `lactation` (哺乳期)
  * `post_op_rest` (术后休养期)
  * `illness_recovery` (病后恢复)
* `food_restrictions` (Json, 默认 `[]`): 忌口/偏好食材列表 (非临床过敏源)
* `doctor_notes` (String, 可选): 医生备注
* `user_notes` (String, 可选): 用户备注

## 6. 临时状态存储

这些数据不作为长期业务事实，只保留短期：

| 数据 | 推荐位置 | 保留时间 | 说明 |
| --- | --- | --- | --- |
| 页面临时输入 | 前端状态 / localStorage | 当前会话 | 未提交宠物档案、未提交食谱草稿 |
| Tuya 配网过程状态 | App 内存 / 短期缓存 | 24 小时以内 | Wi-Fi 名、配网进度、BLE 扫描结果 |
| 设备实时 DP 状态 | 内存 / Redis / 最新状态缓存 | 7 天以内 | 用于页面实时展示，关键变化另写 DB |
| 烹饪倒计时 | App 内存 / 设备上报 | 当前操作 | 完成后只保留 `cooking_operations` 结果 |
| 支付拉起临时参数 | 后端缓存 / payment 记录快照 | 24 小时以内 | 订单最终状态以后端回调为准 |
| 短信/邮箱验证码 | Redis / 短期表 | 5-15 分钟 | 不进长期业务表 |

## 7. 日志文件规则

日志用于排错、审计和联调，不替代数据库。

### 7.1 日志分类

| 日志类型 | 文件建议 | 内容 |
| --- | --- | --- |
| API 请求日志 | `logs/api/YYYY-MM-DD.log` | `request_id`、路径、状态码、耗时、用户匿名 ID |
| Tuya 设备日志 | `logs/tuya/YYYY-MM-DD.log` | 配网、绑定、DP 下发、DP 上报、错误码 |
| 烹饪流程日志 | `logs/cooking/YYYY-MM-DD.log` | `cooking_operation_id`、阶段、DP 快照、设备响应 |
| 支付日志 | `logs/payment/YYYY-MM-DD.log` | `order_id`、`payment_id`、平台、回调状态；禁止写完整密钥 |
| 账号安全日志 | `logs/auth/YYYY-MM-DD.log` | 登录、验证码、绑定、失败次数、IP 摘要 |
| 系统错误日志 | `logs/error/YYYY-MM-DD.log` | 异常堆栈、服务名、`request_id` |

### 7.2 日志字段

所有结构化日志至少包含：

```json
{
  "timestamp": "2026-06-27T20:00:00+08:00",
  "level": "info",
  "service": "tuya_integration_service",
  "request_id": "req_xxx",
  "user_id": "usr_xxx",
  "household_id": "hhd_xxx",
  "device_id": "dev_xxx",
  "event": "tuya_dp_reported",
  "message": "DP status changed"
}
```

敏感字段处理：

- 手机号、邮箱、Token、AppSecret、支付密钥不能写明文日志。
- `tuya_device_id` 可以写日志，但对外导出时要脱敏。
- 医疗附件 URL、支付回调原文只允许写摘要或内部对象存储引用。

### 7.3 日志保留

| 日志 | 保留时间 | 备份 |
| --- | --- | --- |
| 普通 API 日志 | 30 天 | 不长期备份 |
| Tuya 联调日志 | 90 天 | 工厂联调期可单独归档 |
| 支付日志 | 180 天以上 | 必须备份，便于对账 |
| 账号安全日志 | 180 天以上 | 必须备份 |
| 医疗/医生审核审计 | 与业务数据同周期 | 必须备份 |
| 错误日志 | 90 天 | 可按严重级别延长 |

## 8. 关键链路示例

### 8.1 设备绑定

```text
native-shell / tuya-sdk
  -> Tuya SDK 配网成功，得到 tuya_device_id / tuya_home_id / tuya_pid
  -> pet chef 主业务层校验当前 Heybo user_id / household_id
  -> 写入 devices
  -> 可选写入 device_pet_bindings
  -> Tuya 配网过程写 logs/tuya
```

### 8.2 一键启动 85°C DIY 鲜食烹饪

```text
pet chef
  -> 读取 user_id / household_id / pet_id / device_id / recipe_id
  -> AI 或规则生成 cooking_params_snapshot
  -> 转换成 tuya_dp_payload
  -> 调用 tuya-sdk 下发 DP
  -> 写 cooking_operations.tuya_command_snapshot
  -> DP 实时状态写短期状态缓存和 logs/tuya
  -> 完成后写 feeding_records
```

### 8.3 健康变化记录

```text
pet chef
  -> 用户按 14 天观察周期录入体重、粪便、食欲、皮肤毛发、活跃度
  -> 写 health_records
  -> AI 食谱规则读取 health_records + feeding_records + medical_records
  -> 生成推荐时保留 recipe_sources / recommendation 快照
```

## 9. 禁止事项

1. 禁止在 Tuya SDK 工作区直接写数据库。
2. 禁止把 `tuya_device_id` 当作内部 `device_id` 使用。
3. 禁止只把烹饪结果写日志，不写 `cooking_operations`。
4. 禁止支付成功只相信 App 返回；必须以后端回调/查单为准。
5. 禁止把长期业务数据只存在前端 localStorage。
6. 禁止日志写明文手机号、邮箱、Token、AppSecret、支付私钥。

## 10. 下一步落地

1. `pet-chef-db-schema` 根据本文件补齐 Prisma schema。
2. `pet-chef-tuya-sdk` 按 `dp_id` + `dp_code` 双轨输出 DP 数据。
3. `pet chef` 主工作区只接收标准字段，不直接使用各 SDK 的原始命名。
4. `pet-chef-deploy` 统一日志目录、轮转和备份策略。
