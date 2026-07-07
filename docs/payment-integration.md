# Heybo Pet 微信支付与支付宝接入方案

## 已确认范围

- 第一版面向中国大陆用户。
- App 同时提供微信支付和支付宝。
- 当前尚未开通微信支付商户号和支付宝开放平台应用。
- 现阶段先完成订单、支付流水、状态查询和回调边界；商户审核通过后再接正式 SDK。

## 支付架构

```text
App 创建订单
  -> App 请求 Heybo 后端创建微信支付
  -> Heybo 后端调用微信 App 下单
  -> Heybo 后端返回调起微信客户端所需参数
  -> App 调起微信客户端
  -> 用户在微信完成付款
  -> 微信跳回 App
  -> 微信异步通知 Heybo 后端
  -> 后端验签、幂等更新 payment 和 order
  -> App 查询后端支付状态
```

App 返回结果只用于界面提示，订单是否支付成功必须以后端验签后的异步通知或主动查单结果为准。
后端入口已保留原始 HTTP 请求体，供正式接入时按支付平台规范完成回调验签。

## 阶段 1：微信 App 支付链路边界

本阶段只固定接口契约和状态边界，不接入真实微信 SDK，不修改主程序支付入口。后续所有实现都必须遵守这里的边界。

### 1. 可信边界

- App 只负责展示支付状态、发起创建支付请求、调起微信客户端、查询后端状态。
- App 从微信返回后不能直接把订单标记为已支付，只能显示“支付结果确认中”或“请稍候”。
- Heybo 后端是唯一可以把 `payment.status` 和 `order.payment_status` 更新为 `paid` 的可信模块。
- 后端更新为 `paid` 的依据只能是微信异步通知验签成功，或后端主动调用微信查单确认成功。
- 微信商户私钥、API v3 Key、商户证书序列号只能存在后端环境变量或密钥管理中，不能进入 React、Capacitor、iOS、Android 客户端代码。

### 2. App 创建订单

App 先通过现有订单接口创建业务订单：

```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json
```

成功后得到 `order.id`。只有 `payment_status = pending` 且订单未取消、未退款的订单可以进入微信支付。

### 3. App 请求创建微信支付

App 使用订单 ID 创建支付流水：

```http
POST /api/payments
Authorization: Bearer <token>
Idempotency-Key: <uuid>
Content-Type: application/json

{
  "order_id": "ord_xxx",
  "provider": "wechat_pay"
}
```

后端职责：

- 校验当前用户是否拥有该订单。
- 校验订单是否仍可支付。
- 根据 `Idempotency-Key` 做幂等，避免重复创建支付流水。
- 创建或复用 `payment`。
- 在微信商户配置完整时调用微信 App 下单。
- 保存本地商户订单号 `out_trade_no`、微信预支付 ID `prepay_id` 和支付流水状态。
- 返回 App 调起微信客户端需要的 `client_payload`。

配置未完成时，接口保持当前策略：返回 HTTP `503`，并返回 `configuration_pending`，避免误判为真实支付。

### 4. 后端返回给 App 的支付参数

后端创建微信预支付订单成功后，返回结构固定为：

```json
{
  "success": true,
  "payment": {
    "id": "pay_xxx",
    "order_id": "ord_xxx",
    "provider": "wechat_pay",
    "status": "pending",
    "amount_cents": 9900,
    "currency": "CNY"
  },
  "client_payload": {
    "provider": "wechat_pay",
    "appId": "wx...",
    "partnerId": "商户号",
    "prepayId": "wx...",
    "packageValue": "Sign=WXPay",
    "nonceStr": "...",
    "timeStamp": "秒级时间戳",
    "sign": "调起支付签名"
  }
}
```

字段命名在前端和原生插件之间保持一致。原生 Android/iOS 插件只消费 `client_payload`，不自行拼接商户参数，不读取商户私钥。

### 5. App 调起微信客户端

前端调用：

```js
NativeCapabilities.payments.wechatPay(client_payload)
```

原生插件职责：

- 校验微信客户端是否可用。
- 使用后端返回的参数调起微信。
- 接收微信返回 App 的结果。
- 向前端返回“调起成功、用户取消、失败、未知”等本地交互结果。

