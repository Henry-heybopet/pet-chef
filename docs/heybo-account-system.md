# Heybo Pet 账号体系设计

## 1. 定位

Heybo Pet 账号是 Pet Chef 产品平台的主账号体系。

Tuya 只作为设备能力层使用。用户在 App 内只登录 Heybo Pet 账号，不需要看到、注册或理解涂鸦账号。后端负责把 Heybo 用户静默映射为 Tuya UID，再通过 Tuya SDK/API 完成设备绑定、设备控制和状态同步。

账号体系需要同时满足两个目标：

- 第一阶段服务中国实验用户和市场验证。
- 底层数据结构支持全球化、多智能设备、宠物档案、鲜食包商城、订阅、医疗数据和宠物医院协作。

## 2. 第一版范围

第一版需要支持：

- 自建 Heybo 后端账号系统。
- 中国优先的手机号验证码登录。
- 微信登录预留和并行准备。
- Email 登录，用于内部测试和海外预留。
- Apple ID 登录预留，用于 iOS。
- Google 登录预留，用于海外版本。
- 用户、家庭、宠物、设备、食谱、喂养、健康记录、医疗记录、商城订单等核心数据模型。
- Heybo 用户与 Tuya UID 的静默绑定。
- 一个 Heybo 用户绑定多个 Tuya 家庭、多个设备。
- 一台 Pet Chef 设备服务多只宠物。
- 轻商城：肉包、菜包、酱包/营养包、组合套装。

## 3. 登录方式

### 中国第一版

优先支持：

- 手机号 + 短信验证码。
- Email + 验证码或密码，用于内部测试。
- 微信登录：产品和架构预留，企业资质准备完成后接入。
- Apple ID：iOS 版本预留。

短信服务建议：

- 阿里云短信。
- 腾讯云短信。

后端需要封装短信服务接口，避免业务代码和某一家短信供应商强绑定。

### 当前 MVP：手机号/用户名 + 6 位数字密码

当前前端登录入口固定在首页左上角，未登录时首页核心功能卡片保持展示但点击会要求登录。

落地规则：

- 登录账号可以是手机号或用户名。
- 手机号只按中国大陆手机号识别：`1` 开头，第二位 `3-9`，后跟 9 位数字，共 11 位。
- 密码必须是 6 位数字，前端不保存明文密码。
- 后端只保存密码 PBKDF2 hash 到 `user_identities.password_hash`。
- 手机号首次登录时不直接创建默认用户名，必须先设置 1-18 位中文、英文或数字用户名，且用户名不能为纯数字。
- 用户名保存在 `users.display_name`，手机号保存在 `users.primary_phone` 和 `user_identities.provider_user_id`。
- 用户名登录如果账号不存在，直接返回账号或密码错误，不进入注册。
- 手机号已存在但密码错误，直接返回密码错误，不进入设置用户名。
- 前端本地仅保存 `authToken`、`userId`、`username`、`sessionExpiresAt`。
- 默认 session 有效期为 15 天；App 启动校验 `/api/users/me` 成功后刷新 token 并顺延本地免登录时间。

### 全球化预留

预留：

- Apple ID。
- Google ID。
- Email。
- 国际手机号区号。

一个 Heybo 用户可以绑定多个登录身份，例如手机号、微信、Apple ID、Google ID、Email。

## 4. 用户身份模型

### user

`user` 是 Heybo 用户的最高层身份。

建议字段：

- `id`：Heybo 用户 ID。
- `display_name`：昵称。
- `avatar_url`：头像。
- `primary_phone`：主手机号。
- `primary_email`：主邮箱。
- `country_code`：国家/地区码。
- `region`：业务区域，例如 CN、US、EU。
- `language`：语言。
- `timezone`：时区。
- `status`：active、suspended、deleted。
- `created_at`。
- `updated_at`。
- `last_login_at`。

### user_identity

一个用户可以绑定多个登录身份。

建议字段：

- `id`。
- `user_id`。
- `provider`：phone、wechat、apple、google、email。
- `provider_user_id`。
- `phone_country_code`。
- `phone_number_hash`。
- `email_hash`。
- `is_primary`。
- `verified_at`。
- `created_at`。

手机号和邮箱建议同时保存标准化值和哈希索引，避免只依赖明文做查询。

### tuya_user_mapping

Heybo 用户和 Tuya 用户的映射关系。

建议字段：

