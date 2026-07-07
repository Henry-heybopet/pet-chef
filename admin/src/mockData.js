// Heybo Pet Admin Console — High Fidelity Mock Data Registry
// Expanded to 10 users, each with 1-6 bound smart devices, realistic allergens (no golden retrievers allergic to chicken & beef simultaneously!), and expanded mall products.

// 1. 区域字典定义
export const REGIONS = [
  { code: 'CN', name: '中国区', currency: 'CNY', symbol: '¥' },
  { code: 'US', name: '美国区', currency: 'USD', symbol: '$' },
  { code: 'EU', name: '欧洲区', currency: 'EUR', symbol: '€' }
];

// 2. 药品与处方规则字典
export const MEDICINE_REGISTRY = [
  { id: 'MED-001', name: '低钠肾脏调和营养片', ingredient: '水解鱼骨粉、泛酸钙、低钠氨基酸', targetDisorder: '慢性肾衰竭 / 肾脏敏感' },
  { id: 'MED-002', name: '肠胃舒缓益生菌复合制剂', ingredient: '枯草芽孢杆菌、水解蛋白粉、低聚果糖', targetDisorder: '胰腺炎恢复期 / 易拉稀肠胃敏感' },
  { id: 'MED-003', name: '深海 Omega-3 美毛浓缩液', ingredient: '冰岛野生鱼油、VE、不饱和脂肪酸', targetDisorder: '中重度泪痕 / 毛发粗糙枯黄' },
  { id: 'MED-004', name: '软骨素关节维骨力粉', ingredient: '氨基葡萄糖、硫酸软骨素、透明质酸', targetDisorder: '髋关节发育不良 / 老年关节退化' }
];

