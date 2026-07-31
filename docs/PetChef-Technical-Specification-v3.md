# Pet Chef（鲜食机）技术规格说明书 v3.0 (全球化多区域架构)

> **文档版本**: v3.0（全球化三区域架构升级）
> **适用范围**: 移动端 App、后端服务、固件/设备通信、AI 引擎、全球支付与合规
> **最后更新**: 2026-06-22（架构重构版）
> **变更摘要**: 针对 5 万台设备与 100 万用户吞吐量的全球化多区域重构。支持严格数据本地化（中国/美国/欧洲）、基于 JWT 与 Rate Limiter 的网络安全网关、Prisma 驱动的 PostgreSQL 实例、及多通道支付（微信/支付宝/Stripe/PayPal）。

---

## 1. 区域化系统架构总览

Pet Chef v3.0 弃用原本的单一云端服务模式，升级为**环境变量驱动的多区域独立模块单体架构（Region-Aware Monolith）**。同一份后端代码通过环境变量配置不同的区域参数，在三个法区物理独立部署，实现彻底的计算和存储隔离。

```
                       ┌─────────────────────┐
                       │  Flutter 统一客户端   │
                       │ (iOS/Android/鸿蒙N)  │
                       └──────────┬──────────┘
                                  │
                 ┌────────────────┼────────────────┐
                 │ 区域路由       │ 用户选择区      │ 区域域名分配
                 ▼                ▼                ▼
          ┌────────────┐   ┌────────────┐   ┌────────────┐
          │  中国区域   │   │  美国区域   │   │  欧洲区域   │
          │  阿里云/    │   │  GCP       │   │  GCP       │
          │  腾讯云     │   │  us-cent   │   │  eu-west   │
          ├────────────┤   ├────────────┤   ├────────────┤
          │ api.       │   │ api-us.    │   │ api-eu.    │
          │ petchef.cn │   │ petchef.com│   │ petchef.com│
          └─────┬──────┘   └─────┬──────┘   └─────┬──────┘
                │                │                │
          ┌─────▼──────┐   ┌─────▼──────┐   ┌─────▼──────┐
          │ PostgreSQL │   │ PostgreSQL │   │ PostgreSQL │
          │  (CN 境内)  │   │ (US-GCP)   │   │ (EU-GCP)   │
          └────────────┘   └────────────┘   └────────────┘
```

### 1.1 核心设计决策 (ADR)
1. **ADR-001 (设备通信)**: 采用涂鸦 (Tuya) IoT 平台，不自建 MQTT。各法区后端对接 Tuya 在该法区的数据中心（CN: tuyacn.com, US: tuyaus.com, EU: tuyaeu.com）。
2. **ADR-004 (单体优先)**: 基于 1-3 人小团队的运维约束，后端保持模块化单体，不采用微服务。同一份后端 Docker 镜像，通过配置环境变量实现差异化运行。
3. **ADR-006 (数据本地化)**: 严格满足《个人信息保护法 (PIPL)》及《通用数据保护条例 (GDPR)》，所有用户敏感数据和交易记录在各区域物理独立存储，不作跨国界传输。全局静态数据（如食谱库、犬种库）在部署管线中通过种子脚本 (Seed) 统一分发。
4. **ADR-010 (安全过滤)**: 采用硬编码危险食材黑名单前置阻断技术，AI 营养引擎禁止参与安全性决策。

---

## 2. 中心化区域配置服务

配置系统挂载在 `src/config/region_config.js`，通过 `PETCHEF_REGION`（取值: `cn`, `us`, `eu`）驱动全部外部资源和策略映射。

### 2.1 区域差异化配置矩阵

| 配置维度 | 中国区 (CN) | 美国区 (US) | 欧洲区 (EU) |
| :--- | :--- | :--- | :--- |
| **部署云厂商** | 阿里云 / 腾讯云 (境内) | Google Cloud Platform | Google Cloud Platform |
| **CORS 域名** | `*.petchef.cn` | `*.petchef.com` | `*.petchef.com` |
| **数据合规法** | 中华人民共和国 PIPL | CCPA (加州消费者隐私法) | 欧盟 GDPR (最严苛) |
| **Tuya IoT API** | `openapi.tuyacn.com` | `openapi.tuyaus.com` | `openapi.tuyaeu.com` |
| **支持支付渠道** | 微信支付 App Pay / 支付宝 App | Stripe (信用卡/Apple) / PayPal | Stripe / PayPal |
| **本地化语系** | 默认: zh-CN (支持: zh, en) | 默认: en-US (支持: en, es, pt, fr) | 默认: en-GB (支持: en, de, fr, es, it, pt, ru, ar) |
| **默认时区** | Asia/Shanghai | America/New_York | Europe/Berlin |
| **推送渠道** | 极光推送 (JPush) / 个推 | FCM (Firebase Cloud Messaging) | FCM (Firebase Cloud Messaging) |

