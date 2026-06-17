# Pet Chef Tuya DP 映射

生成日期：2026-06-17

## 产品信息

```text
PID: ak2kofibhuvdtqip
产品来源: Thermoblend / K15 硬件
当前用途: Heybo Pet / Pet Chef 独立 App 控制宠物鲜食机
```

## 第一阶段控制策略

第一阶段先不接入 Tuya 云菜谱和多步骤菜谱系统，优先使用 `diy` 模式跑通 App 到机器的最小控制闭环：

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

含义：

- `1 power`: 打开设备。
- `3 mode`: 使用 `diy` 模式。
- `7 cook_time`: 烹饪时间，单位秒。
- `9 cook_temperature`: 烹饪温度，第一版默认 85 摄氏度。
- `102 cook_mode_power`: 功率档位，第一版默认 8。
- `108 cook_mode_speed`: 搅拌速度，第一版默认 `1`。
- `107 cook_s_p_r`: 启动/暂停/复位，启动时下发 `start`。

## 核心 DP 点

| DP ID | 标识符 | 名称 | 方向 | 类型 | 第一阶段用途 |
| --- | --- | --- | --- | --- | --- |
| 1 | `power` | 开关 | rw | bool | 开机/关机 |
| 3 | `mode` | 烹饪模式 | rw | enum | 下发 `diy` |
| 5 | `status` | 工作状态 | ro | enum | 监听待机、烹饪中、完成、暂停、加料 |
| 7 | `cook_time` | 烹饪时间 | rw | value | 下发菜谱计算出的总秒数 |
| 8 | `remain_time` | 剩余时间 | ro | value | 烹饪页倒计时 |
| 9 | `cook_temperature` | 烹饪温度 | rw | value | 下发 85 摄氏度等低温烹饪温度 |
| 10 | `temperature` | 实时温度 | ro | value | 展示机器实时温度 |
| 12 | `fault` | 故障告警 | ro | fault | 展示/上报故障 |
| 102 | `cook_mode_power` | 功率 | rw | value | 下发功率档位 |
| 107 | `cook_s_p_r` | 启动/暂停/复位 | rw | enum | 下发 `start` / `pause` / `reset` |
| 108 | `cook_mode_speed` | 速度 | rw | enum | 下发搅拌速度 |

## 暂缓接入的 DP 点

| DP ID | 标识符 | 名称 | 暂缓原因 |
| --- | --- | --- | --- |
| 4 | `cloud_recipe_number` | 云菜谱清单 | 依赖 Tuya 云菜谱后台和云菜谱 ID 体系，第一版先不用 |
| 11 | `multistep` | 多步骤执行 | raw 协议需要工厂提供编码说明，第一版先不用 |
| 103 | `history` | 做过的菜 | 只上报，后续用于历史记录 |
| 105 | `sync` | 同步 | 主要是彩屏页面同步，后续联调 |
| 106 | `auto_sync` | 弹窗同步 | 主要是彩屏/故障弹窗同步，后续联调 |

## 状态枚举

`status`:

- `standby`: 待机中
- `appointment`: 预约中
- `cooking`: 烹饪中
- `done`: 烹饪完成
- `pause`: 烹饪暂停
- `Add_Ingredients`: 加料中

`cook_s_p_r`:

- `start`: 启动
- `pause`: 暂停
- `reset`: 复位

## 和工厂联调时必须确认

1. 多个 DP 是否可以一次性下发，还是必须按顺序分批下发。
2. `cook_s_p_r=start` 是否必须最后下发。
3. `cook_time` 单位是否确认为秒。
4. `cook_temperature=85` 实机是否可以稳定低温控制。
5. `cook_mode_speed` 的 `L` 与 `1-10` 分别对应什么转速。
6. `cook_mode_power=8` 的实际加热功率范围。
7. `fault` 的 `E01/E02/E03/E04/E05/E07/E08/E11` 具体故障含义。
8. 设备配网方式：EZ、AP、蓝牙辅助、扫码中支持哪些。
9. 设备复位/进入配网模式的按键方式。

