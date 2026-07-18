# Pet Chef 工厂 SDK 联调包

这套构建只包含 Heybo 测试登录、Tuya 静默注册/登录、设备配网、设备列表、DP 调试和 DIY 烹饪控制。

食谱、犬种、商城和完整消费者界面不会进入工厂联调包。

当前工厂测试后端：

```text
http://8.130.211.76
```

由于测试服务器暂时使用 HTTP，Android 和 iOS 工厂工程临时允许明文请求。开始外部用户测试并切换 HTTPS 后，应移除 Android `usesCleartextTraffic` 和 iOS `NSAllowsArbitraryLoads`。

## 账号映射

- 用户先通过 Heybo 测试登录接口登录或创建账号。
- Heybo 后端返回对应的 `tuya_uid`。
- App 随后调用 Tuya SDK 自动注册或登录该账号。
- 白名单手机号 `18757129405` 固定映射到同名 Tuya UID。
- 其他测试账号使用后端生成的 `heybo_<userId>` Tuya UID。
- Android 和 iOS 使用 Heybo 后端返回的稳定工厂测试凭证完成 Tuya 注册或登录。
- 白名单账号的测试凭证与手机号相同；其他现有测试账号暂以 `tuya_uid` 作为测试凭证，兼容此前 Android 已创建的 Tuya 账号。
- 这个字段只用于内部 SDK 验证。外部用户测试阶段应改为服务端管理的正式 Tuya 身份方案。

服务器需要允许以下 Capacitor 来源访问 API：

```text
capacitor://localhost
https://localhost
```

## 构建命令

在 `frontend` 目录执行：

```bash
# 同时生成轻量 Web 资源并同步到 Android 和 iOS
npm run app:factory

# 只同步 iOS
npm run app:factory:ios

# 只同步 Android
npm run app:factory:android
```

Android Studio 打开：

```text
frontend/android
```

Xcode 打开：

```text
frontend/ios/App/App.xcworkspace
```

## 完整业务版本

完整业务版本仍使用：

```bash
npm run build
npx cap sync
```

不要使用完整业务构建命令制作工厂联调包，否则食谱图片等公共资源会被复制到原生工程。
