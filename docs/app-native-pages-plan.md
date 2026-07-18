# Pet Chef Android 原生页面计划

更新时间：2026-07-10

## 1. 页面边界原则

设备核心原生化，业务内容 H5 化。

原生页面负责稳定性、权限、设备安全和 Tuya SDK 交互；H5 页面负责高频业务内容和推荐展示。

## 2. 原生页面清单

| 页面 | MVP 优先级 | 所属模块 | 说明 |
| --- | --- | --- | --- |
| 系统启动页 | P0 | system | 初始化环境、检查版本、恢复登录态 |
| 登录权限页 | P0 | auth | 未登录时拦截原生设备页面和 H5 |
| 蓝牙 / Wi-Fi / 定位权限页 | P0 | device | 配网前检查权限和系统开关 |
| 我的鲜食机 | P0 | device | 设备列表、在线状态、添加入口 |
| 添加鲜食机 | P0 | device | 选择配网方式、进入 Tuya 配网 |
| Tuya 配网页 | P0 | device | Wi-Fi EZ/AP、BLE 扫描、多模激活 |
| 配网失败引导页 | P0 | device | 展示失败原因和重试动作 |
| 鲜食机详情 | P0 | device | 设备状态、DP 快照、入口控制 |
| 烹饪中心 | P0 | cooking | 选择设备、读取后端批准参数、下发控制 |
| 设备解绑确认页 | P1 | device | 检查 active cooking 后解绑 |
| 网络异常页 | P1 | system | 后端或网络不可用时统一兜底 |
| App 版本更新页 | P1 | system | 强更、建议更新、商店跳转 |

## 3. H5 页面清单

| 页面 | 所属模块 | 说明 |
| --- | --- | --- |
| 宠物档案 | pet | 当前在 `frontend/src/components/PetManagementScreen.jsx` 等 |
| AI 推荐食谱 | recipe/ai | 当前在 `AIAnalysisScreen.jsx`、推荐相关组件 |
| 食谱详情 | recipe | 可继续 H5 展示 |
| 商城 | commerce | 高频业务和营销迭代 |
| 内容页 | content | 文章、活动、教育内容 |
| 用户协议 | legal | 内容更新无需发版 |
| 隐私政策 | legal | 内容更新无需发版 |

## 4. 推荐页面路由

原生路由：

```text
native://splash
native://login
native://permissions/device
native://devices
native://devices/add
native://devices/pairing
native://devices/pairing-failed
native://devices/{device_id}
native://devices/{device_id}/unbind
native://cooking
native://network-error
native://version-update
```

H5 路由：

```text
h5://pets
h5://pets/{pet_id}
h5://ai-recipes
h5://recipes/{recipe_id}
h5://mall
h5://content/{content_id}
h5://legal/user-agreement
h5://legal/privacy-policy
```

## 5. 原生页面职责

### 5.1 我的鲜食机

职责：

- 调后端获取当前用户绑定设备。
- 合并 Tuya SDK 在线状态和后端设备信息。
- 展示设备名、在线状态、当前烹饪状态。
- 提供添加设备、进入详情、解绑入口。

不做：

- 不展示复杂商城或内容推荐。
- 不直接保存设备长期数据。

### 5.2 添加鲜食机

职责：

- 检查登录态。
- 检查蓝牙、定位、Wi-Fi、网络。
- 选择 BLE / Wi-Fi EZ / AP 配网。
- 跳转 Tuya 配网页。

不做：

- 不直接下发烹饪 DP。

### 5.3 Tuya 配网页

职责：

- 调 `TuyaDeviceAdapter` 配网。
- 展示配网进度。
- 成功后拿到 `devId`、`productId`、`homeId`。
- 调后端绑定接口。
- 失败时进入失败引导页。

关键状态：

```text
checking_permissions
scanning
waiting_for_wifi
pairing
binding_backend
success
failed
cancelled
```

### 5.4 鲜食机详情

职责：

- 展示在线状态、DP 当前值、固件/产品信息。
- 订阅设备 DP 状态变化。
- 提供进入烹饪中心、解绑、网络故障引导。

不做：

- 不允许用户手写任意 DP。
- 不绕过后端直接执行业务烹饪。

### 5.5 烹饪中心

职责：

- 选择设备、宠物、食谱。
- 调后端校验设备归属、食谱参数和安全规则。
- 使用后端返回的批准 DP payload 调 `TuyaDeviceAdapter`。
- 上报下发结果和设备状态。
- 展示启动、暂停、继续、停止等状态。

必须处理：

- 设备离线
- 后端校验失败
- Tuya SDK 下发失败
- 下发成功但设备状态未变化
- App 断网或切后台
- 重复点击和重复命令

### 5.6 设备解绑确认页

职责：

- 提醒用户解绑影响。
- 检查是否存在进行中的烹饪。
- 先走后端校验，再调用 Tuya SDK 解绑，再更新后端绑定状态。

## 6. 推荐 Android 文件结构

```text
frontend/android/app/src/main/java/com/heybopet/petchef/
  device/pages/MyDevicesActivity.java
  device/pages/AddDeviceActivity.java
  device/pages/TuyaPairingActivity.java
  device/pages/PairingFailureActivity.java
  device/pages/DeviceDetailActivity.java
  device/pages/UnbindDeviceActivity.java
  cooking/CookingCenterActivity.java
  auth/LoginActivity.java
  system/SplashActivity.java
  system/NetworkErrorActivity.java
  system/VersionUpdateActivity.java
  web/H5ContainerActivity.java
```

MVP 先做：

```text
MyDevicesActivity.java
AddDeviceActivity.java
TuyaPairingActivity.java
DeviceDetailActivity.java
CookingCenterActivity.java
H5ContainerActivity.java
```

## 7. MVP 验收标准

P0 原生链路完成：

1. App 启动后能识别登录态。
2. 我的鲜食机能展示后端绑定设备。
3. 添加设备能完成权限检查。
4. Tuya 配网页能启动配网并拿到设备信息。
5. 配网成功后能调用后端绑定。
6. 鲜食机详情能展示在线状态和 DP。
7. 烹饪中心必须先调后端校验，再下发批准后的 DP。
8. H5 可以打开原生设备页，但不能直接控制设备。

## 8. 不做的事

- 不把所有页面改成原生。
- 不在 MVP 里做复杂动画和多主题系统。
- 不让 H5 直接下发设备命令。
- 不在 Activity 里硬编码服务器地址或 Tuya 密钥。
- 不重构现有 React 前端。
- 不重构现有 Node 后端。

