# Tuya SDK 集成记录

## 当前平台配置

Tuya Developer Platform 已创建 SDK App：

```text
App Name: Pet Chef
SDK Type: 智能生活 App SDK
Platform SDK Version: v7.5.0
Android Gradle SDK: com.thingclips.smart:thingsmart:7.5.6
iOS Bundle ID: com.heybopet.petchef
Android Package Name: com.heybopet.petchef
Region: 仅在中国大陆地区使用
SDK ID: 224929799
```

开发版限制：

- 最多 100 个终端用户账号。
- 不能用于商用发布。
- 正式发布前需要购买正式版，并重新构建 SDK。

## Android

Android 已完成：

- 构建 Android 开发版 SDK。
- 注册 debug keystore SHA256。
- 复制本地安全算法包到 `frontend/android/app/libs/`。
- 按官方 Android 集成文档增加 Maven 仓库：
  - `https://maven-other.tuya.com/repository/maven-releases/`
  - `https://maven-other.tuya.com/repository/maven-commercial-releases/`
- 增加 Gradle 依赖：
  - `com.thingclips.smart:thingsmart:7.5.6`
  - `com.alibaba:fastjson:1.1.67.android`
  - `com.squareup.okhttp3:okhttp-urlconnection:3.14.9`
- 排除 `thingsmart-modularCampAnno` 的 `1.0.0-SNAPSHOT` 传递依赖。该包在当前 Tuya Maven 仓库不可解析，且看起来属于编译期注解模块。
- 增加 Tuya 配网所需的网络、Wi-Fi、蓝牙、定位权限。
- 增加 Capacitor 原生插件 `HeyboTuya` 的 Android 骨架。
- 已验证 Android Debug 构建通过。

当前 Debug APK 输出：

```text
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

本地密钥配置：

```bash
cp frontend/android/tuya.properties.example frontend/android/tuya.properties
```

然后填写：

```properties
TUYA_ANDROID_APP_KEY=...
TUYA_ANDROID_APP_SECRET=...
```

`tuya.properties` 已加入 `.gitignore`，不要提交。

当前注册的 Android debug SHA256：

```text
2D:D3:16:F0:FD:7B:E9:AD:FE:D0:EE:1C:C9:10:FA:17:92:3A:6C:00:54:84:52:A9:03:73:F8:11:86:DB:12:97
```

## iOS

iOS 开发版 SDK 已构建并下载。

Tuya 生成包包含：

- `Podfile`
- `ios_core_sdk.tar.gz`
- `ThingSmartCryption.podspec`

当前 Capacitor iOS 工程使用 SPM 结构。接入 iOS Tuya SDK 时，需要引入 CocoaPods：

```ruby
pod 'ThingSmartHomeKit', '~> 7.5.0'
pod 'ThingSmartCryption', :path => './ios_core_sdk'
```

建议 Android 跑通后，再单独处理 iOS CocoaPods 集成，避免同时改变两端原生工程导致排查复杂。

## 前端调用

前端已增加：

```text
frontend/src/native/heyboTuya.js
```

当前可调用：

```js
import { HeyboTuya } from './native/heyboTuya';

await HeyboTuya.status();
await HeyboTuya.init();
await HeyboTuya.loginOrRegisterWithHeyboUid({ heyboUid: 'heybo-user-id' });
await HeyboTuya.ensureDefaultHome();
await HeyboTuya.getDeviceList({ homeId });
await HeyboTuya.startDiyCooking({
  devId,
  temperature: 85,
  cookTime: 1200,
  power: 8,
  speed: '1',
});
```

Web 环境会返回 `nativeAvailable: false`。

## App 页面闭环

首页已增加 `设备闭环` 入口，对应文件：

```text
frontend/src/components/TuyaDeviceFlow.jsx
```

当前页面流程：

1. 输入 Heybo Pet 测试账号：手机号或 Email。
2. App 创建本地测试 Heybo 用户 ID。
3. App 调用 `prepareTuyaForHeyboUser(heyboUid)`：
   - 初始化 Tuya SDK。
   - 使用 Heybo UID 静默登录/注册 Tuya UID。
   - 创建或获取默认 Tuya Home。
4. 拉取设备列表。
5. 如无设备，可输入 2.4 GHz Wi-Fi 的 SSID/password，选择 EZ 或 AP 模式开始配网。
6. 选择 Pet Chef 设备。
7. 点击 `启动 85°C DIY`，下发 85°C DIY 烹饪 DP。

Web 预览模式会返回一台模拟 Pet Chef 设备，方便检查页面流程。真实配网和真实 DP 下发必须在 Android/iOS App 壳内测试。

## 账号设计原则

用户只注册和登录 Heybo Pet 账号，不在 App 里重复注册涂鸦账号。

推荐映射流程：

```text
Heybo 用户注册/登录
  -> 生成 heybo_user_id
  -> App 原生层调用 Tuya loginOrRegisterWithUid
  -> Tuya UID 使用 heybo_user_id 派生
  -> 创建/获取默认 Home
  -> 绑定和控制设备