- `id`。
- `user_id`。
- `tuya_uid`。
- `tuya_country_code`。
- `tuya_region`。
- `tuya_home_ids`。
- `created_at`。
- `updated_at`。

流程原则：

1. 用户只登录 Heybo 账号。
2. Heybo 后端为用户创建或返回稳定的 Tuya UID。
3. App 使用 Tuya SDK 进行静默登录。
4. Tuya 登录过程不暴露给用户。

生产环境注意：

- 不要把 Tuya 登录密码简单设置成用户 ID。
- 应由 Heybo 后端签发稳定、安全、可轮换的 Tuya 登录凭证。

## 5. 家庭体系 household

账号体系从第一版开始预留家庭体系，第一版 UI 可以简单处理。

一个用户可以加入多个家庭。一个家庭可以包含多个成员、宠物、设备、订单和喂养记录。

建议字段：

- `id`。
- `name`。
- `owner_user_id`。
- `region`。
- `address_id`。
- `created_at`。
- `updated_at`。

### household_member

预留三种角色：

- `owner`：家庭拥有者，可管理宠物、设备、订单、成员。
- `member`：家庭成员，可操作设备、查看宠物档案。
- `viewer`：只读权限。

建议字段：

- `id`。
- `household_id`。
- `user_id`。
- `role`。
- `status`。
- `invited_by`。
- `joined_at`。

## 6. 宠物档案 pet_profile

一个家庭可以有多只宠物。Pet Chef 第一阶段聚焦狗，猫作为拓展预留。

建议字段：

- `id`。
- `household_id`。
- `owner_user_id`。
- `name`：宠物名字。
- `species`：dog、cat。
- `breed`：品种。
- `sex`：性别。
- `neutered`：是否绝育。
- `birth_date`：生日。
- `age_months`：月龄。
- `current_weight_kg`：当前体重。
- `target_weight_kg`：目标体重。
- `body_condition_score`：体况评分。
- `activity_level`：活动量。
- `life_stage`：puppy、adult、senior。
- `allergens`：过敏源。
- `food_restrictions`：忌口。
- `health_tags`：肠胃敏感、皮肤瘙痒、肥胖、挑食、老年犬、术后恢复、关节支持、大运动量等。
- `doctor_notes`：医生建议。
- `user_notes`：用户备注。
- `avatar_url`。
- `created_at`。
- `updated_at`。

### 动态档案

宠物档案不能只保存“当前状态”，必须支持历史变化。

需要长期记录：

- 体重变化。
- 食欲变化。
- 便便状态。
- 皮肤和毛发状态。
- 活动量变化。
- 过敏和禁忌变化。
- 医生建议变化。

## 7. 健康变化记录

第一版内置“14 天健康观察周期”，同时预留长期记录。

建议周期：

- 第 0 天：初始状态。
- 第 7 天：第一次反馈。
- 第 14 天：短期效果反馈。
- 第 30 天。
- 第 60 天。
- 第 90 天。
- 第 180 天。
- 第 360 天。
- 持续年度记录，从幼犬到成年、老年阶段。

建议字段：

- `id`。
- `pet_id`。
- `household_id`。
- `recorded_by_user_id`。
- `record_date`。
- `cycle_day`。
- `weight_kg`。
- `appetite_score`：食欲评分。
- `stool_score`：便便评分。
- `skin_score`：皮肤评分。
- `coat_score`：毛发评分。
- `energy_score`：精神状态评分。
- `itching_score`：瘙痒评分。
- `allergy_reaction`。
- `digestive_reaction`。
- `user_rating`。
- `notes`。
- `photo_urls`。
- `created_at`。

这部分数据是产品壁垒，因为它把宠物档案、食谱、鲜食包、设备烹饪记录和健康变化连接在一起。

## 8. 医疗数据空间

第一版只做医疗数据存储和上传，不做医生工作台。

数据来源包括：

- 用户手动填写。
- 拍照上传化验单。
- 截屏上传宠物医院 App 数据。
- 上传诊断文档。
- 未来宠物医院 API 对接。

### medical_record

建议字段：

- `id`。
- `pet_id`。
- `household_id`。
- `source`：user_input、photo_upload、screenshot、hospital_api、vet_input。
- `record_type`：diagnosis、lab_report、prescription、allergy_test、vaccination、surgery、medication、doctor_note。
- `title`。
- `summary`。
- `recorded_at`。
- `hospital_name`。
- `vet_name`。
- `file_urls`。
- `structured_data`。
- `created_by_user_id`。
- `created_at`。