原生插件不负责确认订单已支付。

### 6. 微信异步通知后端

正式回调接口预留为：

```http
POST /api/payments/wechat/notify
```

后端职责：

- 使用原始请求体验证微信平台签名。
- 使用 API v3 Key 解密通知资源。
- 校验 `appid`、`mchid`、`out_trade_no`、金额和币种。
- 根据 `out_trade_no` 找到本地 `payment`。
- 幂等处理重复通知。
- 支付成功时更新：
  - `payment.status = paid`
  - `payment.provider_payment_id = transaction_id`
  - `order.payment_status = paid`
  - `order.status = paid`
- 支付失败、取消或关闭时，只更新为对应非成功状态，不触发发货或履约。

### 7. App 查询最终支付状态

App 从微信返回后进入“确认中”状态，并查询后端：

```http
GET /api/payments/:id
Authorization: Bearer <token>
```

状态解释：

| payment.status | App 展示 | 是否可履约 |
| --- | --- | --- |
| `configuration_pending` | 微信支付尚未配置 | 否 |
| `pending` | 支付确认中 | 否 |
| `authorized` | 支付授权中/待确认 | 否 |
| `paid` | 支付成功 | 是 |
| `failed` | 支付失败 | 否 |
| `cancelled` | 已取消支付 | 否 |
| `refunded` | 已退款 | 否 |

如果 App 收到微信返回成功，但后端仍是 `pending`，App 继续轮询或提示“支付结果确认中”，不得展示最终成功。

### 8. 阶段 1 模块测试验收

本阶段完成后，应能验证：

- 文档明确 App、后端、微信、原生插件各自职责。
- `POST /api/payments` 的请求、响应和幂等边界明确。
- `client_payload` 的字段结构明确。
- `POST /api/payments/wechat/notify` 的正式回调职责明确。
- 支付成功只能由后端验签通知或主动查单确认。
- 没有真实商户参数时，接口仍返回 `configuration_pending`，不会产生假成功。

## 阶段 2：后端微信支付适配器

后端微信支付适配器位于 `backend/src/services/wechat_pay.js`，由 `backend/src/services/payment.js` 在创建 `wechat_pay` 支付时调用。

已完成的边界：

- 从环境变量读取微信支付 AppID、商户号、API v3 Key、商户私钥路径、商户证书序列号和通知地址。
- 从 `WECHAT_PAY_PRIVATE_KEY_PATH` 加载商户私钥。
- 生成微信支付 API v3 商户请求签名。
- 生成本地商户订单号 `out_trade_no`。
- 调用微信 App 下单接口 `/v3/pay/transactions/app`。
- 保存 `out_trade_no`、`provider_prepay_id` 和下单摘要到支付流水。
- 生成 App 调起微信客户端所需的 `client_payload`。

默认本地模块测试不请求微信真实接口：

```env
WECHAT_PAY_USE_MOCK=true
```

当微信商户号、App 支付能力、回调域名、证书和私钥都准备好后，再设置：

```env
WECHAT_PAY_USE_MOCK=false
```

真实请求时后端会向微信支付 API Base 发起 App 下单请求：

```env
WECHAT_PAY_API_BASE=https://api.mch.weixin.qq.com
```

`client_payload` 只允许由后端生成并签名，客户端和原生插件不得自行生成商户签名。

## 阶段 3：微信异步通知回调

正式微信支付通知入口：

```http
POST /api/payments/wechat/notify
```

后端实现边界：

- 使用 `req.rawBody` 读取微信通知原始请求体。
- 使用微信通知头 `Wechatpay-Timestamp`、`Wechatpay-Nonce`、`Wechatpay-Signature` 和微信平台证书验签。
- 使用 API v3 Key 解密 `resource`。
- 校验 `appid`、`mchid`、`out_trade_no`、金额和币种。
- 根据 `out_trade_no` 找到本地支付流水。
- 重复 `SUCCESS` 通知按幂等处理。
- 支付成功时保存微信 `transaction_id`，并把 payment/order 更新为 paid。
- 成功处理后返回：

```json
{
  "code": "SUCCESS",
  "message": "成功"
}
```

