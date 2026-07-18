# Pet Chef Android Hybrid App 原生核心架构

更新时间：2026-07-10

## 1. 当前项目结构判断

主工作区：

```text
/Users/yhl/Antigravity/pet chef
```

当前分支：

```text
feature/ai-recipe-bugs-fix
```

当前工作区状态：扫描时 `git status --short` 为空，主工作区干净。

现有一级结构：

```text
admin/                         管理后台 H5
api/                           轻量 API/部署入口
backend/                       Node/Express 后端
business-graphify/             业务图谱分析输出
docs/                          项目文档
frontend/                      React H5 + Capacitor 壳
frontend/android/              已存在 Android Capacitor 工程
frontend/ios/                  已存在 iOS Capacitor 工程
frontend/src/native/           H5 调原生能力的 JS 封装
graphify-out/                  图谱输出
scratch/                       临时材料
```

已存在相关目录：

```text
frontend/android/              存在
frontend/ios/                  存在
frontend/src/native/           存在
frontend/android/app/src/main/java/com/heybopet/petchef/ 存在
```

没有在仓库根部发现独立的 `android/`、`mobile/`、`native-shell/` 目录。当前 Android 工程位于 `frontend/android/`。

已存在相关 worktree：

```text
/Users/yhl/Antigravity/pet-chef-native-shell     feature/native-shell
/Users/yhl/Antigravity/pet-chef-tuya-sdk         feature/tuya-sdk
```

所有扫描到的 worktree 在本次检查中 `git status --short` 均为空。

## 2. 当前前端、后端、设备、Tuya 代码位置

前端 H5：

```text
frontend/src/App.jsx
frontend/src/components/
frontend/src/api/index.js
frontend/src/native/heyboTuya.js
frontend/src/native/capabilities.js
frontend/src/native/nativeReadiness.js
```

当前 H5 设备相关页面：

```text
frontend/src/components/CookingCenterPage.jsx
frontend/src/components/CookingScreen.jsx
frontend/src/components/TuyaDeviceFlow.jsx
```

Android 原生 / Capacitor 壳：

```text
frontend/android/app/src/main/AndroidManifest.xml
frontend/android/app/src/main/java/com/heybopet/petchef/MainActivity.java
frontend/android/app/src/main/java/com/heybopet/petchef/HeyboTuyaPlugin.java
frontend/android/app/build.gradle
```

当前 Android Tuya 插件：

```text
frontend/android/app/src/main/java/com/heybopet/petchef/HeyboTuyaPlugin.java
```

现有能力包括：

- Tuya SDK 初始化
- Tuya UID 登录或注册
- Home 创建和查询
- 设备列表查询
- Wi-Fi EZ/AP 配网
- BLE 扫描和多模配网
- DP 下发
- DIY 烹饪启动、暂停、重置
- 设备解绑
- DP / 在线状态监听
- 蓝牙设置页跳转

后端设备绑定和业务 API：

```text
backend/src/routes/heybo.js
```

已有接口：

```text
GET    /api/devices
POST   /api/devices
POST   /api/devices/:id/dp-sync
DELETE /api/devices/:id
POST   /api/devices/:id/pets
GET    /api/operations/cooking
POST   /api/operations/cooking
```

后端 Tuya OpenAPI 客户端：

```text
backend/src/services/tuya.js
```

后端旧 Tuya 直控接口：

```text
POST /api/v1/tuya/start
POST /api/v1/tuya/pause
POST /api/v1/tuya/stop
GET  /api/v1/tuya/status
```

这些接口当前更像早期调试/模拟通道。Android MVP 不应让 H5 通过这些接口绕过原生设备页面直接控制设备。

## 3. 推荐的新 App 架构

第一阶段不另建根级 `mobile/`。最小安全路径是复用现有 Capacitor Android 工程，在 `frontend/android/app/src/main/java/com/heybopet/petchef/` 下增加清晰的原生分层。

推荐架构：

```text
Android App
  -> Native Shell / Navigation
  -> Native Device Pages
  -> TuyaDeviceAdapter
  -> Backend API Client
  -> WebView H5 Container

Backend
  -> Account / Auth
  -> Device ownership
  -> Recipe and safety validation
  -> Cooking operation records
  -> Device DP sync records

H5
  -> Pet profiles
  -> AI recipe recommendation
  -> Recipe details
  -> Mall / content / agreements
```

核心原则：

1. 设备能力走 Android 原生层和 Tuya SDK。
2. H5 不直接拼 DP，不暴露 `sendDeviceCommand`、`publishDps`、`startCooking` 之类高风险桥接。
3. 后端负责用户、设备归属、食谱参数、安全规则、烹饪记录、审计日志。
4. 原生页面负责权限、配网、绑定、设备实时状态、关键控制体验。
5. H5 负责高频业务内容，避免每次业务文案和推荐逻辑变化都发版。

## 4. 推荐 Android 目录结构

在现有 Android 工程内落地：

