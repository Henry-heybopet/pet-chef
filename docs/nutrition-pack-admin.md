# 全价营养包后台管理

## 数据归属

- 正式数据表：`nutrition_packs`
- 稳定业务编号：`pack_id`，使用 `dog_pack_001`、`dog_pack_002` 的连续编号规则。
- 数据表、API、食谱快照和翻译表统一只使用 `pack_id`，避免形成双重业务标识。
- 配方字段：`composition`
- 健康标签：`health_tags`
- 产品价格：`product_pricing`，后台固定展示单位 `/10克/包`
- 营养指标字段：`nutrition_snapshot.calcium_pct`、`phosphorus_pct`、`chloride_pct`、`lysine_pct`
- 图片路径：`/uploads/nutrition-packs/<filename>`
- 管理权限：`nutrition_packs`

食谱页不再提供 B 包及上述四项指标的编辑入口。保存一个已关联食谱分类的营养包时，后端会在同一数据库事务中更新对应食谱的 `nutrition_snapshot.b_pack`、四项指标和 `pack_id`。独立表写入失败时不会只更新食谱投影。

## 初始化

数据库结构只通过 Prisma 管理：

```bash
cd backend
npm run db:sync:nutrition-packs
npx prisma db push --accept-data-loss
npm run db:seed:i18n
```

升级时先由同步脚本迁移 9 个稳定 ID、食谱引用并准备翻译表，再由 Prisma 调整结构，最后重建 8 种语言翻译。同步脚本是幂等的：目录固定为 9 个统一营养包，不会再插入一套旧 7 包。脚本会更新稳定编号、规范名称、分类、生命阶段和缺失的健康标签，但保留管理员已编辑的配比、营养指标、图片和产品价格。现有 7 个食谱分类的初始配比从 `recipes.nutrition_snapshot.b_pack` 取出现次数最多的一套；若同一分类存在多套数据，`source_data_conflict` 会记录冲突。脑发育和关节保护首次为草稿，不填造未经审核的配方或指标。

## 统一编码

| 规范名称 | 稳定 `pack_id` | 旧名称兼容 |
| --- | --- | --- |
| 幼犬通用全价营养包 | `dog_pack_001` | 幼犬成长营养包B |
| 大型幼犬控钙全价营养包 | `dog_pack_002` | 大型幼犬稳骨控钙营养包B |
| 成年犬通用全价营养包 | `dog_pack_003` | 成犬维护营养包B |
| 老年犬通用全价营养包 | `dog_pack_004` | 老年犬轻负担营养包B |
| 脑发育功能支持全价营养包 | `dog_pack_005` | 新增稳定编号 |
| 关节保护功能支持全价营养包 | `dog_pack_006` | 新增稳定编号 |
| 美毛护肤功能支持全价营养包 | `dog_pack_007` | 成犬/美毛基础营养包B |
| 护肝功能支持全价营养包 | `dog_pack_008` | 成犬/护肝基础营养包B |
| 低敏无动物蛋白全价营养包 | `dog_pack_009` | 低敏单一蛋白营养包B |

`pack_id` 对应 `nutrition_packs.id` 主键，并作为后台、管理 API、食谱引用和 8 种语言翻译表的唯一正式业务编号。

## 后台编辑与新增

- 营养包分类只能选择“基础全价营养包”或“功能支持型全价营养包”。
- 生命阶段只能选择“幼犬、成年犬、老年犬”。
- 新增营养包默认是草稿，并自动产生下一个不冲突的 `dog_pack_NNN` 编号；营养团队补齐完整配比后才能启用。
- 每条营养包记录都可在二次确认后删除；已被食谱 `nutrition_snapshot` 引用的营养包禁止删除并返回 `409`。
- 删除数据库记录不会自动删除上传图片，避免误删共享文件；孤立图片由后续运维清理。
- 食谱产品价格只保存价格数值，后台固定展示单位 `/150克/包`。
- 营养包产品价格只保存价格数值，后台固定展示单位 `/10克/包`。

## 发布与回滚

发布前备份 PostgreSQL、`uploads/`、`.data/`、`.env` 和 `nginx/admin.htpasswd`。本次统一编号会修改主键、食谱 JSON 引用和翻译表结构，代码与数据库必须作为同一发布单元。回滚时恢复发布前代码和 PostgreSQL 备份，不能只回滚其中一项。