处理失败时返回：

```json
{
  "code": "FAIL",
  "message": "错误原因"
}
```

阶段 3 需要新增的生产配置：

```env
WECHAT_PAY_PLATFORM_CERT_PATH=
```

这是微信平台证书路径，用于验签微信支付通知。它不同于商户 API 私钥，不能混用。

## 阶段 4：Android / iOS 原生微信支付插件

本阶段让前端 `NativeCapabilities.payments.wechatPay(client_payload)` 可以进入 Android/iOS 原生层，并通过 WeChat OpenSDK 调起微信客户端。App 端返回仍只代表微信客户端交互结果，最终支付成功仍以后端微信通知或主动查单为准。

### Android

已完成：

- 新增 `HeyboPaymentsPlugin`，Capacitor 插件名为 `HeyboPayments`。
- `MainActivity` 注册 `HeyboPaymentsPlugin`。
- 新增 `wxapi/WXPayEntryActivity` 处理微信支付回调。
- `AndroidManifest.xml` 增加微信包可见性查询和 `WXPayEntryActivity`。
- `build.gradle` 增加 `WECHAT_OPEN_APP_ID` BuildConfig。
- `build.gradle` 引入微信 OpenSDK Android 依赖。
- `frontend/android/tuya.properties.example` 增加 `WECHAT_OPEN_APP_ID` 示例配置。
- `wechatPay` 使用后端返回的 `client_payload` 创建 `PayReq`，并调用 `IWXAPI.sendReq()`。
- 微信返回 App 后，`WXPayEntryActivity` 将 `BaseResp` 结果返回给前端。

当前 `wechatPay` 行为：

- 缺少支付参数时返回 `invalid-payload`。
- 未配置 `WECHAT_OPEN_APP_ID` 时返回 `wechat-app-id-missing`。
- 未安装微信时返回 `wechat-not-installed`。
- 参数完整、AppID 已配置且微信已安装时，调用微信 OpenSDK 调起微信支付。
- 微信客户端返回成功时，前端只能显示“支付结果确认中”，不得直接把订单标记为已支付。

### iOS

已完成：

- 新增 `HeyboPaymentsPlugin.swift`，Capacitor 插件名为 `HeyboPayments`。
- 将插件文件加入 Xcode App target。
- `Info.plist` 增加 `WECHAT_OPEN_APP_ID`、微信 URL Scheme 和 `LSApplicationQueriesSchemes`。
- `Info.plist` 增加 `WECHAT_UNIVERSAL_LINK` 占位。
- `AppDelegate` 接入 `WXApi.handleOpen` 和 `WXApi.handleOpenUniversalLink`。
- 新增 `Podfile`，用于引入 `WechatOpenSDK`。
- 当 `WechatOpenSDK` 已链接时，`wechatPay` 创建 `PayReq` 并调用 `WXApi.send`。
- 微信返回 App 后，`WXApiDelegate.onResp` 将结果返回给前端。

当前 `wechatPay` 行为：

- 缺少支付参数时返回 `invalid-payload`。
- 未配置 `WECHAT_OPEN_APP_ID` 时返回 `wechat-app-id-missing`。
- 未链接 `WechatOpenSDK` 时返回 `wechat-opensdk-missing`。
- 未安装微信时返回 `wechat-not-installed`。
- 参数完整、AppID 已配置、SDK 已链接且微信已安装时，调用微信 OpenSDK 调起微信支付。
- 微信客户端返回成功时，前端只能显示“支付结果确认中”，不得直接把订单标记为已支付。

### 本阶段仍需外部配置

- Android：`WECHAT_OPEN_APP_ID` 必须和微信开放平台移动应用 AppID 一致，包名和签名必须与开放平台配置一致。
- iOS：`WECHAT_OPEN_APP_ID` 和 `WECHAT_UNIVERSAL_LINK` 必须和微信开放平台移动应用配置一致。
- iOS：执行 `pod install` 后需要打开 `App.xcworkspace` 构建。
- 两端：微信客户端返回成功后，仍必须轮询后端 `GET /api/payments/:id`，以后端 paid 状态为最终成功。

## 阶段 5：前端支付流程