```text
frontend/android/app/src/main/java/com/heybopet/petchef/
  MainActivity.java

  app/
    PetChefApplication.java
    AppConfig.java
    Environment.java

  navigation/
    AppNavigator.java
    NativeRoute.java

  auth/
    AuthSessionStore.java
    TokenProvider.java
    LoginGuard.java

  network/
    HeyboApiClient.java
    ApiResult.java
    ApiError.java

  device/
    TuyaDeviceAdapter.java
    TuyaDeviceState.java
    TuyaDpPayload.java
    TuyaPairingState.java
    TuyaErrorMapper.java

  device/pages/
    CookingCenterActivity.java
    MyDevicesActivity.java
    DeviceDetailActivity.java
    AddDeviceActivity.java
    TuyaPairingActivity.java
    PermissionGuideActivity.java
    PairingFailureActivity.java
    UnbindDeviceActivity.java

  web/
    H5ContainerActivity.java
    H5Route.java
    H5Bridge.java
    BridgeCommand.java

  system/
    SplashActivity.java
    NetworkErrorActivity.java
    VersionUpdateActivity.java
```

MVP 可以更小：先只建 `device/`、`device/pages/`、`network/`、`auth/`、`web/`。不要为了未来 iOS 或多品牌提前做复杂接口层。

## 5. 原生页面和 H5 页面边界

原生页面负责：

- 系统启动页
- 登录权限页
- 蓝牙 / Wi-Fi / 定位权限页
- 我的鲜食机
- 添加鲜食机
- Tuya 配网页
- 配网失败引导页
- 鲜食机详情
- 烹饪中心
- 设备解绑确认页
- 网络异常页
- App 版本更新页

H5 页面负责：

- 宠物档案
- AI 推荐食谱
- 食谱详情
- 商城
- 内容页
- 用户协议
- 隐私政策

边界规则：

| 场景 | 所属层 | 原因 |
| --- | --- | --- |
| 配网、蓝牙扫描、权限检查 | 原生 | 依赖系统权限和 Tuya SDK |
| 设备绑定、解绑、在线状态 | 原生 + 后端 | 设备归属和 SDK 状态必须稳定 |
| 烹饪启动、暂停、停止 | 原生 + 后端 | 属于设备安全控制 |
| DP 状态展示 | 原生优先 | 需要实时监听和离线处理 |
| 宠物档案编辑 | H5 | 高频业务迭代 |
| AI 食谱推荐 | H5 + 后端 | 后端规则可升级，页面变化快 |
| 协议和隐私政策 | H5 | 内容更新不应发版 |

## 6. 推荐后端 API 配合方式

Android 原生页面不要直接信任本地状态。设备控制链路建议固定为：

```text
Native Device Page
  -> Backend validates user / device ownership / recipe / safety / device state
  -> Backend returns approved command intent
  -> Native TuyaDeviceAdapter sends Tuya SDK command
  -> Native reports command result and DP status to backend
  -> Backend writes operation and audit state
  -> Native refreshes UI
```

推荐新增或整理的后端接口方向：

```text
GET    /api/app/devices
POST   /api/app/devices/bind
DELETE /api/app/devices/:device_id
GET    /api/app/devices/:device_id/status
POST   /api/app/devices/:device_id/dp-sync
POST   /api/app/cooking/prepare
POST   /api/app/cooking/:operation_id/dispatch-result
POST   /api/app/cooking/:operation_id/status
```

`prepare` 只生成经后端校验的命令意图，不直接允许 H5 或 App 任意提交 DP。

## 7. 登录态共享

推荐：

1. 原生持有 App 登录态，Token 存 Android 安全存储。
2. H5 WebView 启动时由原生注入短期访问 Token，或通过只读 Bridge 方法获取。
3. H5 API 请求继续使用 `Authorization: Bearer <token>`。
4. Token 刷新由原生统一处理，H5 只感知登录有效或失效。
5. H5 不保存长期 refresh token。

Bridge 只保留：

```text
getAuthToken
openNativeCookingCenter
openNativeDeviceDetail
openNativeAddDevice
openH5Page
getAppInfo
openSystemBrowser
goHome
```

明确禁止：

```text
sendDeviceCommand
publishDps
startCooking
pauseCooking
resetCooking
unbindDevice
```

## 8. 环境配置方式

不要硬编码服务器地址、Tuya appKey、appSecret。

推荐 Android 配置：

```text
frontend/android/gradle.properties                 非密默认配置
frontend/android/local.properties                  本机路径，不提交
frontend/android/tuya.properties                   本地 Tuya 密钥，不提交
CI/CD secret variables                             构建注入密钥
BuildConfig                                        编译期只读配置
```

推荐环境：

| 环境 | API Host | Tuya 配置 | 用途 |
| --- | --- | --- | --- |
| dev | 本地或测试后端 | Tuya 测试项目 | 开发自测 |
| staging | ECS 预发布域名 | Tuya 预发布/测试配置 | QA 和灰度 |
| prod | 正式域名 | Tuya 正式配置 | 生产 |

当前 ECS IP `8.130.211.76` 可以作为部署资产记录，但 App 内不应硬编码 IP。应使用域名和环境配置。

## 9. MVP 起点

如果下一步开始 Android MVP，建议从现有工程开始：

```text
frontend/android/app/src/main/java/com/heybopet/petchef/
```

第一批文件从这里拆：

```text
frontend/android/app/src/main/java/com/heybopet/petchef/HeyboTuyaPlugin.java
```

推荐先做：

1. 保留现有 Capacitor 壳。
2. 新增 `device/TuyaDeviceAdapter.java`，把 SDK 细节从 Plugin 中抽出。
3. 新增 `network/HeyboApiClient.java`，只封装 App 端必要后端 API。
4. 新增一个最小 `MyDevicesActivity.java` 或 `DeviceDetailActivity.java` 验证原生页面到 Adapter 的链路。
5. H5 只保留打开原生页面和读取登录态的基础 Bridge。