```

当前 Android 原生插件已增加：

- `loginOrRegisterWithHeyboUid`
- `getHomeList`
- `ensureDefaultHome`
- `getDeviceList`
- `publishDps`
- `getActivatorToken`
- `startWifiPairing`
- `stopPairing`
- `startDiyCooking`
- `pauseCooking`
- `resetCooking`

## Pet Chef DP 控制

当前 PID：

```text
ak2kofibhuvdtqip
```

第一阶段采用 DIY DP 控制闭环：

```json
{
  "1": true,
  "3": "diy",
  "7": 1200,
  "9": 85,
  "102": 8,
  "108": "1",
  "107": "start"
}
```

详细 DP 映射见：

```text
docs/tuya-pet-chef-dp-map.md
```

## 当前测试步骤

### Web 预览

```bash
cd frontend
npm run dev
```

打开：

```text
http://localhost:5173/
```

点击首页 `设备闭环`，可以用模拟设备完成：

- Heybo 测试登录。
- Tuya 静默登录模拟。
- 设备列表模拟。
- 85°C DIY DP 下发模拟。

### Android 真机

```bash
cd frontend
npm run build
npx cap sync android
cd android
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew :app:assembleDebug
```

APK 输出：

```text
frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

真机测试顺序：

1. 安装 APK。
2. 打开首页 `设备闭环`。
3. 输入测试手机号或 Email，点击登录。
4. 确认 Tuya SDK 初始化、默认 Home 创建成功。
5. 将 K15/Pet Chef 设备进入配网模式。
6. 工厂已确认第一版方向为 AP + 蓝牙辅助；当前 Android 桥接已支持 AP/EZ，其中蓝牙辅助配网仍需补 Tuya BLE/multi-mode SDK 实现。
7. 输入 2.4 GHz Wi-Fi 信息，优先测试 AP。
8. 配网成功后刷新设备列表。
9. 选择 PID 为 `ak2kofibhuvdtqip` 的设备。
10. 点击 `启动 85°C DIY`。

## 下一步

1. 将当前测试账号替换为真实 Heybo 后端手机号验证码登录。
2. 后端签发稳定 Tuya UID 和安全登录凭证，替换当前本地测试 UID。
3. 真机确认工厂固件支持的配网方式：EZ、AP、蓝牙辅助或扫码。
4. 真机联调 DP 下发顺序、状态回传、故障码。
5. 增加设备状态监听，把 `status`、`remain_time`、`temperature` 显示到 App 页面。
6. 把设备操作记录回写 Heybo 后端，绑定用户、家庭、设备、宠物和食谱。

## 还需要硬件方确认

- 支持的配网方式：已确认第一版按 AP + 蓝牙辅助推进；仍需确认 Tuya SDK 具体 BLE/multi-mode API 和设备端流程。
- 设备复位/进入配网模式的按键方式。
- 解绑后是否自动进入配网状态。
- 固件是否已经支持 App SDK 配网和 DP 控制。
- `multistep` raw 协议格式。
- `fault` 故障码含义。

## 2026-06-29 蓝牙配网权限修复与调试诊断仪升级记录

为了解决工厂在调试过程中遇到的“App内蓝牙扫描设备为空”及“云端Token等待获取”问题，进行了以下加固修改：

### 1. 修复 Android 原生蓝牙与定位权限机制
*   **根本原因**：debug App 目标 API 级别为 36 (Android 14+)。在 Android 12+ 上，蓝牙 BLE 扫描不仅需要静态声明，还必须在**运行时动态申请** `BLUETOOTH_SCAN` 和 `BLUETOOTH_CONNECT` 权限，且底层蓝牙广播扫描依赖定位服务 (`ACCESS_FINE_LOCATION`) 运行时权限和 GPS 开关。
*   **解决方案**：
    *   在 `HeyboTuyaPlugin.java` 类的头部注册 Capacitor `@Permission` 别名。
    *   在 `TuyaDeviceFlow.jsx` 的 `startBleScan()` 启动时，强制执行动态权限检查与弹窗申请。
    *   在原生 `status()` 方法中追加系统蓝牙开关、GPS 开关、Wi-Fi 频段和各项权限状态的实时读取，以供前端诊断。