// 3. 用户数据集 (增加到 10 个用户)
// 4. 宠物档案数据集 (包含修正后更真实的金毛过敏原)
// 5. 智能设备分配 (每个用户分配至少 1 台，最多 6 台智能设备，共 27 台设备以保证符合真实要求)
export const mockDevices = [
  // User 1 (何明轩) - 4 Devices
  {
    id: 'DEV-SN-00921',
    tuya_device_id: 'tuyadevice_chef_cn01',
    tuya_pid: 'pid_chef_8812',
    product_type: 'pet_chef',
    device_name: 'HB 鲜食智能大师 (主客厅)',
    status: 'active',
    firmware_version: 'v3.2.14',
    last_online_at: '2026-06-22T11:45:00Z',
    bound_at: '2025-01-16T12:30:00Z',
    owner_user_id: 'USR-88901',
    region: 'CN',
    telemetry: { online: true, current_temp: '85.4°C', motor_speed: '280 RPM', water_tank_level: '82%', scale_weight: '320.5g', error_code: '0 (正常)' }
  },
  {
    id: 'DEV-SN-00922',
    tuya_device_id: 'tuyadevice_feeder_cn01',
    tuya_pid: 'pid_feeder_5521',
    product_type: 'smart_feeder',
    device_name: 'HB 极速配粮机 (卧房)',
    status: 'active',
    firmware_version: 'v2.0.1',
    last_online_at: '2026-06-22T11:48:00Z',
    bound_at: '2025-01-18T10:00:00Z',
    owner_user_id: 'USR-88901',
    region: 'CN',
    telemetry: { online: true, food_tank_level: '68%', last_dispense_grams: '120g', dispense_success_today: 4, battery_backup: '100%', error_code: '0' }
  },
  {
    id: 'DEV-SN-00923',
    tuya_device_id: 'tuyadevice_fountain_cn01',
    tuya_pid: 'pid_fountain_3321',
    product_type: 'smart_water_fountain',
    device_name: 'HB 感应恒温净水泉 (书房)',
    status: 'active',
    firmware_version: 'v1.2.0',
    last_online_at: '2026-06-22T11:30:00Z',
    bound_at: '2025-01-20T14:00:00Z',
    owner_user_id: 'USR-88901',
    region: 'CN',
    telemetry: { online: true, water_temp: '20.5°C', filter_life_pct: '85%', water_tds: '25 (纯净)', error_code: '0' }
  },
  {
    id: 'DEV-SN-00924',
    tuya_device_id: 'tuyadevice_tracker_cn01',
    tuya_pid: 'pid_tracker_1101',
    product_type: 'smart_tracker',
    device_name: 'HB 防丢防丢定位牌 (麦芬专属)',
    status: 'active',
    firmware_version: 'v4.1.2',
    last_online_at: '2026-06-22T11:51:00Z',
    bound_at: '2025-01-22T15:00:00Z',
    owner_user_id: 'USR-88901',
    region: 'CN',
    telemetry: { online: true, battery_pct: '92%', gps_lat_lng: '31.2304° N, 121.4737° E (上海张江园区)', geofence_status: '安全区域内', step_count_today: 12405, error_code: '0' }
  },

  // User 2 (李美莉) - 1 Device
  {
    id: 'DEV-SN-00561',
    tuya_device_id: 'tuyadevice_litter_cn02',
    tuya_pid: 'pid_litter_9901',
    product_type: 'smart_litter_box',
    device_name: 'HB 智能太空舱猫砂盆 (卫生间)',
    status: 'active',
    firmware_version: 'v1.4.2',
    last_online_at: '2026-06-22T11:49:00Z',
    bound_at: '2025-03-21T03:10:00Z',
    owner_user_id: 'USR-88902',
    region: 'CN',
    telemetry: { online: true, pet_weight: '4.82kg (布偶猫团团)', last_usage_duration: '2分45秒', usage_count_today: 4, deodorizer_status: '良 (75%)', chamber_position: '复位 (0°)', error_code: '0' }
  },

  // User 3 (赵铁柱) - 2 Devices
  {
    id: 'DEV-SN-00931',
    tuya_device_id: 'tuyadevice_chef_cn03',
    tuya_pid: 'pid_chef_8812',
    product_type: 'pet_chef',
    device_name: 'HB 鲜食厨神宝 (厨房)',
    status: 'active',
    firmware_version: 'v3.2.14',
    last_online_at: '2026-06-22T11:00:00Z',
    bound_at: '2025-04-12T13:00:00Z',
    owner_user_id: 'USR-88903',
    region: 'CN',
    telemetry: { online: true, current_temp: '24.1°C', motor_speed: '0 RPM', water_tank_level: '95%', scale_weight: '0.0g', error_code: '0' }
  },
  {
    id: 'DEV-SN-00932',
    tuya_device_id: 'tuyadevice_fountain_cn03',
    tuya_pid: 'pid_fountain_3321',
    product_type: 'smart_water_fountain',
    device_name: 'HB 瀑布流智能水机',
    status: 'active',
    firmware_version: 'v1.2.0',
    last_online_at: '2026-06-22T10:15:00Z',
    bound_at: '2025-04-15T15:00:00Z',
    owner_user_id: 'USR-88903',
    region: 'CN',
    telemetry: { online: true, water_temp: '22.1°C', filter_life_pct: '64%', water_tds: '42 (优秀)', error_code: '0' }
  },

  // User 4 (张华) - 6 Devices (最多绑定 6 台设备)
  {
    id: 'DEV-SN-00941',
    tuya_device_id: 'tuyadevice_chef_cn04a',
    tuya_pid: 'pid_chef_8812',
    product_type: 'pet_chef',
    device_name: 'HB 厨房一号鲜食机',
    status: 'active',
    firmware_version: 'v3.2.14',
    last_online_at: '2026-06-22T11:42:00Z',
    bound_at: '2025-05-02T17:00:00Z',
    owner_user_id: 'USR-88904',
    region: 'CN',
    telemetry: { online: true, current_temp: '82.0°C', motor_speed: '120 RPM', water_tank_level: '45%', scale_weight: '250.0g', error_code: '0' }
  },
  {
    id: 'DEV-SN-00942',
    tuya_device_id: 'tuyadevice_chef_cn04b',
    tuya_pid: 'pid_chef_8812',
    product_type: 'pet_chef',
    device_name: 'HB 露台二号鲜食机',
    status: 'active',
    firmware_version: 'v3.2.14',
    last_online_at: '2026-06-22T11:40:00Z',
    bound_at: '2025-05-02T17:30:00Z',
    owner_user_id: 'USR-88904',
    region: 'CN',
    telemetry: { online: true, current_temp: '18.2°C', motor_speed: '0 RPM', water_tank_level: '99%', scale_weight: '0.0g', error_code: '0' }
  },
  {
    id: 'DEV-SN-00943',
    tuya_device_id: 'tuyadevice_litter_cn04',
    tuya_pid: 'pid_litter_9901',
    product_type: 'smart_litter_box',
    device_name: 'HB 太空净菌猫厕所',
    status: 'active',
    firmware_version: 'v1.4.2',
    last_online_at: '2026-06-22T11:45:00Z',
    bound_at: '2025-05-03T10:00:00Z',
    owner_user_id: 'USR-88904',
    region: 'CN',
    telemetry: { online: true, pet_weight: '10.2kg (柴犬进去捣乱了)', last_usage_duration: '45秒', usage_count_today: 1, deodorizer_status: '中 (35%)', chamber_position: '正常', error_code: '0' }
  },
  {
    id: 'DEV-SN-00944',
    tuya_device_id: 'tuyadevice_feeder_cn04',
    tuya_pid: 'pid_feeder_5521',
    product_type: 'smart_feeder',
    device_name: 'HB 柴犬抗暴防爆喂食机',
    status: 'active',
    firmware_version: 'v2.0.1',
    last_online_at: '2026-06-22T11:47:00Z',
    bound_at: '2025-05-04T12:00:00Z',
    owner_user_id: 'USR-88904',
    region: 'CN',
    telemetry: { online: true, food_tank_level: '85%', last_dispense_grams: '80g', dispense_success_today: 3, battery_backup: '100%', error_code: '0' }
  },
  {
    id: 'DEV-SN-00945',
    tuya_device_id: 'tuyadevice_fountain_cn04',
    tuya_pid: 'pid_fountain_3321',
    product_type: 'smart_water_fountain',
    device_name: 'HB 紫外线杀菌水泉',
    status: 'active',
    firmware_version: 'v1.2.0',
    last_online_at: '2026-06-22T11:35:00Z',
    bound_at: '2025-05-05T14:00:00Z',
    owner_user_id: 'USR-88904',
    region: 'CN',
    telemetry: { online: true, water_temp: '22.0°C', filter_life_pct: '92%', water_tds: '28 (优秀)', error_code: '0' }
  },
  {
    id: 'DEV-SN-00946',
    tuya_device_id: 'tuyadevice_tracker_cn04',
    tuya_pid: 'pid_tracker_1101',
    product_type: 'smart_tracker',
    device_name: 'HB 柴犬定位防跑丢芯片',
    status: 'active',
    firmware_version: 'v4.1.2',
    last_online_at: '2026-06-22T11:52:00Z',
    bound_at: '2025-05-06T15:00:00Z',
    owner_user_id: 'USR-88904',
    region: 'CN',
    telemetry: { online: true, battery_pct: '76%', gps_lat_lng: '23.1291° N, 113.2644° E (广州市花城广场)', geofence_status: '安全围栏内', step_count_today: 18451, error_code: '0' }
  },

  // User 5 (David Miller) - 3 Devices
  {
    id: 'DEV-SN-00412',
    tuya_device_id: 'tuyadevice_feeder_us01',
    tuya_pid: 'pid_feeder_7733',
    product_type: 'smart_feeder',
    device_name: 'HB Smart Feeder (Living Room)',
    status: 'active',
    firmware_version: 'v2.1.0',
    last_online_at: '2026-06-22T10:30:00Z',
    bound_at: '2025-02-11T10:00:00Z',
    owner_user_id: 'USR-77301',
    region: 'US',
    telemetry: { online: true, food_tank_level: '25% (Low)', last_dispense_grams: '60g', dispense_success_today: 3, is_jammed: false, battery_backup: '100%', error_code: '0' }
  },
  {
    id: 'DEV-SN-00339',
    tuya_device_id: 'tuyadevice_fountain_us02',
    tuya_pid: 'pid_fountain_1204',
    product_type: 'smart_water_fountain',
    device_name: 'HB Smart Pure Fountain',
    status: 'offline',
    firmware_version: 'v1.0.8',
    last_online_at: '2026-06-22T02:15:00Z',
    bound_at: '2025-02-15T11:40:00Z',
    owner_user_id: 'USR-77301',
    region: 'US',
    telemetry: { online: false, water_temp: '22.0°C', filter_life_pct: '48%', pump_dry_protection: true, water_tds: '95', error_code: 'E09 (Low Water Alert)' }
  },
  {
    id: 'DEV-SN-00413',
    tuya_device_id: 'tuyadevice_chef_us01',
    tuya_pid: 'pid_chef_8812',
    product_type: 'pet_chef',
    device_name: 'HB Fresh Chef Master US',
    status: 'active',
    firmware_version: 'v3.2.14',
    last_online_at: '2026-06-22T10:45:00Z',
    bound_at: '2025-02-18T12:00:00Z',
    owner_user_id: 'USR-77301',
    region: 'US',
    telemetry: { online: true, current_temp: '22.0°C', motor_speed: '0 RPM', water_tank_level: '90%', scale_weight: '0.0g', error_code: '0' }
  },

  // User 6 (Emma Watson) - 1 Device
  {
    id: 'DEV-SN-00421',
    tuya_device_id: 'tuyadevice_tracker_us02',
    tuya_pid: 'pid_tracker_1101',
    product_type: 'smart_tracker',
    device_name: 'Bella Anti-Lost Collar Tracker',
    status: 'active',
    firmware_version: 'v4.1.2',
    last_online_at: '2026-06-22T08:00:00Z',
    bound_at: '2025-05-20T11:00:00Z',
    owner_user_id: 'USR-77302',
    region: 'US',
    telemetry: { online: true, battery_pct: '85%', gps_lat_lng: '40.7128° N, 74.0060° W (Manhattan, NY)', geofence_status: 'Safe Safe Zone', step_count_today: 10452, error_code: '0' }
  },

  // User 7 (John Smith) - 2 Devices
  {
    id: 'DEV-SN-00431',
    tuya_device_id: 'tuyadevice_chef_us03',
    tuya_pid: 'pid_chef_8812',
    product_type: 'pet_chef',
    device_name: 'John Cook Station',
    status: 'active',
    firmware_version: 'v3.2.14',
    last_online_at: '2026-06-22T11:15:00Z',
    bound_at: '2025-07-05T11:00:00Z',
    owner_user_id: 'USR-77303',
    region: 'US',
    telemetry: { online: true, current_temp: '25.0°C', motor_speed: '0 RPM', water_tank_level: '95%', scale_weight: '0.0g', error_code: '0' }
  },
  {
    id: 'DEV-SN-00432',
    tuya_device_id: 'tuyadevice_feeder_us03',
    tuya_pid: 'pid_feeder_7733',
    product_type: 'smart_feeder',
    device_name: 'Coco Smart Food Butler',
    status: 'active',
    firmware_version: 'v2.1.0',
    last_online_at: '2026-06-22T10:45:00Z',
    bound_at: '2025-07-06T12:00:00Z',
    owner_user_id: 'USR-77303',
    region: 'US',
    telemetry: { online: true, food_tank_level: '75%', last_dispense_grams: '45g', dispense_success_today: 2, is_jammed: false, battery_backup: '100%', error_code: '0' }
  },

  // User 8 (François Dupont) - 5 Devices
  {
    id: 'DEV-SN-00108',
    tuya_device_id: 'tuyadevice_tracker_eu01',
    tuya_pid: 'pid_tracker_4401',
    product_type: 'smart_tracker',
    device_name: 'Charly GPS Tracker (Paris)',
    status: 'active',
    firmware_version: 'v4.0.2',
    last_online_at: '2026-06-22T11:50:00Z',
    bound_at: '2025-01-23T15:00:00Z',
    owner_user_id: 'USR-66201',
    region: 'EU',
    telemetry: { online: true, battery_pct: '88%', gps_lat_lng: '48.8584° N, 2.2945° E (Paris Eiffel Tower)', geofence_status: 'Inside Geofence', step_count_today: 14205, error_code: '0' }
  },
  {
    id: 'DEV-SN-00109',
    tuya_device_id: 'tuyadevice_chef_eu01',
    tuya_pid: 'pid_chef_8812',
    product_type: 'pet_chef',
    device_name: 'HB Cook Pro Paris',
    status: 'active',
    firmware_version: 'v3.2.14',
    last_online_at: '2026-06-22T11:30:00Z',
    bound_at: '2025-01-24T10:00:00Z',
    owner_user_id: 'USR-66201',
    region: 'EU',
    telemetry: { online: true, current_temp: '22.0°C', motor_speed: '0 RPM', water_tank_level: '99%', scale_weight: '0.0g', error_code: '0' }
  },
  {
    id: 'DEV-SN-00110',
    tuya_device_id: 'tuyadevice_litter_eu01',
    tuya_pid: 'pid_litter_9901',
    product_type: 'smart_litter_box',
    device_name: 'HB Eco Litter Hub Paris',
    status: 'active',
    firmware_version: 'v1.4.2',
    last_online_at: '2026-06-22T11:15:00Z',
    bound_at: '2025-01-25T11:00:00Z',
    owner_user_id: 'USR-66201',
    region: 'EU',
    telemetry: { online: true, pet_weight: '19.2kg (Border Collie Charly)', last_usage_duration: '1分20秒', usage_count_today: 2, deodorizer_status: '良 (80%)', chamber_position: '正常', error_code: '0' }
  },
  {
    id: 'DEV-SN-00111',
    tuya_device_id: 'tuyadevice_feeder_eu01',
    tuya_pid: 'pid_feeder_7733',
    product_type: 'smart_feeder',
    device_name: 'HB Dry Kibble Dispenser EU',
    status: 'active',
    firmware_version: 'v2.1.0',
    last_online_at: '2026-06-22T11:35:00Z',
    bound_at: '2025-01-26T12:00:00Z',
    owner_user_id: 'USR-66201',
    region: 'EU',
    telemetry: { online: true, food_tank_level: '88%', last_dispense_grams: '100g', dispense_success_today: 3, is_jammed: false, battery_backup: '100%', error_code: '0' }
  },
  {
    id: 'DEV-SN-00112',
    tuya_device_id: 'tuyadevice_fountain_eu01',
    tuya_pid: 'pid_fountain_1204',
    product_type: 'smart_water_fountain',
    device_name: 'HB Wellness Water Fountain',
    status: 'active',
    firmware_version: 'v1.0.8',
    last_online_at: '2026-06-22T11:40:00Z',
    bound_at: '2025-01-27T14:00:00Z',
    owner_user_id: 'USR-66201',
    region: 'EU',
    telemetry: { online: true, water_temp: '18.5°C', filter_life_pct: '92%', water_tds: '35', error_code: '0' }
  },

  // User 9 (Hans Mueller) - 1 Device
  {
    id: 'DEV-SN-00121',
    tuya_device_id: 'tuyadevice_fountain_eu02',
    tuya_pid: 'pid_fountain_1204',
    product_type: 'smart_water_fountain',
    device_name: 'HB Sense Fountain Berlin',
    status: 'active',
    firmware_version: 'v1.0.8',
    last_online_at: '2026-06-22T11:42:00Z',
    bound_at: '2025-04-16T12:00:00Z',
    owner_user_id: 'USR-66202',
    region: 'EU',
    telemetry: { online: true, water_temp: '17.2°C', filter_life_pct: '76%', water_tds: '48', error_code: '0' }
  },

  // User 10 (Sophia Loren) - 2 Devices
  {
    id: 'DEV-SN-00131',
    tuya_device_id: 'tuyadevice_chef_eu03',
    tuya_pid: 'pid_chef_8812',
    product_type: 'pet_chef',
    device_name: 'HB Smart Chef Rome',
    status: 'active',
    firmware_version: 'v3.2.14',
    last_online_at: '2026-06-22T11:10:00Z',
    bound_at: '2025-06-02T15:00:00Z',
    owner_user_id: 'USR-66203',
    region: 'EU',
    telemetry: { online: true, current_temp: '22.0°C', motor_speed: '0 RPM', water_tank_level: '92%', scale_weight: '0.0g', error_code: '0' }
  },
  {
    id: 'DEV-SN-00132',
    tuya_device_id: 'tuyadevice_tracker_eu03',
    tuya_pid: 'pid_tracker_4401',
    product_type: 'smart_tracker',
    device_name: 'Rotti GPS Guard (Rome)',
    status: 'active',
    firmware_version: 'v4.0.2',
    last_online_at: '2026-06-22T11:51:00Z',
    bound_at: '2025-06-03T16:00:00Z',
    owner_user_id: 'USR-66203',
    region: 'EU',
    telemetry: { online: true, battery_pct: '95%', gps_lat_lng: '41.9028° N, 12.4964° E (Coliseum, Rome)', geofence_status: 'Safe', step_count_today: 15409, error_code: '0' }
  }
];

