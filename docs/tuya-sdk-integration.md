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
```

Web 环境会返回 `nativeAvailable: false`。

## 下一步

1. 在本机 `frontend/android/tuya.properties` 填入 Android AppSecret。
2. 在 App 增加 Tuya SDK 状态检查入口，调用 `HeyboTuya.status()` / `HeyboTuya.init()`。
3. 实现 Tuya 用户登录/匿名账号映射。
4. 创建 Tuya Home。
5. 获取配网 token。
6. 实现 EZ/AP/蓝牙辅助配网。
7. 获取设备列表和设备状态。
8. 根据 K15/Pet Chef DP 点表下发测试 DP。

## 还需要硬件方确认

- 当前 PID。
- DP 点表。
- 支持的配网方式：EZ、AP、蓝牙辅助、扫码。
- 设备复位/进入配网模式的按键方式。
- 解绑后是否自动进入配网状态。
- 固件是否已经支持 App SDK 配网和 DP 控制。