### 2. 升级环境诊断仪面板 (Diagnostics Panel)
在 App 的设备流页面的顶端，集成了包含 15 个关键参数的 **“环境状态与配网监控诊断仪”** 模块：
*   **SDK & 账号状态**：SDK 初始化结果、当前登录 Heybo User ID、当前 Tuya Home ID。
*   **手机硬件开关**：系统蓝牙开关、系统定位 (GPS) 开关、当前连接 Wi-Fi 的 SSID 和频段（自适应识别 2.4G/5G 并给出更换警告）。
*   **运行时权限**：动态显现 `BLUETOOTH_SCAN`、`BLUETOOTH_CONNECT` 和 `ACCESS_FINE_LOCATION` 的授权绿/红灯。
*   **实时配网握手数据流**：
    *   **Token 预检与四状态细化**：细化为 `未请求`、`正在请求...`、`成功 (Token: xxx)`、`失败 (Error)` 四种状态。
    *   **连通性预测试**：用户登录并绑定家庭 ID 后，App 会在后台**自动触发一次 Token 获取测试**，无需物理设备也可测通涂鸦云端通路；并在诊断面板中增加了 `🧪 测试获取` 的手动测试按钮。
    *   待配网目标设备参数（显示 UUID / MAC / PID / Name）、配网成功 `onSuccess` 的设备 JSON 载荷、以及失败 `onError` 详细错误码。

### 3. 构建结果
*   经 `clean` 构建编译，成功打出包含以上诊断机制的最新 debug APK：
    `/Users/yhl/Antigravity/pet chef/frontend/android/app/build/outputs/apk/debug/app-debug.apk`

## 2026-06-30 修复配网闪退与运行日志可视化升级记录

### 1. 解决一键配网/一键绑定闪退 Bug
*   **根本原因**：涂鸦 SDK 配网网络请求（`getActivatorToken`）的 onSuccess/onFailure 回调运行在 **非 UI 线程（background thread）**。当回调触发时，原生的 `ThingHomeSdk.getActivatorInstance().newActivator(builder)` 和 `currentActivator.start()`（以及 `MultiModeActivator` 的启动与停止方法）在后台线程实例化了 Handler，导致 Android 抛出致命异常：`java.lang.RuntimeException: Can't create handler inside thread that has not called Looper.prepare()`，引发 App 闪退。
*   **解决方案**：
    *   在 `HeyboTuyaPlugin.java` 中，将所有 Activator 的实例化、开启（`.start()`、`.startActivator()`）以及停止/销毁（`stopCurrentActivator()`）全部包裹在 **`getActivity().runOnUiThread(Runnable)`** 中，确保所有涉及底层 Handler 消息机制的操作均在 Android UI 主线程执行。
    *   增加对 `MultiModeActivator` 异常情况的 try-catch，防止底层 SDK 二次报错抛出。

