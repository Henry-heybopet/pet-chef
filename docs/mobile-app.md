# 独立 App 壳开发说明

## 当前状态

当前移动端方案采用：

```text
React Web App
  -> Vite build
  -> Capacitor
  -> iOS / Android 原生工程
```

这一步先把现有 Web App 封装成独立 App 壳。后续 Tuya App SDK、扫码、推送、支付等手机能力，需要继续通过 Capacitor 原生插件或原生模块接入。

真机安装和测试复现步骤见：[iOS / Android Demo 安装测试说明](mobile-demo-test-guide.md)。

## App 信息

```text
appId: com.heybopet.petchef
appName: Pet Chef
webDir: frontend/dist
```

配置文件：

```text
frontend/capacitor.config.json
```

## 常用命令

在 `frontend` 目录执行：

```bash
npm run build
npm run cap:sync
npm run app:build
npm run cap:ios
npm run cap:android
```

说明：

- `npm run build`：构建 Web 资源到 `dist`。
- `npm run cap:sync`：同步 Web 资源和 Capacitor 配置到 iOS/Android 工程。
- `npm run app:build`：先构建 Web，再同步到原生工程。
- `npm run cap:ios`：用 Xcode 打开 iOS 工程。
- `npm run cap:android`：用 Android Studio 打开 Android 工程。

## 后端地址配置

Web 本地开发可以继续使用 Vite 的 `/api` 代理。

当前生产构建已经默认连接 Heybo Pet 线上后端：

```bash
VITE_API_URL=https://petchef.heybopet.com
```

移动 App 运行在手机里时，不能依赖本机浏览器代理，需要设置真实可访问的后端地址：

```bash
VITE_API_URL=https://your-api-domain.com
```

本地调试真机时，也可以临时使用局域网地址，例如：

```bash
VITE_API_URL=http://192.168.1.20:3001
```

注意：

- 手机和电脑需要在同一局域网。
- 后端需要允许 CORS。
- 正式发布必须使用 HTTPS。
- Gemini、Tuya 等 API Key 仍然只能放在后端，不能放进 App 前端包。

## Android 版本升级与签名

Android 正式包名固定为 `com.heybopet.petchef`。覆盖升级必须同时满足：包名不变、签名证书一致、`versionCode` 递增。V2.0 起使用长期 Release 证书，证书及密码必须离线或放入密码管理器，不能提交 Git。

```bash
cd frontend
npm run app:build
cd android
ANDROID_RELEASE_STORE_FILE=/绝对路径/petchef-release.jks \
ANDROID_RELEASE_STORE_PASSWORD=*** \
ANDROID_RELEASE_KEY_ALIAS=*** \
ANDROID_RELEASE_KEY_PASSWORD=*** \
./gradlew bundleRelease assembleRelease
```

`bundleRelease` 生成供 Google Play 等应用市场使用的 AAB，`assembleRelease` 生成正式签名 APK。发布前必须用 `apksigner verify --print-certs` 检查 APK 证书指纹，并用 `aapt dump badging` 确认包名、`versionCode` 和 `versionName`。首次 V2.0 Release 证书确定后，后续版本必须保持同一证书。

App 启动时请求 `GET /api/v1/app-releases/android`。后端通过以下环境变量控制升级策略：

- `ANDROID_LATEST_VERSION_CODE`
- `ANDROID_MINIMUM_VERSION_CODE`
- `ANDROID_LATEST_VERSION_NAME`
- `ANDROID_UPDATE_URL`（华为应用市场、Google Play 或官方 HTTPS 发布页）
- `ANDROID_RELEASE_NOTES`（用 `|` 分隔多条）

升级门禁从 V2.0（`versionCode=2`）开始生效。已安装的 V1 客户端没有版本检查代码，服务器无法强制它显示升级页，必须通过原有分发渠道引导用户先安装 V2.0。若 V1 使用 Debug 证书而 V2.0 改用正式 Release 证书，Android 不允许直接覆盖安装；用户需要卸载 V1 后从应用市场安装 V2.0，并提前处理只保存在本机的数据。V2.0 发布过渡期保持 `latest=2, minimum=1`；未来发布 V3 时可将 `minimum` 提高到 2。先验证应用市场地址，再提高最低版本；紧急回滚时降低最低版本号即可解除 V2 及以后客户端的门禁。

华为应用市场与 Google Play 的同一包名发布必须分别保持各自升级链路的签名连续性；如果希望用户跨市场覆盖升级，还需要确保最终 App 签名证书兼容。签名策略一经正式发布不能随意更换。

版本接口超时、断网或响应异常时，V2.0 不得锁死启动：页面应提示网络异常，并允许用户继续使用无需联网的本地功能。联网功能仍可能因网络不可用而失败。

客户端只打开应用市场或官方 HTTPS 发布页，不在 App 内下载 APK，因此不返回或宣称客户端已校验 APK SHA-256。应用市场分发应优先使用 AAB；Web 资源热更新只能覆盖 HTML/JS/CSS，不能替代包含 Java、SDK 或权限变更的正式版本升级。

## 当前未完成项

- Tuya App SDK 配网。
- 设备绑定到 Heybo 用户账号。
- iOS/Android 权限说明。
- App 图标和启动屏。
- 推送通知。
- 扫码识别鲜食包。

## 下一步建议

1. 用 Xcode / Android Studio 打开原生工程，确认 App 壳能在真机运行。
2. 用线上后端验证品种、食谱、AI 分析等接口流程。
3. 接入 Tuya App SDK，先验证添加设备和绑定流程。
4. 再把设备 DP 控制接入一键烹饪流程。