### vet_review

为第二阶段医生审核 AI 食谱预留。

建议字段：

- `id`。
- `pet_id`。
- `recipe_id`。
- `ai_recommendation_id`。
- `medical_record_ids`。
- `vet_user_id`。
- `status`：pending、approved、rejected、needs_more_info。
- `review_notes`。
- `approved_recipe_adjustments`。
- `created_at`。
- `reviewed_at`。

## 9. 设备体系

Heybo 用户可以绑定多个 Tuya 家庭和多个设备。该结构需要支持 Pet Chef、智能喂水器、智能猫砂盆、智能定位器等未来产品。

### device

建议字段：

- `id`。
- `household_id`。
- `owner_user_id`。
- `tuya_device_id`。
- `tuya_home_id`。
- `tuya_pid`。
- `product_type`：pet_chef、water_fountain、litter_box、tracker、other。
- `device_name`。
- `status`。
- `firmware_version`。
- `bound_at`。
- `last_online_at`。
- `created_at`。
- `updated_at`。

### device_pet_binding

一台机器允许绑定多只宠物。

建议字段：

- `id`。
- `device_id`。
- `pet_id`。
- `is_default`。
- `created_at`。

## 10. 设备操作记录

每次设备操作都必须绑定用户、家庭、设备、宠物、食谱、DP 参数、烹饪结果和喂食反馈。

### device_operation_record

建议字段：

- `id`。
- `user_id`。
- `household_id`。
- `device_id`。
- `pet_id`。
- `recipe_id`。
- `operation_type`：start_cooking、pause、reset、finish、fault。
- `tuya_dp_payload`。
- `target_temperature_c`。
- `target_time_seconds`。
- `target_power`。
- `target_speed`。
- `result`：success、failed、cancelled、fault。
- `fault_code`。
- `started_at`。
- `finished_at`。
- `created_at`。

## 11. 食谱、喂养和鲜食包

### recipe

建议字段：

- `id`。
- `species`：dog、cat。
- `name`。
- `target_tags`：成长、高能量、肠胃敏感、关节支持、皮肤毛发、体重管理、老年犬等。
- `ingredient_ratios`。
- `nutrition_profile`。
- `cooking_profile`。
- `vet_verified`。
- `status`。
- `created_at`。
- `updated_at`。

### feeding_record

建议字段：

- `id`。
- `household_id`。
- `pet_id`。
- `device_id`。
- `recipe_id`。
- `operation_record_id`。
- `served_weight_g`。
- `ate_percent`。
- `liked_score`。
- `stool_feedback_after`。
- `digestive_feedback_after`。
- `notes`。
- `fed_at`。
- `created_at`。

### 鲜食包推荐

食材包必须和宠物档案强关联，不做普通货架式商城。

示例：

- 肠胃敏感：单一蛋白肉包 + 温和菜包。
- 大运动量大型犬：高蛋白肉包 + 关节支持营养包。
- 老年犬：低脂易消化肉包 + 关节支持包。
- 皮肤敏感：低敏肉源 + Omega 营养包。
- 体重管理：低热量高饱腹组合。

## 12. 轻商城

第一版需要轻商城，用于购买食材和料包。

第一版范围：

- 商品列表。
- 商品详情。
- 肉包。
- 菜包。
- 酱包/营养包。
- 组合套装。
- 购物车或直接购买。
- 收货地址。
- 订单。
- 第一版需要真实支付。支付通道优先按微信支付/支付宝准备，具体首发通道待确认。

第一版测试 SKU：

- 测试肉包1。
- 测试肉包2。
- 测试肉包3。
- 测试菜包1。
- 测试菜包2。
- 测试菜包3。
- 测试营养包1。
- 测试营养包2。
- 测试营养包3。
- 组合包1-增强骨骼套餐。
- 组合包2-美毛美肤套餐。
- 组合包3-肠胃敏感套餐。

建议模型：

- `product`。
- `sku`。
- `inventory`。
- `cart`。
- `order`。
- `order_item`。
- `shipping_address`。
- `payment`。
- `subscription_plan`：预留。

商城推荐逻辑应基于宠物档案、健康标签、医疗记录和喂养反馈，而不是只按商品分类展示。

## 13. 合规要求

中国第一版需要准备：

- 用户协议。
- 隐私政策。
- 账号注销。
- 删除宠物档案。
- 手机号换绑/解绑。
- 数据导出预留。
- 短信签名。
- 如果使用中国大陆服务器，需要准备域名备案。
- 微信开放平台资料。
- 支付资质预留。

