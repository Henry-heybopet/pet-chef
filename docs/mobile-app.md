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

## 当前未完成项

- Tuya App SDK 配网。
- 设备绑定到 Heybo 用户账号。
- iOS/Android 权限说明。
- App 图标和启动屏。
- 推送通知。
- 扫码识别鲜食包。
- 正式后端域名和 HTTPS 部署。

## 下一步建议

1. 用 Xcode / Android Studio 打开原生工程，确认 App 壳能在模拟器运行。
2. 部署一个测试后端，配置 `VITE_API_URL`。
3. 接入 Tuya App SDK，先验证添加设备和绑定流程。
4. 再把设备 DP 控制接入一键烹饪流程。
