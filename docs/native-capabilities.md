# App 原生能力层

本文档梳理 Heybo Pet App 的 native capability layer。当前前端采用 React + Capacitor，Web 预览必须可运行；真实手机能力由 iOS / Android 原生插件逐步实现。

## 设计目标

- 前端只调用 `frontend/src/native/capabilities.js` 暴露的 facade，不直接散落调用原生 SDK。
- 每个能力都提供 `status/readiness`，在 Web 预览返回明确的 `unavailable` 或 `not_configured`，不直接抛异常。
- 原生插件未接入时返回 `not_implemented`，方便 UI 做灰态、提示或降级。
- SDK Key、Secret、支付私钥、推送证书等敏感材料不得写入前端包，应放在原生安全配置或后端。

## 代码入口

```text
frontend/src/native/capabilities.js
frontend/src/native/nativeReadiness.js
frontend/src/native/heyboTuya.js
```

推荐调用：

```js
import { NativeCapabilities } from './native/capabilities';

const readiness = await NativeCapabilities.readiness();
const wechat = await NativeCapabilities.auth.wechatLogin();
const token = await NativeCapabilities.secureStorage.get('access_token');
```

## Readiness 状态

统一状态字段：

| status | 含义 |
| --- | --- |
| `ready` | 能力可用，且依赖条件满足 |
| `unavailable` | 当前运行环境不可用，常见于 Web 预览 |
| `not_configured` | 原生能力存在，但缺少 App ID、证书、权限说明等配置 |
| `not_implemented` | facade 已存在，原生插件尚未接入 |
| `needs_permission` | 需要用户授权或系统权限 |
| `error` | 状态检测或调用失败 |

Web 预览下应优先展示 `message/reason`，不要把不可用当成异常流程。

## 能力模块

### Tuya SDK

用途：

- 设备配网、绑定、Home 管理、设备列表、DP 下发。
- Pet Chef 第一阶段用于 85°C DIY 烹饪闭环。

当前基础：

- 已有 `frontend/src/native/heyboTuya.js`。
- `capabilities.js` 透出 Tuya status/init/login/home/device/pairing/DP facade。
- Web 预览返回 demo 设备，真实配网和 DP 下发只在 App 壳内可用。

依赖条件：

- Tuya Smart Life App SDK。
- Android 需要 Tuya Maven 依赖、本地安全算法包、AppKey/AppSecret、网络/Wi-Fi/蓝牙/定位权限。
- iOS 需要 Tuya iOS SDK、CocoaPods 或等价集成、Bundle ID 与证书匹配。
- 详细状态见 `docs/tuya-sdk-integration.md`。

需要准备：

- Tuya Developer Platform 企业账号。
- 正式商用 SDK 授权。
- iOS Bundle ID、Android Package Name。
- Android debug/release SHA256。
- Tuya AppKey/AppSecret、安全图片或安全算法包。
- 产品 PID、DP 定义、配网模式确认。

### 微信登录

用途：

- 使用微信 OAuth 获取授权 code。
- 后端用 code 换取 unionid/openid，并绑定 Heybo 用户。

依赖条件：

- iOS/Android 接入微信 Open SDK。
- App 包名、签名、Universal Link、URL Scheme 需要和微信开放平台配置一致。
- 后端需要处理 code 换 token，前端不得持有微信 AppSecret。

需要准备：

- 微信开放平台账号与移动应用。
- AppID、Universal Link、iOS URL Scheme、Android 应用签名。
- 隐私政策、应用官网、应用截图和审核材料。
- 后端账号绑定接口。

### 微信支付

用途：

- 唤起微信支付完成会员、耗材、设备或服务订单支付。
- App 端只负责拉起支付和回传结果，订单创建与验签由后端完成。

依赖条件：

- 微信 Open SDK。
- 后端创建预支付订单并返回支付参数。
- iOS/Android 支付回调 URL Scheme 配置正确。

需要准备：

- 微信商户号、商户 API 证书/API v3 Key。
- 微信开放平台 AppID 与商户号绑定。
- 商品/服务类目、结算账户、企业资质。
- 后端订单、回调通知、验签、退款能力。

### 支付宝

用途：

- 唤起支付宝 App 支付。
- App 接收支付结果，最终支付状态以后端异步通知为准。

依赖条件：

- iOS/Android 接入支付宝开放平台 SDK。
- 后端生成 order string，App 不保存支付宝私钥。
- iOS URL Scheme 与 Android 包名签名配置正确。

需要准备：

