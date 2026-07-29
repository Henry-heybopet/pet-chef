# 设备操作日志

## 目的

在涂鸦云 API 无法读取设备空间状态时，由登录后的 App 使用涂鸦 App SDK 执行设备指令，并把指令回执和 DP 完成事件上报到 Heybo 后台。Admin 只读取 Heybo 后台记录，不依赖涂鸦云查询权限。

## 事件模型

一次烹饪使用同一个 `session_id`，每次状态变化使用唯一 `client_event_id`：

| operation_type | status | 记录时机 |
| --- | --- | --- |
| `start_cooking` | `running` / `failed` | SDK 启动指令成功或失败 |
| `pause` | `paused` / `failed` | SDK 暂停指令成功或失败 |
| `resume` | `running` / `failed` | SDK 恢复指令成功或失败 |
| `cancel` | `cancelled` / `failed` | SDK 重置/取消指令成功或失败 |
| `complete` | `completed` | App 收到设备完成 DP |

`client_event_id` 在用户和事件范围内幂等。App 在调用后台前先写入本地 outbox；网络失败时保留，登录状态恢复后重试。后台从认证 Token 确定用户，并验证设备和宠物属于该用户家庭。

“指令成功”仅代表涂鸦 SDK 接受了指令，不代表烹饪完成。只有设备完成 DP 才记录 `complete/completed`。

## 喂食反馈

喂食反馈通过 `session_id` 关联烹饪会话，包括：

- `palatability`：适口性反馈
- `stool_status`：大便状态反馈

反馈也使用 `client_event_id` 防止重复提交。

## API

- App 写入和读取：`POST/GET /api/v1/operations/cooking`
- App 写入反馈：`POST /api/v1/feeding-records`
- Admin 查询：`GET /api/v1/admin/devices/operations`
- Admin 可用 `device_id` 查询参数按设备过滤，`limit` 最大为 1000。

## 已知边界

- App 在烹饪过程中被系统彻底终止时，JavaScript DP 监听不会继续工作；下次进入烹饪页时可以继续补传 outbox，但无法凭倒计时推断设备已经完成。
- 后续如果要求 App 被终止后仍保证完成事件，需要在 Android/iOS 原生层增加后台事件接收和持久化。
- 当前测试服务器沿用单实例 JSON 存储；扩展为多实例服务前，应迁移到正式数据库并以 `client_event_id` 建唯一索引。

## 验收

1. 启动一次烹饪，Admin 显示用户、设备、宠物、食谱和“进行中”。
2. 暂停后显示“已暂停”，恢复后再次显示“进行中”。
3. 长按取消后显示“已取消”。
4. 完整烹饪结束并收到完成 DP 后显示“已完成”。
5. 提交适口性和大便状态后，两项反馈显示在同一会话的启动记录中。
6. 断网执行一次操作，恢复网络后刷新 App 和 Admin，事件只出现一次。
