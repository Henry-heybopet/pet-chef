# Heybo App MVP 架构规划

## 当前目标

第一阶段聚焦中国实验用户和市场验证，先完成一条真实可用的产品闭环：

```text
独立 App 壳
  -> Heybo 账号
  -> 宠物档案
  -> Tuya SDK 配网
  -> 设备绑定
  -> 食谱推荐
  -> 一键烹饪
  -> 烹饪记录
```

商城、会员和食材订阅需要提前预留数据结构和入口，但不作为第一版核心交付。

## 总体架构

```text
Heybo App
  - Web UI：复用当前 Vite 前端
  - Native Shell：iOS / Android App 壳
  - Native Plugins：Tuya SDK、推送、定位、蓝牙、相机

Heybo Backend
  - 用户账号
  - 宠物档案
  - 设备绑定关系
  - 食谱和 AI 推荐
  - 烹饪记录
  - 订单和订阅预留

Tuya Platform
  - 设备配网
  - 设备激活
  - DP 指令控制
  - 设备状态回传
  - OTA 固件升级

China Infrastructure
  - 中国区服务器
  - 中国区对象存储
  - 短信验证码
  - 微信登录
  - 微信支付 / 支付宝预留
```

## App 技术路线

MVP 建议采用 Capacitor 或类似方案，将当前网页前端封装成独立 App：

```text
frontend/Vite
  -> Capacitor
  -> iOS App / Android App
  -> Tuya iOS SDK / Tuya Android SDK
```

普通业务页面继续使用 Web 技术开发，包括首页、宠物档案、食谱、烹饪流程和用户中心。

必须使用原生能力的模块通过 Native Plugin 暴露给 Web UI：

- Tuya 设备配网。
- 蓝牙权限。
- Wi-Fi / 局域网权限。
- 定位权限，部分 Android 配网能力需要。
- 推送通知。
- 相机扫码，后续用于设备二维码、食材扫码或售后。

## 账号体系

Heybo 账号是用户主账号，Tuya 账号或 Tuya UID 只作为底层设备能力映射，不暴露给普通用户。

MVP 登录方式：

- 手机号 + 短信验证码。
- 微信登录。
- Apple 登录，iOS 上架前评估是否必须支持。

账号能力：

- 注册和登录。
- Token 刷新。
- 修改手机号。
- 账号注销。
- 隐私协议和用户协议确认。
- 第三方 SDK 清单展示。

建议数据模型：

```text
users
  id
  phone
  wechat_openid
  apple_user_id
  nickname
  avatar_url
  tuya_uid
  created_at
  deleted_at

user_consents
  user_id
  privacy_version
  terms_version
  consented_at

user_addresses
  user_id
  receiver_name
  phone
  province
  city
  district
  address
  is_default
```

## 设备配网和绑定

用户体验目标是不输入设备 ID，直接在 Heybo App 里添加设备。

推荐流程：

```text
用户登录 Heybo
  -> 创建默认家庭/空间
  -> 点击添加鲜食机
  -> App 提示设备进入配网模式
  -> 调用 Tuya SDK 获取配网 token
  -> 使用 Wi-Fi / 蓝牙 / AP 模式完成激活
  -> Tuya 返回 deviceId
  -> Heybo 后端保存绑定关系
  -> App 展示设备状态和控制页
```

建议数据模型：

```text
devices
  id
  user_id
  tuya_home_id
  tuya_device_id
  tuya_product_id
  product_model
  device_name
  firmware_version
  online_status
  bound_at
  unbound_at

device_events
  device_id
  event_type
  dp_code
  dp_value
  raw_payload
  created_at
```

必须提前确认：

- 当前硬件支持的配网方式：Wi-Fi EZ、AP、蓝牙辅助、二维码。
- 中国区 Tuya 项目、App SDK、设备 PID 是否在同一数据中心。
- Tuya SDK 商业版授权和注册用户限制。
- 设备解绑后是否自动进入配网模式。
- 多手机登录和家庭共享策略。