前端已新增独立微信支付测试页，不改变主鲜食/设备流程。入口位于首页的“微信支付测试”。

页面组件：

```text
frontend/src/components/WechatPaymentFlow.jsx
```

当前流程：

```text
测试账号登录
  -> 选择测试商品
  -> 创建订单 POST /api/orders
  -> 创建微信支付 POST /api/payments { provider: "wechat_pay" }
  -> 配置缺失时展示“微信支付尚未配置”
  -> 后端返回 client_payload 时调用 NativeCapabilities.payments.wechatPay(client_payload)
  -> 微信返回 App 后展示“支付结果确认中”
  -> 轮询 GET /api/payments/:id
  -> 后端 payment.status = paid 后展示支付成功
```

前端实现要点：

- 每次创建支付时使用 `Idempotency-Key`，避免用户重复点击造成重复支付流水。
- `configuration_pending` 不会调起微信，直接提示缺失配置。
- 原生层返回未安装微信、参数错误、SDK 缺失等失败结果时，不进入轮询。
- 原生层返回成功后，也不直接判定订单成功，只进入“支付结果确认中”。
- 轮询最多 30 次，每 2 秒一次；如果仍未 paid，提示检查微信异步通知或稍后刷新。
- 只有后端返回 `payment.status = paid` 后，前端才展示最终支付成功。

## 阶段 6：模块测试联调清单

本阶段只验证微信支付模块，不接正式商城入口，不替换主程序流程。

### 1. 后端 mock 模块测试

执行：

```bash
npm run test:wechat-pay:module
```

该脚本会自动完成：

```text
生成临时商户私钥和微信平台公钥
  -> 启用 WECHAT_PAY_USE_MOCK=true
  -> 创建测试用户
  -> 创建测试订单
  -> 创建微信支付流水
  -> 生成 out_trade_no
  -> 生成 mock prepay_id
  -> 返回 App 调起微信所需 client_payload
  -> 构造微信格式的 AES-256-GCM 加密通知
  -> 使用测试平台私钥签名通知
  -> 后端验签、解密、校验 appid/mchid/金额/订单号
  -> 幂等更新 payment/order 为 paid
  -> 验证重复通知不会把 paid 降级
```

成功输出应包含：

```json
{
  "success": true,
  "payment_status": "paid",
  "order_payment_status": "paid"
}
```

### 2. Web/前端模块测试

启动后端和前端：

```bash
npm run dev:backend
npm run dev:frontend
```

在首页进入“微信支付测试”，按顺序执行：

1. 登录测试账号。
2. 创建测试订单。
3. 点击“微信支付”。
4. 如果后端未配置真实微信参数，应看到“微信支付尚未配置”。
5. 如果后端已配置 mock 参数，应看到创建出的支付流水和 `configuration_pending` / `pending` 状态。

Web 预览模式不会真正调起微信客户端，原生能力会返回不可用状态。这是预期结果。

### 3. Android 原生模块测试

准备：

1. 使用 Java 17 或 Java 21 构建 Android，当前 Java 25 会导致 Gradle 报 `Unsupported class file major version 69`。
2. 在 `frontend/android/tuya.properties` 中配置：

```properties
WECHAT_OPEN_APP_ID=wx...
```

3. 确认微信开放平台移动应用配置的 Android 包名为：

```text
com.heybopet.petchef
```

4. 确认 Android 签名和微信开放平台配置一致。
5. 真机安装微信。

测试步骤：

1. 运行 App。
2. 进入首页“微信支付测试”。
3. 登录测试账号。
4. 创建测试订单。
5. 点击“微信支付”。
6. App 应调起微信客户端。
7. 微信返回 App 后，页面显示“支付结果确认中”。
8. 使用后端 mock 通知脚本或真实微信异步通知让后端更新 paid。
9. 前端轮询 `GET /api/payments/:id` 后展示支付成功。

### 4. iOS 原生模块测试

准备：

1. 执行前端构建和 Capacitor 同步：

```bash
cd frontend
npm run build
npx cap sync ios
```

2. 安装 iOS WeChat OpenSDK：

```bash
cd frontend/ios/App
pod install
```

3. 用 `App.xcworkspace` 打开工程。
4. 配置：