// 6. 食谱配方数据集
export const mockRecipes = [
  {
    id: 'REC-001',
    name: '养胃舒缓鲜鸭肉羹',
    species: 'dog',
    category: '处方调理型',
    life_stage: '成年犬',
    status: 'active',
    requires_vet_approval: true,
    health_tags: ['低敏调理', '肠胃敏感', '改善泪痕'],
    ingredients: { '去骨鲜鸭肉': '62%', '燕麦碎': '18%', '蒸南瓜': '10%', '蓝莓果肉': '4%', '鲜胡萝卜': '4%', '复合微量营养素': '2%' },
    nutrition_snapshot: { protein: '15.8%', fat: '5.2%', fiber: '1.8%', moisture: '72.0%', caloric_density: '115 kcal/100g' },
    cooking_profile: {
      water_add_ml: '每100g食材添加 120ml 水',
      stages: [
        { name: '低温预热/加水搅拌', temp: '55°C', duration: '90秒', speed: '200 RPM' },
        { name: '高温文火焖煮', temp: '85°C', duration: '360秒', speed: '120 RPM' },
        { name: '高速均质打碎', temp: '75°C', duration: '60秒', speed: '450 RPM' }
      ]
    },
    prescribed_medicine: 'MED-002 (肠胃舒缓益生菌复合制剂)'
  },
  {
    id: 'REC-002',
    name: '低脂多能火鸡肉配方',
    species: 'cat',
    category: '全价成年期',
    life_stage: '成年猫',
    status: 'active',
    requires_vet_approval: false,
    health_tags: ['体重控制', '美毛美肤'],
    ingredients: { '新鲜火鸡肉': '75%', '蒸红薯粉': '12%', '西兰花泥': '6%', '三文鱼油': '4%', '牛磺酸营养添加': '3%' },
    nutrition_snapshot: { protein: '18.5%', fat: '3.8%', fiber: '1.2%', moisture: '74.5%', caloric_density: '98 kcal/100g' },
    cooking_profile: {
      water_add_ml: '每100g食材添加 80ml 水',
      stages: [
        { name: '中温焖煮', temp: '75°C', duration: '300秒', speed: '150 RPM' },
        { name: '高速打碎', temp: '70°C', duration: '90秒', speed: '400 RPM' }
      ]
    },
    prescribed_medicine: '无'
  },
  {
    id: 'REC-003',
    name: '肾脏关怀低钠牛肉泥',
    species: 'dog',
    category: '处方调理型',
    life_stage: '成年犬',
    status: 'active',
    requires_vet_approval: true,
    health_tags: ['肾脏敏感', '低磷低钠'],
    ingredients: { '精瘦牛肉': '50%', '白米粥底': '28%', '山药泥': '12%', '蛋白粉粉': '5%', '蛋黄碎': '3%', '低磷复合素': '2%' },
    nutrition_snapshot: { protein: '11.2%', fat: '4.5%', fiber: '0.8%', moisture: '78.0%', caloric_density: '88 kcal/100g' },
    cooking_profile: {
      water_add_ml: '每100g食材添加 150ml 水',
      stages: [
        { name: '高速混合', temp: '45°C', duration: '120秒', speed: '300 RPM' },
        { name: '长时慢熬', temp: '88°C', duration: '480秒', speed: '80 RPM' }
      ]
    },
    prescribed_medicine: 'MED-001 (低钠肾脏调和营养片)'
  }
];

