# 八语言语义中间层与本地化发布

## 数据契约

- `recipes.name`、`recipes.ingredients`、风险 code、评分、克数和 kcal 是兼容旧 APK 的中文规范数据，不随语言变化。
- `recipes.img` 保存原始相对路径（例如 `/鸡肉轻盈餐.png`）；移动端使用 `VITE_API_URL` 对应的 ECS 静态资源源站加载，不改写 API 数据。
- 管理端上传文件保存在持久化的 `uploads/recipes/`，数据库保存 `/uploads/recipes/...`；迁移和种子脚本只为空图片回填，不覆盖管理员上传路径。
- 新版客户端传递 `locale`，并优先渲染 API 返回的 `recipe.presentation`。
- `recipe_translations`、`ingredient_translations`、`pack_translations` 保存人工审核后的展示文本。
- AI 对比先运行一次确定性评分和安全判断，再用语义 code 生成各语言 presentation；缓存按 locale 隔离。
- `HeyboPet` 保持品牌原文；中文品牌“王牌”在外语界面使用 `VIP Pet`。
- “鲜食验证”是业务名，不是品牌；各语言必须翻译，英文为 `Fresh Check`。

## 发布顺序

1. 备份 PostgreSQL，并同步备份 ECS 的持久化 `uploads/` 目录。
2. 执行 `psql -v ON_ERROR_STOP=1 -f backend/migrations/002_catalog_translations.sql`。
3. 执行 `psql -v ON_ERROR_STOP=1 -f backend/migrations/003_recipe_images.sql`，先增加并回填 `recipes.img`。
4. 在包含 `DATABASE_URL` 的环境中执行 `cd backend && npm run db:seed:i18n`。
5. 发布后端前执行 `cd backend && RECIPE_IMAGE_ORIGIN=https://<前端域名> npm run check:recipe-images`。
6. 构建并发布后端；确认 `/api/v1/recipes?all=1&locale=ko` 的 40 条记录均有 `img`，并且均为 `translation_status: translated`。
7. 发布新版前端/APK。旧 APK 不传 locale，继续读取原中文字段和数据库图片路径。

## 验收

- 执行 `cd backend && npm run test:i18n`。
- 执行 `cd backend && npm run test:fresh-check`。
- 执行 `cd backend && npm run check:recipe-images`；ECS 使用 `RECIPE_IMAGE_ORIGIN` 检查线上静态图片。
- 执行 `cd frontend && npm run check:i18n && npm run build`。
- 切换 8 种语言后，食谱名、食材名/功效、B/C 包和对比报告同时变化；数字、code 和配比保持一致。

## 回滚

- 代码可回滚到上一版本；三张新表不会影响旧 APK。
- 如需回滚数据库，先停止新后端，再从发布前备份恢复。
- 不建议只删除翻译表后继续运行新后端；新后端虽然会回退中文，但会将 `translation_status` 标记为 `fallback`。