---

## 3. 安全校验与 API 版本化

API 采用全局限流与接口指尖限流机制，最大化防范 DDoS 及恶性 API 盗刷（特别是针对调用 LLM 的计费接口）。

### 3.1 安全网关契约
- **Base URL**: `/api/v1` (如: `https://api.petchef.cn/api/v1`)
- **身份验证**: JWT (JSON Web Token) 承载。Authorization 头部采用 `Bearer <token>` 格式。
- **环境隔离**: 所有环境只接受后端密钥签名且未过期的合法 JWT；本地调试不再兼容 `dev_` Mock Token。

### 3.2 API 限流策略 (Rate Limiting)
- **全局基础限流**: 单 IP 每 15 分钟限制最大请求数为 500 次。
- **敏感业务限流**: AI 营养分析（`/api/v1/ai-analysis`）、AI 食谱生成（`/api/v1/ai-recipe`）、鲜食机指令发送（`/api/v1/tuya/start`）及商城下单，每 IP 每分钟最大请求限制为 15 次。

---

## 4. 关系型数据库 Schema (Prisma)

为支撑百万级用户及高并发读写，后端放弃 JSON 文件存储，完全重构并迁移至基于 Prisma ORM 的 PostgreSQL 架构。

### 4.1 数据模型设计 (Entity Relationship)

```prisma
// 核心用户与家庭关系
model User {
  id            String     @id
  display_name  String
  primary_phone String?
  primary_email String?
  country_code  String
  region        String
  status        UserStatus @default(active)
  created_at    DateTime   @default(now())
  updated_at    DateTime   @updatedAt
  
  identities    UserIdentity[]
  memberships   HouseholdMember[]
  pets          Pet[]
}

model Household {
  id            String     @id
  name          String
  owner_user_id String
  region        String
  created_at    DateTime   @default(now())
  
  members       HouseholdMember[]
  pets          Pet[]
  devices       Device[]
}

// 核心设备管理 (Tuya 绑定)
model Device {
  id               String       @id
  household_id     String
  tuya_device_id   String       @unique
  product_type     ProductType  @default(pet_chef)
  device_name      String
  status           DeviceStatus @default(active)
  bound_at         DateTime     @default(now())
  
  household        Household    @relation(fields: [household_id], references: [id])
}

// 商城 SPU 与 SKU 价格隔离
model Product {
  id             String   @id
  name           String
  category       String   // meat_pack / vegetable_pack / bundle
  status         String   @default("active")
  skus           Sku[]
}

model Sku {
  id           String   @id
  product_id   String
  sku_code     String
  price_cents  Int      // 价格(分)
  currency     String   @default("CNY")
  stock_status String   @default("in_stock")
  
  product      Product  @relation(fields: [product_id], references: [id])
}
```

---

## 5. 全球化多渠道支付流

不同区域在创建支付流水（`POST /api/v1/payments`）时，后端通过 `region_config` 自动切分商户通道，在服务端组装返回给移动端的原生拉起参数。

### 5.1 支付通道映射表

```
用户发起支付 ──► 后端 /payments ──► 动态读取 region_config
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            ▼                          ▼                          ▼
       中国法区 (CN)              美国法区 (US)              欧洲法区 (EU)
    ┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
    │  微信支付 / 支付宝│        │  Stripe / PayPal│        │  Stripe / PayPal│
    └─────────────────┘        └─────────────────┘        └─────────────────┘
```

- **微信/支付宝 (中国)**: 服务端对接官方 V3 接口，使用商户私钥和微信平台证书完成 SHA256withRSA 回调签名校验，验证通过后更改订单为 `paid`。
- **Stripe (欧美)**: 服务端调用 Stripe SDK 创建 `PaymentIntent`，向前端返回 `clientSecret`。App 端通过 Stripe SDK 完成 3D Secure 信用卡安全验证，后端通过 Webhook 接收 `payment_intent.succeeded` 广播更新库存及订单状态。
- **PayPal (欧美)**: 服务端创建 PayPal 订单，返回审批 Link，由移动端 SDK 或网页重定向完成支付授权。

---

## 6. 合规与数据管理规范

### 6.1 GDPR 专用要求 (欧洲区域)
1. **Right to Erasure (被遗忘权)**: 提供注销接口，自动级联删除用户在 `user_identities`、`pets`、`feeding_records`、`health_records` 中的物理记录，设备解绑并归档订单。
2. **Cookie Consent (Cookie 授权控制)**: 欧洲区 Web 端强制提供符合 ePrivacy Directive 的拒绝追踪选项。

### 6.2 PIPL 专用要求 (中国区域)
1. **数据境内存储**: 阿里云中国宁夏/张家口等节点独立运行计算与 PG RDS 存储，严禁向海外同步任何 PIPL 范围内可识别个人自然人的数据。

---