// 7. 商品与食材包数据集 (商城数据已丰富增加，各区有更多 SKU)
export const mockProducts = [
  // CN Region Products
  {
    id: 'PRD-MOCK-CN-001',
    name: '【养胃专用】鸭肉南瓜膳食包 (CN区)',
    category: '鲜食料包',
    description: '采用高品质生态鸭胸肉，合理配比南瓜，专门针对麸质与大豆敏感性犬只调理，显著改善因过敏原引起的泪痕。',
    target_tags: ['改善泪痕', '低敏养胃'],
    status: 'active',
    allergen_ingredients: ['鸭肉', '南瓜'],
    skus: [
      { id: 'SKU-CN-1001', sku_code: '6971204990112', spec: '300g * 7包/周套餐', price_cents: 16800, currency: 'CNY', stock_status: 'in_stock' }
    ],
    traceability: {
      batch_no: 'BATCH-20260510-A',
      raw_material_origin: '山东微山湖生态鸭养殖示范区, 海南五指山有机农场',
      factory_location: '上海张江一号鲜食超级工坊',
      manufactured_at: '2026-05-10T02:00:00Z',
      listed_at: '2026-05-12T08:30:00Z',
      shipped_at: '2026-06-15T10:00:00Z',
      received_at: '2026-06-17T09:12:00Z',
      consumed_at: '2026-06-22T11:45:00Z',
      expired_at: '2026-06-09T00:00:00Z', // 演示已过期
      is_expired: true,
      device_lock_active: true
    }
  },
  {
    id: 'PRD-MOCK-CN-002',
    name: '【幼犬成长】高能火鸡胸肉鲜食 (CN区)',
    category: '鲜食料包',
    description: '单一低敏蛋白火鸡肉，额外复配软骨素，强化犬只发育关节力量。',
    target_tags: ['高蛋白', '促骨骼'],
    status: 'active',
    allergen_ingredients: ['火鸡肉'],
    skus: [
      { id: 'SKU-CN-1002', sku_code: '6971204990129', spec: '250g * 14包周期套餐', price_cents: 29800, currency: 'CNY', stock_status: 'in_stock' }
    ],
    traceability: {
      batch_no: 'BATCH-20260601-B',
      raw_material_origin: '黑龙江佳木斯无害化火鸡示范牧场',
      factory_location: '北京大兴洁净鲜食二号仓',
      manufactured_at: '2026-06-01T04:00:00Z',
      listed_at: '2026-06-03T09:00:00Z',
      shipped_at: '2026-06-20T11:00:00Z',
      received_at: '2026-06-22T08:00:00Z',
      consumed_at: null,
      expired_at: '2026-07-01T00:00:00Z',
      is_expired: false,
      device_lock_active: false
    }
  },
  {
    id: 'PRD-MOCK-CN-003',
    name: '【深海三文鱼】冰川亮毛低敏感膳食包 (CN区)',
    category: '鲜食料包',
    description: '源自智利进口冰川三文鱼，富含纯净 Omega-3 不饱和脂肪酸，给狗狗皮肤提供抗炎营养，还原丰盈毛色。',
    target_tags: ['美毛护肤', '低敏保护'],
    status: 'active',
    allergen_ingredients: ['三文鱼'],
    skus: [
      { id: 'SKU-CN-1003', sku_code: '6971204990136', spec: '200g * 10包周期套餐', price_cents: 24000, currency: 'CNY', stock_status: 'in_stock' }
    ],
    traceability: {
      batch_no: 'BATCH-20260610-C',
      raw_material_origin: '智利南部深海无污染三文鱼养殖基地',
      factory_location: '上海张江一号鲜食超级工坊',
      manufactured_at: '2026-06-10T08:00:00Z',
      listed_at: '2026-06-12T11:00:00Z',
      shipped_at: '2026-06-19T14:00:00Z',
      received_at: '2026-06-22T10:00:00Z',
      consumed_at: null,
      expired_at: '2026-07-10T00:00:00Z',
      is_expired: false,
      device_lock_active: false
    }
  },
  {
    id: 'PRD-MOCK-CN-004',
    name: '鲜食机自动保养除垢清洗片',
    category: '辅料耗材',
    description: '食品级柠檬酸弱酸复合片，能有效清洗出水管道，防止水垢造成水流量计阻塞报错。',
    target_tags: ['机器除垢', '管道保养'],
    status: 'active',
    allergen_ingredients: [],
    skus: [
      { id: 'SKU-CN-2001', sku_code: '6971204990204', spec: '20片家庭保养盒装', price_cents: 3900, currency: 'CNY', stock_status: 'in_stock' }
    ]
  },

  // US Region Products
  {
    id: 'PRD-MOCK-US-001',
    name: 'Turkey Low-Fat Meal Kit (US区)',
    category: '鲜食料包',
    description: 'Hypoallergenic turkey meat cooked low and slow for sensitive stomach.',
    target_tags: ['Weight Control', 'Low fat'],
    status: 'active',
    allergen_ingredients: ['Turkey'],
    skus: [
      { id: 'SKU-US-1001', sku_code: '071204990119', spec: '350g * 10 packs', price_cents: 5900, currency: 'USD', stock_status: 'in_stock' }
    ],
    traceability: {
      batch_no: 'BATCH-US-20260520',
      raw_material_origin: 'Iowa Turkey Farm, Oregon Potato Cooperatives',
      factory_location: 'Denver Processing Hub',
      manufactured_at: '2026-05-20T08:00:00Z',
      listed_at: '2026-05-22T10:00:00Z',
      shipped_at: '2026-06-18T14:00:00Z',
      received_at: '2026-06-21T10:30:00Z',
      consumed_at: null,
      expired_at: '2026-06-20T00:00:00Z', // 演示已过期
      is_expired: true,
      device_lock_active: true
    }
  },
  {
    id: 'PRD-MOCK-US-002',
    name: 'Salmon Coat & Skin Glow Pack (US区)',
    category: '鲜食料包',
    description: 'Wild caught Alaskan salmon recipe enriched with Omega-3 oils.',
    target_tags: ['Shining Coat', 'Hypoallergenic'],
    status: 'active',
    allergen_ingredients: ['Salmon'],
    skus: [
      { id: 'SKU-US-1002', sku_code: '071204990126', spec: '300g * 10 packs', price_cents: 6900, currency: 'USD', stock_status: 'in_stock' }
    ],
    traceability: {
      batch_no: 'BATCH-US-20260605',
      raw_material_origin: 'Alaska Gulf Wild Salmon Fleet',
      factory_location: 'Seattle Eco-Chef Plant',
      manufactured_at: '2026-06-05T06:00:00Z',
      listed_at: '2026-06-07T08:00:00Z',
      shipped_at: '2026-06-20T11:00:00Z',
      received_at: '2026-06-22T09:00:00Z',
      consumed_at: null,
      expired_at: '2026-07-05T00:00:00Z',
      is_expired: false,
      device_lock_active: false
    }
  },

  // EU Region Products
  {
    id: 'PRD-MOCK-EU-001',
    name: 'Hypoallergenic Rabbit Recipe (EU区)',
    category: '鲜食料包',
    description: 'High-digestion novel protein rabbit meat recipe for super allergic dogs.',
    target_tags: ['Ultra Sensitive', 'Novel Protein'],
    status: 'active',
    allergen_ingredients: ['Rabbit'],
    skus: [
      { id: 'SKU-EU-1001', sku_code: '371204990111', spec: '280g * 12 packs', price_cents: 5400, currency: 'EUR', stock_status: 'in_stock' }
    ],
    traceability: {
      batch_no: 'BATCH-EU-20260610',
      raw_material_origin: 'Normandy Rabbit Breeding Station',
      factory_location: 'Le Havre Agri-Food Fab',
      manufactured_at: '2026-06-10T02:00:00Z',
      listed_at: '2026-06-12T09:00:00Z',
      shipped_at: '2026-06-19T15:00:00Z',
      received_at: '2026-06-22T10:00:00Z',
      consumed_at: null,
      expired_at: '2026-07-10T00:00:00Z',
      is_expired: false,
      device_lock_active: false
    }
  }
];