全球化预留：

- GDPR 数据导出和删除。
- CCPA 用户数据权利。
- 区域化数据存储。
- 用户授权管理。
- 医疗敏感数据权限控制。

## 14. 后端部署地区

第一版面向中国实验用户，建议优先按中国大陆环境准备；如果备案或资源暂时未完成，可以评估中国香港作为过渡。

如果要接入短信、微信登录、微信支付、支付宝、中国 App 分发等能力，中国大陆服务器会更顺。

后端建议拆分为以下服务模块：

- Auth Service：登录和身份认证。
- User Service：用户资料。
- Household Service：家庭和成员。
- Pet Service：宠物档案。
- Device Service：设备绑定和状态。
- Tuya Mapping Service：Tuya UID 和 Home 映射。
- Recipe Service：食谱。
- Feeding & Health Service：喂养和健康记录。
- Medical Record Service：医疗资料。
- Commerce Service：轻商城。
- File Upload Service：图片、报告、医疗文件上传。

## 15. 第一阶段开发里程碑

建议第一阶段按以下顺序开发：

1. 手机验证码登录。
2. Heybo 用户创建。
3. 静默 Tuya UID 映射。
4. 自动创建默认家庭。
5. 创建宠物档案。
6. Pet Chef 设备绑定。
7. 设备列表。
8. 宠物和设备绑定。
9. DIY 烹饪开始、暂停、重置。
10. 烹饪操作记录。
11. 喂食反馈。
12. 商品列表和基于宠物档案的鲜食包推荐。
13. 收货地址和订单。
14. 支付接口预留或接入微信支付/支付宝。

## 16. 当前后端 MVP 状态

当前代码已增加 Heybo 后端账号和数据闭环 MVP。该版本使用本地 JSON 文件存储，适合开发验证；正式环境需要替换为数据库。

本地数据文件：

```text
backend/.data/heybo-db.json
```

该目录已加入 `.gitignore`，不会提交到 GitHub。

当前已实现 API：

- `POST /api/auth/mock-login`：测试版 Heybo 登录，支持手机号或 Email。
- `POST /api/v1/auth/mock-login`：同上，兼容 B2.0 的 `/api/v1` 路径。
- `GET /api/users/me`：读取当前用户、默认家庭、Tuya 映射。
- `POST /api/households/default`：创建或读取默认家庭。
- `GET /api/pets`：宠物列表。
- `POST /api/pets`：创建宠物档案。
- `PATCH /api/pets/:id`：更新宠物档案。
- `GET /api/devices`：设备列表。
- `POST /api/devices`：登记或更新 Tuya 设备。
- `POST /api/devices/:id/pets`：绑定设备和宠物。
- `GET /api/operations/cooking`：烹饪操作记录。
- `POST /api/operations/cooking`：写入烹饪操作记录。
- `GET /api/feeding-records`：喂食记录。
- `POST /api/feeding-records`：写入喂食记录。
- `GET /api/health-records`：健康变化记录。
- `POST /api/health-records`：写入健康变化记录。
- `GET /api/medical-records`：医疗记录。
- `POST /api/medical-records`：写入医疗记录。
- `GET /api/products`：轻商城商品列表。
- `GET /api/orders`：订单列表。
- `POST /api/orders`：创建订单。

当前前端 `设备闭环` 页面已接入：

- Heybo 后端测试登录。
- Tuya 静默登录。
- 设备登记到 Heybo 后端。
- 85°C DIY 烹饪后写入后端操作记录。

下一步需要替换：

- `mock-login` 替换为真实手机号验证码登录。
- 工厂测试白名单账号只用于硬件联调，正式用户测试前需要关闭或改为后端配置。
- 本地 JSON 存储替换为数据库。
- `dev_` 测试 token 替换为正式 JWT/session。
- Tuya UID 登录凭证由后端安全签发。

## 17. 关键原则

- Heybo 账号是唯一用户可见账号。
- Tuya 账号是隐藏的设备基础设施。
- 宠物档案是长期健康数据资产。
- 设备控制必须绑定宠物、食谱和喂养结果。
- 鲜食包商城必须由宠物需求驱动，不做普通商品货架。
- 医疗数据第一版先存储，医生工作台第二阶段再做。
- 家庭、多宠物、多设备能力从第一天就在数据模型里预留。
- 登录和合规中国优先，身份和数据结构全球化预留。
