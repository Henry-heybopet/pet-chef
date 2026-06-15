# iOS / Android Demo 安装测试说明

本文档用于复现 Pet Chef 当前 Demo 版本在 iPhone 和 Android 真机上的安装与功能验证流程。

## 当前基线

```text
App 名称：Pet Chef
Bundle / Package ID：com.heybopet.petchef
前端框架：React + Vite
移动端封装：Capacitor
线上后端：https://petchef.heybopet.com
```

当前版本已验证：

- iPhone 真机可安装运行。
- Android 真机可安装运行。
- 犬种列表可加载。
- 食谱菜单可加载。
- 首页可在手机首屏直接点击“我的爱犬”和“AI 食谱”。
- 顶部返回键、语言选择按钮已做安全区适配。
- iPhone 左侧右滑返回已支持基础页面返回。

## 准备环境

需要安装：

- Node.js / npm
- Xcode，用于 iOS 真机运行
- Android Studio，用于 Android 真机运行
- Git

项目目录：

```bash
/Users/yhl/Antigravity/pet chef
```

进入前端目录：

```bash
cd "/Users/yhl/Antigravity/pet chef/frontend"
```

每次安装到手机前，建议先执行：

```bash
npm run app:build
```

该命令会完成：

```text
Vite build
  -> 同步 Web 资源到 iOS 工程
  -> 同步 Web 资源到 Android 工程
```

## iOS 真机安装

1. 打开 iOS 工程：

```bash
npm run cap:ios
```

2. 在 Xcode 中完成以下设置：

- 登录 Apple ID。
- 选择 Target `App`。
- 进入 `Signing & Capabilities`。
- 勾选 `Automatically manage signing`。
- Team 选择自己的 Apple Development Team。
- Bundle Identifier 当前为 `com.heybopet.petchef`。

3. iPhone 设置：

- 用 USB 连接电脑。
- 手机上信任这台电脑。
- 打开开发者模式。
- 若提示重启，按系统提示完成。

4. 在 Xcode 顶部选择自己的 iPhone，点击 Run。

## Android 真机安装

1. 打开 Android 工程：

```bash
npm run cap:android
```

2. Android Studio 第一次打开时：

- 选择信任项目。
- 等待 Gradle Sync 完成。
- 暂时忽略 Android Gradle Plugin 升级提示。
- 暂时忽略 Gradle Daemon toolchain 迁移提示。

3. Android 手机设置：

- 进入设置。
- 关于手机。
- 连续点击“版本号”7次，开启开发者选项。
- 进入开发者选项。
- 打开 USB 调试。
- 用 USB 连接电脑。
- 手机弹窗选择允许 USB 调试。

4. Android Studio 顶部选择已连接手机，点击 Run。

## 功能验证清单

安装后建议按顺序验证：

1. App 能正常启动。
2. 首页顶部语言按钮可点击，不被状态栏遮挡。
3. 首页“我的爱犬”可直接点击。
4. 首页“AI 食谱”可直接点击，不需要先向上滑动。
5. 进入健康食谱页，返回按钮可点击。
6. 从左侧边缘向右滑动，可返回上一级页面。
7. 犬种选择列表正常显示，不只显示“其他（自定义）”。
8. 年龄、体重可调整。
9. 点击开始分析后，食谱分类和食谱菜单可显示。
10. 食谱详情页可打开。
11. 烹饪流程页可进入。

## 后端连接

移动端生产构建默认连接：

```text
https://petchef.heybopet.com
```

配置文件：

```text
frontend/.env.production
```

关键配置：

```bash
VITE_API_URL=https://petchef.heybopet.com
```

注意：

- iOS / Android 正式包应使用 HTTPS。
- API Key 不应放在前端 App 包内。
- Gemini、Tuya 等密钥后续应由后端统一管理。

## 常见问题

### 犬种列表只显示“其他（自定义）”

通常是手机 App 没有连接到后端。检查：

- `frontend/.env.production` 是否配置了 `VITE_API_URL`。
- 后端接口是否可访问。
- 修改后是否重新执行了 `npm run app:build`。
- 是否重新在 Xcode / Android Studio 中 Run 安装新包。

### iPhone 顶部按钮点不到

当前版本已加入安全区适配。如果仍出现问题：

- 确认手机上安装的是最新 Run 的版本。
- 执行 `npm run app:build` 后重新 Run。
- 截图反馈具体机型和页面。

### Android Studio 提示升级 Gradle

Demo 验证阶段先不要升级。等准备正式发布前，再单独做 Gradle / Android Gradle Plugin 升级测试。

### Android Studio 找不到手机

检查：

- USB 线是否支持数据传输。
- 手机是否开启 USB 调试。
- 手机是否弹出并允许 USB 调试授权。
- Android Studio 顶部设备列表是否刷新。

## 下一阶段

下一阶段再开始：

- 接入 Tuya App SDK。
- Heybo 账号体系。
- 设备配网和设备绑定。
- 宠物档案与设备控制闭环。
- App 图标、启动屏、权限说明和正式签名。