## 宠物档案

MVP 先聚焦犬只，不展开猫入口。

建议字段：

```text
pets
  id
  user_id
  name
  species
  breed
  gender
  birth_date
  age_months
  weight_kg
  body_size
  life_stage
  health_goals
  allergies
  created_at
```

第一版必须支持：

- 新建宠物。
- 修改体重和年龄。
- 选择健康目标：低脂、美毛、护关节、肠胃、补钙、高蛋白。
- 记录过敏食材。
- 一个用户多个宠物，UI 可以先默认显示第一个宠物。

## 食谱控制闭环

第一版闭环：

```text
选择宠物
  -> 选择健康目标
  -> 推荐食谱
  -> 换算本餐克重
  -> 用户确认食材
  -> 生成设备参数
  -> 下发 Tuya DP 指令
  -> 监听设备状态
  -> 完成后生成烹饪记录
```

建议数据模型：

```text
recipes
  id
  name
  category
  life_stage
  body_size
  health_tags
  ingredients
  cooking_profile

cooking_sessions
  id
  user_id
  pet_id
  device_id
  recipe_id
  total_weight_g
  ingredients_snapshot
  cooking_params_snapshot
  status
  started_at
  completed_at
  error_code
```

MVP 需要优先保证：

- 食谱推荐理由清楚。
- 食材克重可信。
- 设备参数可解释。
- 烹饪失败能记录原因。
- 无设备时可以进入模拟设备模式，用于演示和销售。

## 商城和订阅预留

第一版不做完整商城，但数据结构要留出空间：

```text
products
orders
order_items
subscriptions
subscription_plans
payments
shipments
```

MVP 可以先做轻量入口：

- 食材订购按钮。
- 加入采购清单。
- 联系客服购买。
- 订阅意向收集。

等市场验证后，再接入微信支付、支付宝、库存、物流和售后流程。

## 合规和上架

中国实验用户阶段需要提前准备：

- ICP 备案。
- APP 备案。
- 隐私政策。
- 用户协议。
- 第三方 SDK 清单。
- 个人信息收集清单。
- 权限使用说明。
- 账号注销入口。
- 用户数据删除机制。

涉及的敏感信息：

- 手机号。
- 收货地址。
- 宠物健康偏好。
- 设备使用记录。
- 订单和支付信息。

原则：

- 只收集 MVP 必须数据。
- 明确告知 Tuya、短信、支付、AI 服务等第三方 SDK。
- 宠物健康建议避免表达为医疗诊断。
- AI 食谱输出需要加入安全提示和人工确认步骤。

## 第一阶段交付清单

建议 8-12 周完成：

- App 壳工程。
- Heybo 手机号登录。
- 宠物档案。
- Tuya SDK 初始化。
- Tuya 添加设备流程。
- 设备绑定关系保存。
- 设备状态页。
- 开始、暂停、停止和基础模式控制。
- 食谱克重换算。
- 一键烹饪流程。
- 烹饪记录。
- 账号注销。
- 隐私政策和用户协议页面。
- 内测包分发。

## 风险清单

- Tuya SDK 商业版成本和用户数限制。
- Tuya 中国区项目和设备 PID 不一致导致配网失败。
- 设备 DP 点位未冻结，导致 App 和固件反复返工。
- iOS 配网权限、局域网权限和蓝牙权限审核。
- Android 厂商权限差异导致配网体验不稳定。
- 食谱建议被用户理解为医疗建议。
- AI 调用成本和生成稳定性。
- 商城涉及食品销售资质、售后和物流。

## 下一步

1. 确认硬件 Tuya PID、DP 点列表和配网方式。
2. 确认 Tuya App SDK 是否购买正式版，以及中国区项目配置。
3. 搭建 App 壳工程。
4. 设计 Heybo 账号数据表。
5. 将现有食谱整理成结构化种子数据。
6. 做第一版“添加设备 -> 绑定 -> 控制”的技术验证。