```xcconfig
WECHAT_OPEN_APP_ID = wx...
WECHAT_UNIVERSAL_LINK = https://你的域名/app/
```

5. 确认 iOS Bundle ID、URL Scheme、Universal Link 和微信开放平台配置一致。
6. 真机安装微信。

测试步骤：

1. 运行 App。
2. 进入首页“微信支付测试”。
3. 登录测试账号。
4. 创建测试订单。
5. 点击“微信支付”。
6. App 应调起微信客户端。
7. 微信返回 App 后，页面显示“支付结果确认中”。
8. 使用后端 mock 通知脚本或真实微信异步通知让后端更新 paid。
9. 前端轮询 `GET /api/payments/:id` 后展示支付成功。

### 5. 真实微信联调切换条件

只有以下条件全部满足时，才把后端从 mock 切到真实微信请求：

```env
WECHAT_PAY_USE_MOCK=false
```

必须已具备：

- 微信开放平台移动应用审核通过。
- 移动应用 AppID 与微信支付商户号绑定。
- 商户号已开通 App 支付。
- `WECHAT_PAY_APP_ID`、`WECHAT_PAY_MCH_ID` 配置正确。
- 商户 API 私钥、证书序列号、API v3 Key 配置正确。
- 微信平台证书已配置到 `WECHAT_PAY_PLATFORM_CERT_PATH`。
- `WECHAT_PAY_NOTIFY_URL` 是公网 HTTPS 地址。
- Android 包名/签名、iOS Bundle ID/Universal Link 与微信开放平台一致。

### 6. 阶段 6 验收标准

- 后端 mock 测试脚本通过。
- 前端“微信支付测试”入口可以创建测试订单和支付流水。
- 配置缺失时页面显示“微信支付尚未配置”，不会假成功。
- Android/iOS 原生插件能返回标准结构。
- 真机配置齐全时可以调起微信客户端。
- 模拟通知或真实通知到达后，后端将 payment/order 更新为 paid。
- 前端轮询到 paid 后才展示最终支付成功。

## 需要办理的账号

### 微信支付

1. 以 Heybo Pet 实际经营主体申请微信支付商户号。
2. 完成企业/个体工商户主体认证和结算银行账户验证。
3. 在微信开放平台创建移动应用，填写 iOS Bundle ID、Android 包名和签名。
4. 移动应用审核通过后，将 AppID 与微信支付商户号绑定。
5. 开通 `App 支付` 产品。
6. 生成 API v3 Key、商户 API 证书/私钥，并配置 HTTPS 通知地址。

### 支付宝

1. 以同一经营主体注册并认证支付宝开放平台账号。
2. 创建移动应用并申请 `APP 支付` 能力。
3. 填写应用资料、隐私政策、iOS/Android 包信息并提交审核。
4. 使用支付宝密钥工具生成应用私钥，配置支付宝公钥或证书模式。
5. 配置 HTTPS 异步通知地址并完成上线审核。

## 服务器配置

配置项模板见 `backend/.env.payment.example`。真实密钥只能放在大陆测试服务器的密钥管理或环境变量中，不得写入 React、Capacitor 原生工程或 GitHub。

当前接口：

- `GET /api/payments/providers`：查看两种支付方式的配置就绪状态。
- `POST /api/payments`：为订单创建支付流水，支持 `Idempotency-Key`。
- `GET /api/payments`：查询当前用户支付流水。
- `GET /api/payments/:id`：查询支付及关联订单状态。
- `POST /api/payments/mock-callback`：仅本地开发模拟；生产环境必须关闭。

在商户参数未配置时，创建支付接口返回 HTTP `503` 和 `configuration_pending`，避免前端把未真实支付的订单误判为成功。

## 上线前必须补齐

- 微信支付 App 下单适配器和通知验签。
- 支付宝 App 下单适配器和通知验签。
- 支付回调公网 HTTPS 域名。
- 订单超时关闭、重复通知幂等和主动查单。
- 退款申请、退款回调和退款流水。
- 日终对账、差错告警和财务导出。
- 隐私政策、用户协议、商品退款规则和发票规则。
- 真实商品名称、价格、库存、运费和收货地址校验。
