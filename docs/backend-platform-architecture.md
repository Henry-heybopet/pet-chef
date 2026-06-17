# Heybo 后端业务平台层架构

## 定位

本文定义 Heybo Pet 后端业务平台层的模块边界、数据表蓝图和服务职责，为当前 JSON MVP 之后的真实数据库迁移做准备。

当前后端 MVP 已经通过 `backend/src/services/heybo_store.js` 提供一组可演示的业务能力：账号 mock 登录、默认家庭、宠物档案、设备绑定、烹饪记录、喂食记录、健康/医疗记录、商品和订单。这个阶段的重点是跑通 App 与设备/食谱/记录的闭环，不追求数据库范式、权限模型和支付履约完整性。

未来数据库版本需要把这些能力拆成稳定的业务模块，并把 JSON 中混合在一起的数组拆为有所有权、有索引、有迁移路径的数据表或集合。

## 当前 JSON MVP 与未来数据库版本的差异

| 维度 | 当前 JSON MVP | 未来数据库版本 |
| --- | --- | --- |
| 存储方式 | `backend/.data/heybo-db.json`，进程内读写 | PostgreSQL / MySQL / MongoDB 等真实数据库 |
| 数据一致性 | 单进程演示可用，缺少事务和并发控制 | 订单、支付、设备指令、记录写入需要事务或幂等键 |
| 模块边界 | `heybo_store.js` 混合处理账号、家庭、宠物、设备、订单 | 按 account、household、pet、device、recipe、cooking、commerce 等服务拆分 |
| 权限模型 | 通过用户 ID 和 household 简单判断 | 家庭成员、角色、后台管理员、医疗数据权限需要独立策略 |
| 表结构 | 数组字段灵活，部分字段随 payload 演化 | 字段、索引、外键/引用、枚举、软删除策略需要固定 |
| 设备记录 | `device_operation_records` 作为通用设备操作数组 | 迁移为 `cooking_operations`，保存烹饪状态机、指令快照和失败原因 |
| 商品订单 | `products` 直接带价格，`order_items` 作为辅助数组 | `products` 做 SPU，`skus` 承接价格/规格/库存，订单和支付分离 |
| 分析数据 | 暂无独立事件层 | `analytics_events` 独立收集，不污染业务事实表 |

## 后端业务模块边界

后端平台层按“谁拥有数据，谁定义写入规则”的原则拆分。模块清单在 `backend/src/services/service_registry.js` 中以代码形式导出，供后续路由、测试和迁移脚本引用。

### 账号与家庭

- `account_service`：拥有 `users`、`user_identities`，负责 Heybo 主账号、登录身份、Token、账号注销和隐私协议。
- `household_service`：拥有 `households`，负责家庭空间、成员权限和家庭级资源归属。

当前 MVP 中 `loginOrCreateUser()` 会同时创建用户、身份、默认家庭和 Tuya 映射。数据库版本建议把它拆为一个应用层用例：账号服务创建用户，家庭服务创建默认家庭，Tuya 集成服务创建或返回 Tuya UID。

### 宠物与健康

- `pet_profile_service`：拥有 `pets`，负责宠物基础档案、过敏源、健康标签和档案更新。
- `feeding_service`：拥有 `feeding_records`，记录实际喂食行为。
- `health_service`：拥有 `health_records`，记录日常观察，不表达医疗诊断。
- `medical_record_service`：拥有 `medical_records`，记录体检、疫苗、用药、诊疗和附件。

宠物的“当前状态”可以保留在 `pets`，但体重、食欲、便便、皮毛、医疗建议等长期变化必须进入记录表，避免反复覆盖历史。

### 设备与烹饪

- `device_service`：拥有 `devices`，负责设备绑定、设备与宠物关系、在线状态和固件信息。
- `tuya_integration_service`：适配 Tuya SDK/OpenAPI，不直接拥有核心业务表。
- `cooking_operation_service`：拥有 `cooking_operations`，负责一键烹饪、状态机、Tuya 指令快照、模拟设备模式和失败记录。

当前 MVP 的 `device_operation_records` 命名偏底层，未来迁移时建议改为 `cooking_operations`。这样业务语义更清楚，也方便和非烹饪类设备事件分离。

### 食谱与商城

- `recipe_service`：拥有 `recipes`、`recipe_sources`，负责食谱来源、审核、营养快照和烹饪参数模板。
- `commerce_service`：拥有 `products`、`skus`，负责商品、SKU、价格、规格和库存状态。
- `order_service`：拥有 `orders`，负责订单主流程和履约状态。
- `payment_service`：拥有 `payments`，负责支付流水、回调、幂等和对账。

MVP 的 `products` 可以继续作为轻商城展示数据。数据库版本需要把价格从 `products` 下沉到 `skus`，并为订单项、支付、物流和订阅留出扩展空间。

### 后台与分析

- `admin_service`：拥有 `admin_users`，负责后台账号、角色和审核动作。
- `analytics_service`：拥有 `analytics_events`，负责 App、后端、设备和后台事件采集。

分析事件不应作为交易、喂养或医疗事实的唯一来源。它用于漏斗、活跃、推荐效果和设备使用分析。

## 核心数据表蓝图

核心表/集合蓝图在 `backend/src/services/schema_blueprint.js` 中导出，当前包含：

- `users`
- `user_identities`
- `households`
- `pets`
- `devices`
- `recipes`
- `recipe_sources`
- `cooking_operations`
- `feeding_records`
- `health_records`
- `medical_records`
- `products`
- `skus`
- `orders`
- `payments`
- `admin_users`
- `analytics_events`

这些定义不是 ORM migration 文件，而是迁移前的业务契约：字段含义、归属服务、索引方向、敏感信息、外部引用和 MVP 命名差异都先在这里固定。后续真实迁移时，可以由它生成 SQL migration、Prisma schema、Mongoose schema 或内部数据字典。

## 迁移策略

1. 保持现有 JSON MVP 不变，继续服务演示和前端联调。
2. 新增数据库连接层时，不直接替换 `heybo_store.js`，先实现同等接口的 repository。
3. 先迁移账号、家庭、宠物、设备四类强归属数据。
4. 再迁移烹饪、喂食、健康和医疗记录，注意历史时间字段和 household 归属。
5. 最后迁移商城、订单、支付、后台和分析事件。
6. 迁移完成前保留 JSON 导入脚本，把 `device_operation_records` 映射为 `cooking_operations`，把 MVP `products.price_cents` 映射为默认 `sku.price_cents`。

## 主线程集成点

- 路由层：未来可在 `backend/src/routes/heybo.js` 中逐步从 `heybo_store.js` 切换到服务 registry 中的模块。
- 数据层：新增数据库 repository 时以 `schema_blueprint.js` 为字段契约。
- 设备层：Tuya DP 指令和回调应进入 `device_service` 与 `cooking_operation_service` 的边界。
- 食谱层：现有 `backend/src/data/recipes*.js` 可迁移为 `recipes` 和 `recipe_sources` 种子数据。
- 商城层：现有商品 seed 可拆为 `products` + 默认 `skus`，订单支付接入后再启用 `payments`。
