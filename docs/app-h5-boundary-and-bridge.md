# Pet Chef H5 边界与 JS Bridge 设计

更新时间：2026-07-10

## 1. 目标

Pet Chef App 采用 Hybrid 架构：

```text
设备核心原生化 + 业务内容 H5 化
```

JS Bridge 只做轻量导航和登录态协作，不承载设备控制能力。

## 2. 当前 H5 和原生桥接位置

H5 API 客户端：

```text
frontend/src/api/index.js
```

H5 原生能力封装：

```text
frontend/src/native/heyboTuya.js
frontend/src/native/capabilities.js
frontend/src/native/nativeReadiness.js
```

Android 当前 Capacitor Plugin：

```text
frontend/android/app/src/main/java/com/heybopet/petchef/HeyboTuyaPlugin.java
```

现状判断：

- 当前已有 Capacitor 插件和 Web mock。
- 当前 H5 侧存在 `publishDps`、`startDiyCooking`、`pauseCooking`、`resetCooking` 等设备控制入口。
- 新 App 架构下，这些能力不应继续作为 H5 Bridge 对外能力；应转到原生页面内部调用。

## 3. H5 页面边界

继续 H5 化：

```text
宠物档案
AI 推荐食谱
食谱详情
商城
内容页
用户协议
隐私政策
```

原生化：

```text
烹饪中心
我的鲜食机
鲜食机详情
添加鲜食机
Tuya 配网页
蓝牙 / Wi-Fi / 定位权限页
配网失败引导页
设备解绑确认页
网络异常页
App 版本更新页
```

## 4. Bridge 允许能力

H5 -> Native：

```text
getAuthToken()
getAppInfo()
openNativeCookingCenter()
openNativeDeviceDetail(deviceId)
openNativeAddDevice()
openSystemBrowser(url)
goHome()
```

Native -> H5：

```text
openH5Page(route, params)
notifyAuthChanged()
notifyAppForeground()
notifyNetworkChanged()
```

`getAppInfo()` 返回建议：

```json
{
  "platform": "android",
  "appVersion": "1.0.0",
  "buildNumber": 1,
  "environment": "staging",
  "apiBaseUrl": "https://api.example.com"
}
```

`apiBaseUrl` 只允许返回当前环境标识或安全域名，不返回任何 Tuya secret。

## 5. Bridge 禁止能力

H5 禁止直接调用：

```text
sendDeviceCommand()
publishDps()
startDiyCooking()
pauseCooking()
resetCooking()
unbindDevice()
startPairing()
connectBleDevice()
getRawTuyaToken()
getTuyaAppSecret()
```

原因：

1. H5 运行环境更容易被调试和篡改。
2. DP 命令属于设备安全控制，必须经过后端校验和原生状态检查。
3. 配网和 BLE 权限依赖 Android 原生生命周期。
4. Tuya 密钥和 token 不能进入 H5。

## 6. 推荐 Bridge 文件结构

Android：

```text
frontend/android/app/src/main/java/com/heybopet/petchef/web/
  H5ContainerActivity.java
  H5Bridge.java
  BridgeCommand.java
  H5Route.java
```

H5：

```text
frontend/src/native/appBridge.js
frontend/src/native/nativeRoutes.js
```

MVP 可以先复用 `frontend/src/native/capabilities.js` 和 `nativeReadiness.js`，只新增最小 `appBridge.js`。

## 7. 登录态共享

推荐方式：

```text
Native AuthSessionStore
  -> stores access token securely
  -> injects token to WebView on page load
  -> H5 calls getAuthToken() when needed
  -> H5 uses Authorization header for backend API
```

规则：

- Access token 可以短期给 H5 使用。
- Refresh token 只保存在原生安全存储。
- H5 不持久化 refresh token。
- H5 遇到 401 只通知原生刷新或跳登录。
- 原生控制登出，清理原生 token 和 WebView storage。

## 8. 原生打开 H5

Native 打开 H5 页面时只传业务路由和必要参数：

```text
openH5Page("pets")
openH5Page("pet-detail", { petId: "pet_xxx" })
openH5Page("recipe-detail", { recipeId: "rcp_xxx" })
openH5Page("privacy-policy")
```

不要通过 URL query 传：

- access token
- refresh token
- Tuya appKey
- Tuya appSecret
- raw DP payload
- 手机号完整明文

## 9. H5 打开原生页面

H5 可以请求打开：

```text
openNativeCookingCenter()
openNativeDeviceDetail(deviceId)
openNativeAddDevice()
```

Native 收到请求后必须：

1. 检查登录态。
2. 必要时检查设备归属。
3. 打开对应原生页面。
4. 不从 H5 接收任意 DP 命令。

## 10. 后端 API 边界

H5 可以继续调用：

```text
/api/pets
/api/recipes
/api/recommend
/api/ai-analysis
/api/products
/api/orders
/api/payments
```

设备核心 API 应由原生页面调用：

```text
/api/app/devices
/api/app/devices/:device_id/status
/api/app/cooking/prepare
/api/app/cooking/:operation_id/dispatch-result
/api/app/cooking/:operation_id/status
```

旧接口如：

```text
/api/tuya/start
/api/tuya/pause
/api/tuya/stop
```

不应作为 H5 生产控制链路继续扩展。

## 11. MVP 验收标准

1. H5 能读取 App 登录 token。
2. H5 能打开原生烹饪中心。
3. H5 能打开原生鲜食机详情。
4. H5 能打开原生添加设备页。
5. 原生能打开 H5 宠物档案和食谱页面。
6. H5 无法通过 Bridge 直接下发 DP。
7. Bridge 返回值不包含 Tuya appSecret、refresh token 或敏感设备凭证。

## 12. 不做的事

- 不设计复杂通用 RPC Bridge。
- 不让 H5 调任何原始 Tuya SDK 方法。
- 不把设备控制逻辑散落到 H5。
- 不把 Bridge 做成后端 API 的替代品。
- 不在 URL 或 localStorage 中长期保存敏感 token。

