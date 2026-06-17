export const primaryUserJourney = {
  id: 'profile-to-health-loop',
  title: '主用户旅程',
  description: '从宠物建档到健康追踪的鲜食喂养闭环。',
  steps: [
    {
      id: 'create-profile',
      title: '建档',
      moduleId: 'pet-profile',
      route: '/pets/new',
      entryCondition: '用户已完成注册或登录。',
      outcome: '生成宠物基础档案，包含品种、年龄、体重和关键健康偏好。',
    },
    {
      id: 'recommend-recipes',
      title: '推荐',
      moduleId: 'recipes',
      route: '/recommendations',
      entryCondition: '宠物档案具备推荐所需的基础字段。',
      outcome: '返回适配当前宠物状态的食谱列表和推荐理由。',
    },
    {
      id: 'purchase-ingredients',
      title: '购买',
      moduleId: 'commerce',
      route: '/shop',
      entryCondition: '用户选定食谱或周期喂养计划。',
      outcome: '生成食材购物清单，并在商城能力可用后衔接下单。',
    },
    {
      id: 'make-fresh-food',
      title: '制作',
      moduleId: 'fresh-food-making',
      route: '/make',
      entryCondition: '用户选择食谱，且设备状态允许制作。',
      outcome: '将食谱参数转化为鲜食机制作流程和设备控制指令。',
    },
    {
      id: 'feeding-feedback',
      title: '喂食反馈',
      moduleId: 'health-tracking',
      route: '/health/logs',
      entryCondition: '一次制作或喂食记录已完成。',
      outcome: '记录宠物食用情况、喜好、排便和异常反馈。',
    },
    {
      id: 'track-health',
      title: '健康追踪',
      moduleId: 'health-tracking',
      route: '/health',
      entryCondition: '存在连续喂食反馈或健康记录。',
      outcome: '形成趋势视图，反向影响后续食谱推荐。',
    },
  ],
};

export default primaryUserJourney;
