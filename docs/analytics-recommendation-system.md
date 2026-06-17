# Heybo Pet 数据分析与推荐系统基础设计

## 目标

本模块建立宠物鲜食业务的数据闭环：从宠物档案、食谱推荐、商城购买、烹饪、喂食反馈、健康变化、设备故障中采集事件，并把健康记录、喂食记录、购买记录转化为推荐信号。短期目标是支持 MVP 的可观测性和推荐解释；长期目标是形成 Heybo Pet 的个体化鲜食推荐壁垒。

## 埋点事件目录

后端事件定义位于 `backend/src/services/analytics_events.js`，前端可调用 stub 位于 `frontend/src/analytics/events.js`。

基础事件：

- `pet_profile_created`：宠物档案创建，记录品种、年龄、体重、活动量、健康标签。
- `pet_profile_updated`：宠物档案更新，记录变更字段和关键体重变化。
- `recipe_recommendation_viewed`：推荐结果曝光，记录候选食谱、请求 ID、算法版本。
- `recipe_recommendation_selected`：用户选择推荐食谱，记录排名、原因标签、算法版本。
- `store_product_viewed`：商城商品曝光，记录商品、分类、目标标签。
- `store_order_created`：商城下单，记录订单、商品列表、金额、来源推荐请求。
- `cooking_started`：开始烹饪，记录设备、食谱、份量、模式和温度。
- `cooking_completed`：烹饪完成或中断，记录耗时、完成状态和中断原因。
- `feeding_recorded`：喂食记录，记录食谱、克数、喂食时间。
- `feeding_feedback_submitted`：喂食反馈，记录食欲、便便、精力、过敏观察。
- `health_record_created`：健康记录，记录体重、体况评分、症状。
- `health_change_detected`：健康变化识别，记录窗口期、指标、方向、置信度。
- `device_fault_reported`：设备故障，记录故障码、等级、是否可恢复。

所有事件建议包含公共字段：`event_id`、`user_id`、`household_id`、`pet_id`、`device_id`、`session_id`、`occurred_at`、`source`。MVP 阶段可先通过 `console.debug` 验证前端事件形态，再接入后端采集接口或第三方分析平台。

## 推荐信号闭环

推荐信号定义位于 `backend/src/services/recommendation_signals.js`，均为纯函数，输入记录数组，输出可解释信号。

健康记录转化：

- 体重趋势：计算最新体重、14 天均重、30 天均重、长期体重变化。
- 体况评分：将 BCS 转为 `under_condition`、`ideal`、`over_condition`。
- 症状标签：腹泻/软便进入 `digestive_support` 和 `digestive_irritant`；关节问题进入 `joint_support`；皮肤瘙痒进入 `skin_coat_support` 和 `possible_allergen`。

喂食记录转化：

- 接受度：14 天食欲评分高，生成 `high_acceptance`。
- 消化反馈：便便评分异常，生成 `stool_watch`。
- 活力反馈：精力评分高，生成 `energy_positive`。
- 食谱偏好：统计高频食谱，用于后续相似食谱和复购推荐。

购买记录转化：

- 商品偏好：统计复购商品、购买品类、商品目标标签。
- 推荐归因：订单保留 `source_recommendation_request_id`，用于衡量推荐到购买的转化。
- 商城联动：将购买目标标签回流到推荐上下文，例如低敏、肠胃、关节、体重控制。

## 14 天、30 天与长期健康效果如何形成推荐壁垒

14 天窗口适合捕捉快速反馈。鲜食调整后的食欲、便便、过敏观察、设备烹饪完成率通常能在两周内体现。系统可以把 14 天喂食反馈用于即时调参：降低可疑过敏源权重，提高高接受度食谱权重，对便便异常的宠物优先推荐温和易消化配方。

30 天窗口适合判断稳定趋势。体重、体况评分、精力变化需要跨越多次喂食和复购周期。系统可以用 30 天均值判断配方是否真正适合该宠物，而不是被单次反馈误导。例如 30 天体重上升且 BCS 偏高时，推荐从高能量配方切换到体重控制；30 天精力评分改善且便便稳定时，提高当前蛋白和食材组合的相似推荐权重。

长期窗口形成个体化壁垒。长期数据连接了宠物生命周期、疾病阶段、季节变化、购买复购和设备烹饪表现。它不只是“某类犬适合什么”，而是“这只宠物在这个家庭、这个设备、这些食材、这些健康变化下适合什么”。当 Heybo Pet 累积足够长的宠物级数据后，推荐模型能建立三类壁垒：

- 个体健康画像：同品种、同体重的宠物，也会因为过敏史、体况、年龄、运动量产生不同推荐。
- 真实结果反馈：推荐不是只看点击，而是看吃完后的食欲、便便、体重、精力和健康变化。
- 设备与食材闭环：烹饪完成率、故障、中断、实际克数和商城复购共同校正推荐，使推荐更贴近真实家庭执行情况。

## 核心指标

- 推荐曝光到选择转化率：`recipe_recommendation_selected / recipe_recommendation_viewed`。
- 推荐到购买转化率：带 `source_recommendation_request_id` 的订单数 / 推荐曝光数。
- 推荐到烹饪转化率：`cooking_started / recipe_recommendation_selected`。
- 烹饪完成率：`cooking_completed.completed = true / cooking_started`。
- 喂食反馈覆盖率：`feeding_feedback_submitted / feeding_recorded`。
- 14 天消化改善率：便便评分从异常区间回到目标区间的宠物占比。
- 30 天体重稳定率：30 天体重波动低于目标阈值的宠物占比。
- 长期健康正反馈率：体况评分、症状频次、精力评分在长期窗口内改善的宠物占比。
- 设备故障影响率：有故障的烹饪流程中断比例，以及故障后的喂食记录缺失比例。

## 主线程集成建议

1. 后端新增采集接口，例如 `POST /api/analytics/events`，调用 `validateEventPayload` 校验后写入数据库或队列。
2. 推荐接口在生成候选食谱前调用 `buildRecommendationSignals`，把 `recommendation_tags` 和 `exclusion_tags` 合并到排序上下文。
3. 创建宠物、更新宠物、创建健康记录、创建喂食记录、创建订单、烹饪操作、设备故障上报时分别发出对应事件。
4. 前端页面在用户动作处调用 `track(ANALYTICS_EVENTS.X, payload)`；MVP 阶段先 console.debug，后续替换为网络上报。
5. 数据库后续可新增 `analytics_events` 表，保留事件原始 payload、公共字段、算法版本和推荐请求 ID，便于回放和模型评估。