// 8. 订单及网关流水数据集 (适配增加的用户)
export const mockOrders = [
  // CN Region Orders
  {
    id: 'ORD-20260622-0091',
    user_id: 'USR-88901',
    region: 'CN',
    status: 'paid',
    total_cents: 16800,
    currency: 'CNY',
    payment_status: 'success',
    shipping_address: { receiver: '何明轩', phone: '13816908888', detail: '上海市浦东新区张江路 88 弄 12 号楼 602 室' },
    created_at: '2026-06-15T09:45:00Z',
    items: [{ product_id: 'PRD-MOCK-CN-001', product_name: '【养胃专用】鸭肉南瓜鲜食包', quantity: 1, unit_price_cents: 16800 }],
    payment: { provider: 'wechat', provider_payment_id: 'WX-REF-20260615110298377', paid_at: '2026-06-15T10:00:00Z' }
  },
  {
    id: 'ORD-20260622-0092',
    user_id: 'USR-88902',
    region: 'CN',
    status: 'shipped',
    total_cents: 29800,
    currency: 'CNY',
    payment_status: 'success',
    shipping_address: { receiver: '李美莉', phone: '13917892233', detail: '北京市朝阳区建国路 99 号院 3号楼 1002 室' },
    created_at: '2026-06-20T10:30:00Z',
    items: [{ product_id: 'PRD-MOCK-CN-002', product_name: '【幼犬成长】极鲜火鸡胸肉配方', quantity: 1, unit_price_cents: 29800 }],
    payment: { provider: 'alipay', provider_payment_id: 'ALI-PAY-2026062099301099238', paid_at: '2026-06-20T11:00:00Z' }
  },
  {
    id: 'ORD-20260622-0094',
    user_id: 'USR-88904',
    region: 'CN',
    status: 'paid',
    total_cents: 24000,
    currency: 'CNY',
    payment_status: 'success',
    shipping_address: { receiver: '张华', phone: '13799881122', detail: '广州市天河区珠江新城花城大道 33 号' },
    created_at: '2026-06-19T08:00:00Z',
    items: [{ product_id: 'PRD-MOCK-CN-003', product_name: '【深海三文鱼】冰川亮毛膳食包', quantity: 1, unit_price_cents: 24000 }],
    payment: { provider: 'wechat', provider_payment_id: 'WX-REF-20260619220910283', paid_at: '2026-06-19T08:15:00Z' }
  },

  // US Region Orders
  {
    id: 'ORD-20260622-0093',
    user_id: 'USR-77301',
    region: 'US',
    status: 'paid',
    total_cents: 5900,
    currency: 'USD',
    payment_status: 'success',
    shipping_address: { receiver: 'David Miller', phone: '415-889-0921', detail: '300 Mission St, San Francisco, CA 94105' },
    created_at: '2026-06-18T13:45:00Z',
    items: [{ product_id: 'PRD-MOCK-US-001', product_name: 'Turkey low-fat meal kit', quantity: 1, unit_price_cents: 5900 }],
    payment: { provider: 'stripe', provider_payment_id: 'ch_1MjkLm2eZvKYlo2C8891Jm', paid_at: '2026-06-18T14:00:00Z' }
  },
  {
    id: 'ORD-20260622-0095',
    user_id: 'USR-77302',
    region: 'US',
    status: 'paid',
    total_cents: 6900,
    currency: 'USD',
    payment_status: 'success',
    shipping_address: { receiver: 'Emma Watson', phone: '212-555-0199', detail: '120 Broadway, New York, NY 10271' },
    created_at: '2026-06-20T10:00:00Z',
    items: [{ product_id: 'PRD-MOCK-US-002', product_name: 'Salmon Coat & Skin Glow Pack', quantity: 1, unit_price_cents: 6900 }],
    payment: { provider: 'stripe', provider_payment_id: 'ch_2NklOn4wXyZlop2D991Kz', paid_at: '2026-06-20T11:00:00Z' }
  },

  // EU Region Orders
  {
    id: 'ORD-20260622-0096',
    user_id: 'USR-66201',
    region: 'EU',
    status: 'paid',
    total_cents: 5400,
    currency: 'EUR',
    payment_status: 'success',
    shipping_address: { receiver: 'François Dupont', phone: '+33 6 1234 5678', detail: '15 Rue de la Paix, 75002 Paris, France' },
    created_at: '2026-06-19T14:30:00Z',
    items: [{ product_id: 'PRD-MOCK-EU-001', product_name: 'Hypoallergenic Rabbit Recipe', quantity: 1, unit_price_cents: 5400 }],
    payment: { provider: 'stripe', provider_payment_id: 'ch_EU_99102910381029', paid_at: '2026-06-19T15:00:00Z' }
  }
];

