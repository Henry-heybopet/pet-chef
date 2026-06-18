const serviceRegistry = {
  account_service: {
    description: '用户账号、登录身份、Token 边界和 Heybo 用户生命周期。',
    owns: ['users', 'user_identities'],
    dependsOn: [],
    currentMvpEntrypoints: ['POST /api/heybo/auth/mock-login', 'GET /api/heybo/users/me'],
    futureResponsibilities: ['短信验证码登录', '微信/Apple/Google 登录', '账号注销', '隐私协议确认', 'Token 刷新'],
  },
  household_service: {
    description: '家庭空间、成员权限和家庭级资源归属。',
    owns: ['households'],
    dependsOn: ['account_service'],
    currentMvpEntrypoints: ['POST /api/heybo/households/default'],
    futureResponsibilities: ['家庭成员邀请', '角色权限', '多家庭切换', '地址簿关联'],
  },
  pet_profile_service: {
    description: '宠物基础档案和画像标签。',
    owns: ['pets'],
    dependsOn: ['account_service', 'household_service'],
    currentMvpEntrypoints: ['GET /api/heybo/pets', 'POST /api/heybo/pets', 'PATCH /api/heybo/pets/:id'],
    futureResponsibilities: ['体重历史', '过敏源管理', '多宠物默认选择', '医生建议版本化'],
  },
  device_service: {
    description: '设备绑定、Tuya 设备映射、设备和宠物关系。',
    owns: ['devices'],
    dependsOn: ['account_service', 'household_service', 'pet_profile_service', 'tuya_integration_service'],
    currentMvpEntrypoints: ['GET /api/heybo/devices', 'POST /api/heybo/devices', 'POST /api/heybo/devices/:id/pets'],
    futureResponsibilities: ['设备解绑', '在线状态同步', '固件版本记录', '设备共享权限', 'DP 状态回传落库'],
  },
  recipe_service: {
    description: '食谱库、食谱来源、营养快照和烹饪参数模板。',
    owns: ['recipes', 'recipe_sources'],
    dependsOn: ['pet_profile_service'],
    currentMvpEntrypoints: ['frontend/static recipes', 'backend/src/data/recipes*.js'],
    futureResponsibilities: ['食谱审核', 'AI 生成食谱入库', '营养师版本管理', '种子数据迁移'],
  },
  cooking_operation_service: {
    description: '一键烹饪操作、设备指令快照、状态机和失败记录。',
    owns: ['cooking_operations'],
    dependsOn: ['account_service', 'household_service', 'pet_profile_service', 'device_service', 'recipe_service', 'tuya_integration_service'],
    currentMvpEntrypoints: ['GET /api/heybo/operations/cooking', 'POST /api/heybo/operations/cooking'],
    futureResponsibilities: ['烹饪状态机', 'DP 指令幂等', '模拟设备模式', '失败重试', '完成后生成喂养记录'],
  },
  feeding_service: {
    description: '喂食记录和食谱效果追踪。',
    owns: ['feeding_records'],
    dependsOn: ['account_service', 'household_service', 'pet_profile_service', 'recipe_service', 'cooking_operation_service'],
    currentMvpEntrypoints: ['GET /api/heybo/feeding-records', 'POST /api/heybo/feeding-records'],
    futureResponsibilities: ['餐次计划', '喂食提醒', '剩食反馈', '食欲趋势分析'],
  },
  health_service: {
    description: '日常健康观察，保持非诊断边界。',
    owns: ['health_records'],
    dependsOn: ['account_service', 'household_service', 'pet_profile_service', 'feeding_service'],
    currentMvpEntrypoints: ['GET /api/heybo/health-records', 'POST /api/heybo/health-records'],
    futureResponsibilities: ['14 天观察周期', '体重曲线', '便便/食欲/皮毛评分', '健康标签回写建议'],
  },
  medical_record_service: {
    description: '医疗、体检、疫苗、用药和附件记录。',
    owns: ['medical_records'],
    dependsOn: ['account_service', 'household_service', 'pet_profile_service'],
    currentMvpEntrypoints: ['GET /api/heybo/medical-records', 'POST /api/heybo/medical-records'],
    futureResponsibilities: ['附件对象存储', '宠物医院协作', '复诊提醒', '医疗记录权限隔离'],
  },
  commerce_service: {
    description: '商品/SPU、SKU、价格和库存状态。',
    owns: ['products', 'skus'],
    dependsOn: ['pet_profile_service'],
    currentMvpEntrypoints: ['GET /api/heybo/products'],
    futureResponsibilities: ['商品后台', 'SKU 规格', '库存同步', '按宠物健康标签推荐商品'],
  },
  order_service: {
    description: '订单主流程、订单项和履约状态。',
    owns: ['orders'],
    dependsOn: ['account_service', 'household_service', 'pet_profile_service', 'commerce_service'],
    currentMvpEntrypoints: ['GET /api/heybo/orders', 'POST /api/heybo/orders'],
    futureResponsibilities: ['订单项拆表', '物流履约', '取消/退款', '订阅订单'],
  },
  payment_service: {
    description: '支付流水、支付回调、幂等和对账。',
    owns: ['payments'],
    dependsOn: ['account_service', 'order_service'],
    currentMvpEntrypoints: ['GET /api/payments/providers', 'POST /api/payments', 'GET /api/payments/:id'],
    futureResponsibilities: ['微信 App 支付下单', '支付宝 App 支付下单', '生产回调验签', '退款流水', '日终对账'],
  },
  admin_service: {
    description: '运营后台账号、角色和审核动作。',
    owns: ['admin_users'],
    dependsOn: ['account_service'],
    currentMvpEntrypoints: [],
    futureResponsibilities: ['后台登录', 'RBAC', '食谱审核', '客服工单权限'],
  },
  analytics_service: {
    description: '产品分析和业务事件收集，不承载交易事实。',
    owns: ['analytics_events'],
    dependsOn: ['account_service', 'household_service'],
    currentMvpEntrypoints: [],
    futureResponsibilities: ['事件埋点', '漏斗分析', '设备使用分析', '推荐效果评估'],
  },
  tuya_integration_service: {
    description: 'Tuya SDK/OpenAPI 适配层，不直接拥有核心业务表。',
    owns: [],
    dependsOn: ['account_service', 'device_service'],
    currentMvpEntrypoints: ['backend/src/services/tuya.js'],
    futureResponsibilities: ['Tuya UID 凭证', '配网 token', 'DP 指令封装', '状态回调验签', '错误码标准化'],
  },
};

const dependencyGraph = Object.fromEntries(
  Object.entries(serviceRegistry).map(([name, service]) => [name, service.dependsOn])
);

module.exports = {
  serviceRegistry,
  dependencyGraph,
};
