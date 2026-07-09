# Pet Chef TuyaDeviceAdapter 设计

更新时间：2026-07-10

## 1. 目标

`TuyaDeviceAdapter` 是 Android 原生层内对 Tuya SDK 的唯一封装入口。它负责 SDK 初始化、权限和环境检查、配网、绑定、解绑、状态读取、DP 下发和状态监听。

它不负责：

- 用户身份认证
- 设备归属判断
- 食谱安全规则
- 烹饪业务状态机
- 数据库写入
- H5 Bridge 暴露设备控制

这些职责属于后端或原生业务页面。

## 2. 当前实现位置

当前 Tuya SDK 代码集中在：

```text
frontend/android/app/src/main/java/com/heybopet/petchef/HeyboTuyaPlugin.java
frontend/src/native/heyboTuya.js
frontend/android/app/build.gradle
```

`HeyboTuyaPlugin.java` 已经直接调用 `ThingHomeSdk`，并包含配网、BLE、DP 下发、设备监听等逻辑。MVP 不需要推倒重写，建议先把这份文件里的 SDK 细节逐步抽到 Adapter。

## 3. 推荐文件结构

```text
frontend/android/app/src/main/java/com/heybopet/petchef/device/
  TuyaDeviceAdapter.java
  TuyaDeviceAdapterCallback.java
  TuyaDeviceState.java
  TuyaPairingState.java
  TuyaPairingResult.java
  TuyaDpPayload.java
  TuyaError.java
  TuyaErrorMapper.java
```

MVP 最小文件集：

```text
TuyaDeviceAdapter.java
TuyaDeviceState.java
TuyaPairingResult.java
TuyaError.java
```

## 4. Adapter 能力清单

初始化：

```text
init(appKey, appSecret)
isInitialized()
getSdkStatus()
```

权限和环境：

```text
checkBluetoothPermission()
checkWifiState()
checkLocationPermission()
checkLocationServiceEnabled()
checkNetworkAvailable()
openBluetoothSettings()
openWifiSettings()
openLocationSettings()
```

配网：

```text
startWifiPairing(homeId, ssid, password, mode, timeout)
startBleScan(timeout)
stopBleScan()
connectBleDevice(homeId, scanDevice, ssid, password)
getPairingProgress()
cancelPairing()
```

绑定：

```text
ensureDefaultHome()
getHomeList()
getDeviceList(homeId)
bindDeviceToHeyboUser(pairingResult)
unbindDevice(devId)
```

状态和 DP：

```text
getDeviceOnlineStatus(devId)
getDeviceDpStatus(devId)
publishDps(devId, dpPayload)
subscribeDevice(devId)
unsubscribeDevice(devId)
```

事件：

```text
onPairingProgress
onPairingSuccess
onPairingFailure
onBleDeviceFound
onDpUpdate
onDeviceOnlineChanged
onDeviceRemoved
onError
```

## 5. 数据模型

`TuyaPairingResult`：

```text
devId
productId
homeId
name
isOnline
rawDps
```

`TuyaDeviceState`：

```text
devId
productId
name
isOnline
dps
updatedAt
```

`TuyaDpPayload`：

```text
dpIdPayload       原始 DP ID，例如 {"107":"start"}
dpCodePayload     后端或日志可读 DP code，例如 {"cook_s_p_r":"start"}
operationId       后端烹饪操作 ID，可选但推荐
```

第一阶段 DIY 烹饪标准 DP：

```json
{
  "1": true,
  "3": "diy",
  "7": 1200,
  "9": 85,
  "102": 8,
  "107": "start",
  "108": "1"
}
```

## 6. 后端配合链路

配网绑定：

```text
Native AddDeviceActivity
  -> TuyaDeviceAdapter.startWifiPairing / connectBleDevice
  -> returns devId/productId/homeId
  -> POST /api/app/devices/bind
  -> backend validates user and household
  -> backend writes devices / device_pet_bindings if needed
  -> Native refreshes MyDevicesActivity
```

烹饪控制：

```text
Native DeviceDetailActivity
  -> POST /api/app/cooking/prepare
  -> backend validates ownership, recipe, pet, safety and device state
  -> backend returns operation_id and approved dp payload
  -> TuyaDeviceAdapter.publishDps(devId, payload)
  -> POST /api/app/cooking/{operation_id}/dispatch-result
  -> subscribe DP updates
  -> POST /api/app/cooking/{operation_id}/status
```

解绑：

```text
Native UnbindDeviceActivity
  -> backend validates ownership and active cooking state
  -> TuyaDeviceAdapter.unbindDevice(devId)
  -> DELETE /api/app/devices/{device_id}
```

## 7. 错误处理

Adapter 应把 Tuya SDK 错误标准化成 App 可展示错误：

```text
SDK_NOT_INITIALIZED
MISSING_TUYA_CREDENTIALS
NETWORK_UNAVAILABLE
BLUETOOTH_PERMISSION_DENIED
BLUETOOTH_DISABLED
LOCATION_PERMISSION_DENIED
LOCATION_SERVICE_DISABLED
WIFI_NOT_2G
PAIRING_TIMEOUT
PAIRING_DEVICE_NOT_FOUND
DEVICE_OFFLINE
DEVICE_REMOVED
DP_PUBLISH_FAILED
TUYA_AUTH_FAILED
UNKNOWN
```

错误对象建议包含：

```text
code
message
tuyaCode
retryable
userAction
safeToRetry
```

不要把 Tuya appSecret、访问 token、完整用户手机号写入日志。

## 8. H5 Bridge 边界

`TuyaDeviceAdapter` 不直接暴露给 H5。H5 只能打开原生页面：

```text
openNativeCookingCenter()
openNativeDeviceDetail(deviceId)
openNativeAddDevice()
```

禁止 H5 调用：

```text
publishDps()
startDiyCooking()
pauseCooking()
resetCooking()
unbindDevice()
```

## 9. MVP 拆分顺序

第一步：

```text
从 HeyboTuyaPlugin.java 抽出 TuyaDeviceAdapter.java
```

第二步：

```text
让 HeyboTuyaPlugin.java 只保留基础 Bridge 和兼容入口
```

第三步：

```text
新增 MyDevicesActivity / DeviceDetailActivity，直接调用 Adapter
```

第四步：

```text
后端补齐 /api/app/cooking/prepare，原生页面只下发后端批准过的 DP
```

## 10. 不做的事

- 不新建复杂多实现接口。
- 不把 Tuya SDK 调用同时散落在 Activity、Plugin、H5。
- 不在 Adapter 写数据库。
- 不在 Adapter 保存长期业务数据。
- 不让 H5 直接下发 DP。
- 不把 appKey、appSecret 写死在 Java 或 JS 代码里。