- 支付宝开放平台应用。
- AppID、商户账号、应用公钥/私钥配置。
- 企业认证、经营类目、回调地址。
- 后端订单签名、支付通知验签、退款接口。

### Apple ID

用途：

- iOS 使用 Sign in with Apple 登录。
- 后端校验 identity token，并绑定 Heybo 用户。

依赖条件：

- Apple Developer Program。
- iOS App 开启 Sign in with Apple capability。
- 后端校验 Apple JWT、nonce、audience、issuer。

需要准备：

- Apple Team ID、Bundle ID、Services ID。
- Sign in with Apple capability。
- 后端 client id、key id、private key 和回调配置。
- 隐私政策与账号删除入口。

### Google ID

用途：

- Android 或 iOS 使用 Google 登录。
- 后端校验 ID token，并绑定 Heybo 用户。

依赖条件：

- Google Cloud OAuth Client。
- iOS URL Scheme 或 Android SHA-1/SHA-256 配置。
- 后端校验 token audience 和 issuer。

需要准备：

- Google Cloud 项目。
- Android OAuth Client、iOS OAuth Client、Web Client ID。
- Android 包名与签名证书指纹。
- iOS Bundle ID 与 URL Scheme。
- OAuth consent screen、隐私政策、品牌信息。

### Push

用途：

- 设备状态、烹饪完成、异常提醒、营销或服务通知。
- App 获取 push token 后提交后端，后端按用户和设备维度发送通知。

依赖条件：

- iOS APNs 权限、证书或 Auth Key、通知权限说明。
- Android FCM 或中国大陆厂商通道策略。
- 后端 token 注册、解绑、发送和失败 token 清理。

需要准备：

- Apple Push Notification Auth Key 或证书。
- Firebase 项目或厂商推送账号。
- 通知类别、用户授权文案、营销通知开关。
- 后端推送服务和消息模板。

### 相机 / 文件上传

用途：

- 拍照上传宠物照片、食品包装、处方或售后凭证。
- 选择本地图片/文件并上传到 Heybo 后端或对象存储。

依赖条件：

- iOS Camera、Photo Library 权限说明。
- Android Camera、Photo Picker 或存储权限。
- 后端上传凭证、文件大小限制、MIME 类型校验。

需要准备：

- iOS `NSCameraUsageDescription`、`NSPhotoLibraryUsageDescription`。
- Android 权限和 FileProvider 策略。
- 上传接口、对象存储 bucket、CDN、病毒/内容安全策略。
- 图片压缩、EXIF 处理、失败重试规则。

### 原生安全存储

用途：

- 保存 access token、refresh token、设备绑定临时凭证等敏感数据。
- Web 预览不模拟持久化安全存储，避免误以为浏览器 localStorage 等价。

依赖条件：

- iOS Keychain。
- Android Keystore / EncryptedSharedPreferences。
- Token 刷新、退出登录清理、设备迁移策略。

需要准备：

- Token 生命周期和刷新协议。
- 退出登录、注销账号、设备丢失后的清理策略。
- iOS Keychain Access Group 如需跨扩展共享需提前规划。
- Android backup 策略，避免敏感数据被云备份恢复到不可信设备。

### 权限

用途：

- 统一管理相机、相册、蓝牙、定位、通知、网络状态等权限。
- 业务层先检查 readiness，再引导用户授权或打开系统设置。

依赖条件：

- iOS Info.plist 权限说明。
- Android Manifest 权限和运行时授权。
- 各系统版本差异，例如 Android 13 通知权限、Android 12 蓝牙权限。

需要准备：

- 每项权限的用户可读授权文案。
- 隐私政策和权限使用说明。
- 拒绝、永久拒绝、二次引导和设置页跳转策略。
- 权限与业务功能的映射表。

## 后续主线程集成点

- 在 App 启动或关键页面调用 `NativeCapabilities.readiness()`，把不可用能力展示为灰态或提示。
- 登录页接入 `NativeCapabilities.auth.wechatLogin/appleLogin/googleLogin`，并把第三方凭证交给后端绑定 Heybo 账号。
- 支付页从后端拿订单参数，再调用 `NativeCapabilities.payments.wechatPay/alipayPay`。
- 用户登录后注册 Push token，并在退出登录时解绑。
- 上传头像、宠物照片、售后凭证时走 `NativeCapabilities.media`。
- 认证 token 改为 `NativeCapabilities.secureStorage` 存取，避免落入普通 Web 存储。
- 需要相机、蓝牙、定位、通知前统一通过 `NativeCapabilities.permissions` 检查和请求。