// 9. 宠物医院对接与医疗病历对照数据集
export const mockMedicalRecords = [
  {
    id: 'HR-CN-2026-0008239',
    pet_id: 'PET-CN-001',
    pet_name: '麦芬 (Muffin)',
    record_type: '门诊病历',
    occurred_at: '2026-04-12T10:00:00Z',
    summary: '麦芬因皮肤多发性斑块抓挠、严重泪痕就诊。查明为谷物淀粉、小麦麸质以及防腐剂添加严重不耐受导致异位性皮炎。建议停止一切大豆及麦麸类添加剂，切换为低敏感纯净配方。',
    clinic_name: '瑞鹏宠物医院上海中心店',
    vet_name: '张宇翔 (执业兽医师)',
    hospital_id: 'HOSP-RP-SH01',
    hospital_pet_id: 'RP-PET-99120',
    hospital_case_no: 'CASE-20260412-10822',
    attachments: [
      { name: '皮内过敏原测试单.pdf', url: 'https://heybo.cn/records/allergy_test_muffin.pdf' },
      { name: '股骨X射线片.jpg', url: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200&h=200&fit=crop&q=80' }
    ]
  },
  {
    id: 'HR-CN-2026-0009581',
    pet_id: 'PET-CN-002',
    pet_name: '团团 (Tuantuan)',
    record_type: '化验报告',
    occurred_at: '2026-05-18T09:00:00Z',
    summary: '年度例行全血生化及大便潜血筛查，淀粉酶指标略高，肠道蠕动偏弱，建议高水解单一肉类易吸收膳食调理。',
    clinic_name: '芭比堂猫科转诊医院北京分院',
    vet_name: '林舒涵 (猫科专家医师)',
    hospital_id: 'HOSP-BBT-BJ02',
    hospital_pet_id: 'BBT-CAT-881283',
    hospital_case_no: 'BBT-LAB-20260518-912',
    attachments: [{ name: '全血生化分析报告.pdf', url: 'https://heybo.cn/records/biochemistry_tuantuan.pdf' }]
  },
  {
    id: 'HR-US-2026-0001099',
    pet_id: 'PET-US-001',
    pet_name: 'Rocky',
    record_type: '肾衰专科病历',
    occurred_at: '2026-06-01T14:30:00Z',
    summary: 'Rocky SDMA test result is 16 ug/dL. Diagnosed as Stage 2 CKD. Highly recommend low-sodium therapeutic meals.',
    clinic_name: 'San Francisco VCA Hospital',
    vet_name: 'Dr. Sarah Connor (DVM)',
    hospital_id: 'HOSP-VCA-SF01',
    hospital_pet_id: 'VCA-DOG-551229',
    hospital_case_no: 'VCA-CASE-992019A',
    attachments: [{ name: 'VCA_Renal_Urinalysis.pdf', url: 'https://heybo.com/records/vca_renal_rocky.pdf' }]
  }
];

// 10. 医生审核及处方药品配置面板数据集
export const mockDoctorReviews = [
  {
    id: 'DOC-APP-001',
    email: 'zhang.yuxiang@vetrp.cn',
    display_name: '张宇翔',
    title: '主治兽医师 (外科/骨关节专科)',
    hospital_name: '瑞鹏宠物医院上海中心店',
    license_no: '兽医执字第 20188129033 号',
    certificate_img: 'https://heybo.cn/license/zhang_license.jpg',
    status: 'approved',
    created_at: '2025-01-20T08:00:00Z',
    reviewed_by: 'SuperAdmin-CN',
    notes: '执业证书核验通过。准予出具关节配方处方方案。'
  },
  {
    id: 'DOC-APP-002',
    email: 'lin.shuhan@bbtcat.cn',
    display_name: '林舒涵',
    title: '副主任医师 (猫科专科)',
    hospital_name: '芭比堂猫科转诊医院北京分院',
    license_no: '兽医执字第 20199203112 号',
    certificate_img: 'https://heybo.cn/license/lin_license.jpg',
    status: 'approved',
    created_at: '2025-03-10T09:30:00Z',
    reviewed_by: 'SuperAdmin-CN',
    notes: '消化内科及布偶猫肠胃专病核验。'
  },
  {
    id: 'DOC-APP-003',
    email: 'robert.jackson@vetus.org',
    display_name: 'Robert Jackson',
    title: 'Veterinary Nephrologist (DVM, DACVIM)',
    hospital_name: 'LA Animal Medical Center',
    license_no: 'US-VET-CA-99201',
    certificate_img: 'https://heybo.com/license/jackson_license.jpg',
    status: 'pending',
    created_at: '2026-06-20T15:00:00Z',
    reviewed_by: null,
    notes: '等待北美团队核验其执业有效性。'
  }
];

// 11. 故障日志数据集
export const mockFaultLogs = [
  {
    id: 'FLT-20260622-001',
    device_id: 'DEV-SN-00921',
    device_name: 'HB 鲜食智能大师 (主客厅)',
    product_type: 'pet_chef',
    error_code: 'E03',
    error_desc: '搅拌电机堵转卡死 (Motor Jammed)',
    severity: 'critical',
    occurred_at: '2026-06-22T11:43:00Z',
    status: 'unresolved',
    assigned_support_id: 'SuperAdmin-CN',
    cooking_context: {
      recipe_name: '养胃舒缓鲜鸭肉羹',
      total_grams: '300g',
      stage_at: '第二阶段 (文火焖煮 85°C)',
      temp_at: '85.2°C',
      motor_current: '4.8A (超载)',
      action_taken: '自动熔断关闭加热，强制舱门上锁，红灯报警'
    },
    notes: '可能卡入了块状配料或结块，需要指派客服电话引导解卡。'
  },
  {
    id: 'FLT-20260622-002',
    device_id: 'DEV-SN-00339',
    device_name: 'HB Smart Pure Fountain',
    product_type: 'smart_water_fountain',
    error_code: 'E09',
    error_desc: '水槽水位低于警戒值，水泵防干烧断电 (Dry Pump Protection)',
    severity: 'warning',
    occurred_at: '2026-06-22T02:15:00Z',
    status: 'investigating',
    assigned_support_id: 'Support-US-01',
    cooking_context: { action_taken: '水泵强制断电保护，App下发Push加水通知' },
    notes: '已提醒，等待加水。'
  }
];