### 2. 升级运行日志输出 (Debugging Logs Console)
*   **痛点**：此前的“实时通信日志”被塞在特定设备被选中之后的 Details Tab 下。这导致在进行最需要调试的“登录账号 → 绑定家庭 → 蓝牙扫描 → 一键配网/启动备用配网”阶段时，界面上根本没有选中设备，测试人员完全无法查看日志，无法了解 App 在哪一步卡住或失败。
*   **解决方案**：
    *   在 [TuyaDeviceFlow.jsx](file:///Users/yhl/Antigravity/pet%20chef/frontend/src/components/TuyaDeviceFlow.jsx) 中，移除设备 Tab 主面板内的 logs 切换选项。
    *   将 **“Real-Time Console 运行日志输出 (Debugging Logs)”** 移出条件块，作为一等公民**永久呈现在页面最底部**。
    *   测试人员现在从“登录、获取Token、蓝牙扫描”到“点击一键绑定配网”的每一步，均能一目了然看到实时日志流输出，并支持随时一键复制到剪贴板，方便反馈研发。

### 3. Wi-Fi 配网 1006 错误超时原因说明
*   在日志栏和状态说明中补充说明：**`1006 out of time`** 是涂鸦云端/底层的配网超时错误。它意味着 App 成功发送了 Token 并开始了 EZ（快闪）或 AP（热点）信号广播，但设备在 120 秒内没有成功连接上 Wi-Fi 路由器或涂鸦云端。
*   **典型排查方法**：
    1.  确认输入的 Wi-Fi 密码是否有误。
    2.  确认 Wi-Fi 是否为标准的 2.4GHz 频段（不支持 5GHz，且最好将路由器的 2.4G/5G 双频合一改为独立 SSID）。
    3.  确认设备在配网前是否已经被复位（EZ 模式应为快速闪烁，AP 模式为慢闪，且手机在 AP 模式下需连接到 `SmartLife-xxxx` 机器热点）。

### 4. 解决蓝牙双模配网 NullPointerException
*   **根本原因**：在蓝牙辅助双模配网时，我们从 React 传递设备参数给原生 Android `connectBleDevice`，但在原生构造 `MultiModeActivatorBean` 对象时，仅设置了 `uuid`, `address`, `productId`, `ssid`, `pwd`, `token`, `timeout` 等参数，**遗漏了 `mac`（需为蓝牙 MAC 地址，在 BLE 环境下即为 `address`）、`deviceType` 与 `flag` 参数**。在涂鸦 SDK 底层启动多模配网器时，由于 `mac` 缺失或底层逻辑对该 Bean 对象的某些必需属性进行空指针敏感方法调用，导致抛出 `NullPointerException` (反馈为 `Start BLE activator failed: null`)。
*   **解决方案**：
    *   在原生 BLE 扫描回调 `bleDeviceFound` 事件中，向 JS 层额外透传 `deviceType` 与 `flag` 属性。
    *   在 React 组件 [TuyaDeviceFlow.jsx](file:///Users/yhl/Antigravity/pet%20chef/frontend/src/components/TuyaDeviceFlow.jsx) 中，点击 `connectBleDevice` 时一并将 `deviceType` 和 `flag` 参数通过桥接通道传递给 Java 插件。
    *   在原生 `HeyboTuyaPlugin.java` 的 `connectBleDevice` 方法中，读取 `deviceType` 和 `flag` 参数，并对 `MultiModeActivatorBean` 赋值：
        *   `bean.mac = address;` (蓝牙 MAC 地址)
        *   `bean.deviceType = deviceType;`
        *   `bean.flag = flag;`
    *   同时，在 `try-catch` 捕获块中，将 `e.printStackTrace` 的输出内容转为 String 拒绝信息（StringWriter），防止再次出现 NPE 时由于 message 为 null 而无法抓取堆栈信息。

## 2026-07-01 修复设备实时状态上报回调失效记录

### 1. 解决设备实时状态上报 (onDpUpdate) 无日志问题
*   **根本原因**：涂鸦 SDK 的设备通信监听器 `IDevListener` 用于接收并分发设备在云端 MQTT 上报的数据。该监听器的后台逻辑高度依赖 Android 的 Handler 消息循环机制。由于 Capacitor 插件方法（`subscribeDevice`）运行在**非 UI 的 background bridge 线程**，在此背景下直接调用 `ThingHomeSdk.newDeviceInstance(devId)` 构造设备实例，会导致其内部的 Handler 线程绑定发生错乱（未能成功绑定到 Android UI 的主 Main Looper），从而阻断了设备状态更新（`onDpUpdate` 和 `onStatusChanged` 等事件）的分发。
*   **解决方案**：
    *   在 [HeyboTuyaPlugin.java](file:///Users/yhl/Antigravity/pet%20chef/frontend/android/app/src/main/java/com/heybopet/petchef/HeyboTuyaPlugin.java) 中，将 `subscribeDevice` 方法内所有的设备实例实例化、`registerDevListener` 监听绑定以及 `unsubscribeDevice` 里的 `unRegisterDevListener`、`onDestroy` 销毁操作，统统包裹在 **`getActivity().runOnUiThread(Runnable)`** 中，强制它们在 Android UI 线程上实例化。
    *   这保证了内部消息循环 Handler 自动在 Android UI 主线程的 Looper 下初始化，MQTT 服务发来的设备数据上报可以正确流转并投递到 `onDpUpdate` 触发 `notifyListeners("dpUpdate", data)` 发送给前端，恢复了 `📥 [DP 上报]` 日志流展示。
*   **构建结果**：
    *   新版 debug APK（B1.00.04）已重新 clean 打包输出至：
        `/Users/yhl/Antigravity/pet chef/frontend/android/app/build/outputs/apk/debug/app-debug.apk`
