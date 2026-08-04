export const adminRoles = [
  {
    id: 'super_admin',
    name: '超级管理员',
    scope: '全局配置、权限、审计、跨模块运营',
  },
  {
    id: 'ops',
    name: '运营',
    scope: '用户、宠物、商品、订单、内容日常维护',
  },
  {
    id: 'nutrition_editor',
    name: '营养/食谱编辑',
    scope: '食谱资料、适配标签、营养说明审核',
  },
  {
    id: 'medical_reviewer',
    name: '医疗审核员',
    scope: '医疗资料、医生资质、健康相关内容审核',
  },
  {
    id: 'support',
    name: '客服/设备支持',
    scope: '设备绑定状态、订单售后、故障日志跟进',
  },
];

export const adminModules = [
  {
    id: 'users',
    name: '用户管理',
    priority: 'P0',
    ownerRole: 'ops',
    summary: '查看用户账号、注册来源、状态和基础风险标记。',
    firstVersion: ['用户列表占位', '账号状态筛选', '用户详情入口'],
  },
  {
    id: 'pets',
    name: '宠物档案',
    priority: 'P0',
    ownerRole: 'ops',
    summary: '管理宠物基础资料、品种、年龄、体重和食谱推荐上下文。',
    firstVersion: ['宠物资料索引', '异常资料提示', '关联用户入口'],
  },
  {
    id: 'devices',
    name: '设备管理',
    priority: 'P0',
    ownerRole: 'support',
    summary: '查看鲜食机绑定、在线状态、DP 数据摘要和售后排查线索。',
    firstVersion: ['设备列表占位', '绑定状态筛选', '最近一次同步摘要'],
  },
  {
    id: 'recipes',
    name: '食谱管理',
    priority: 'P0',
    ownerRole: 'nutrition_editor',
    summary: '维护食谱库、适用条件、营养声明和设备烹饪参数。',
    firstVersion: ['食谱目录', '优先级标签', '审核状态占位'],
  },
  {
    id: 'nutrition_packs',
    name: '全价营养包管理',
    priority: 'P0',
    ownerRole: 'nutrition_editor',
    summary: '独立维护基础型和功能支持型全价营养包的配比、指标和图片。',
    firstVersion: ['九类营养包目录', '配比与营养指标编辑', '审核状态'],
  },
  {
    id: 'products',
    name: '商品管理',
    priority: 'P1',
    ownerRole: 'ops',
    summary: '管理食材包、耗材、设备 SKU 和上下架状态。',
    firstVersion: ['商品卡片总览', '库存/售卖状态占位', '关联食谱提示'],
  },
  {
    id: 'orders',
    name: '订单管理',
    priority: 'P1',
    ownerRole: 'ops',
    summary: '跟踪订单、支付、履约、售后和异常状态。',
    firstVersion: ['订单状态看板', '异常订单入口', '售后标记占位'],
  },
  {
    id: 'medical-records',
    name: '医疗资料',
    priority: 'P1',
    ownerRole: 'medical_reviewer',
    summary: '承载宠物健康资料、过敏史、医嘱附件和内容可见性控制。',
    firstVersion: ['健康资料索引', '敏感字段标识', '审核状态占位'],
  },
  {
    id: 'doctor-review',
    name: '医生审核',
    priority: 'P1',
    ownerRole: 'medical_reviewer',
    summary: '审核医生资质、专业领域、合作状态和健康内容背书。',
    firstVersion: ['医生申请队列', '资质状态标签', '审核动作占位'],
  },
  {
    id: 'fault-logs',
    name: '故障日志',
    priority: 'P0',
    ownerRole: 'support',
    summary: '汇总设备异常、烹饪失败、配网失败和关键 API 错误。',
    firstVersion: ['故障类型统计', '最近日志列表', '处理状态占位'],
  },
];

export const priorityLabels = {
  P0: '第一版必须具备',
  P1: '第一版占位，随后补齐',
};
