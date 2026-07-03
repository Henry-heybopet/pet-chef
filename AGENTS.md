# Project Rules — pet chef

This project-level AGENTS.md provides project-specific paths, commands, test commands, and handoff conventions for the pet chef project.

This file is shared by both Codex and Antigravity when they work in this repository.

It must be used together with the DevOps Ponytail Delivery Skill, located either:

- globally for Codex at `/Users/yhl/.codex/skills/devops-ponytail-delivery/SKILL.md`
- locally for this repository at `.agents/skills/devops-ponytail-delivery/SKILL.md`

If there is any conflict, the DevOps Ponytail Delivery Skill and repository safety rules take priority, especially rules about:

- protecting existing user work
- checking git status before major work
- using worktree or feature branch for large tasks
- security
- payment correctness
- device safety
- data migration safety
- testing and validation
- rollback
- observability
- not claiming completion without verification

Project-level rules may add stricter requirements or project-specific commands, but they must not weaken the global safety and delivery rules.

## Project

项目名称：pet chef  
真实仓库路径：/Users/yhl/Antigravity/pet chef

## Default Workflow

1. 开始任何代码任务前，先确认：
   - 当前目录
   - git root
   - 当前分支
   - git status

2. 大功能、新模块、支付、账号、设备、登录相关改动，默认新建独立 git worktree/feature branch。

3. 主工作区有未提交改动时，不要 reset、checkout、清理或覆盖。优先隔离新 worktree。

4. 修改业务规则时，必须同步更新 docs 文档。不要只把规则写在聊天里。

5. 完成后必须报告：
   - 改了什么
   - 跑了什么验证
   - 什么没验证
   - 下次继续从哪里开始

## Common Checks

- Backend: npm test
- Backend app load: NODE_ENV=production node -e "require('./src/index'); console.log('express app loaded')"
- Frontend: npm run build:frontend
- Android: ./gradlew :app:compileDebugJavaWithJavac --offline

## Thread Handoff Format

复杂任务结束时，按这个格式总结：
背景：
已完成：
未完成：
验证结果：
关键文件：
下次入口：
## Worktree Rules

以下任务必须新建独立 worktree/feature branch：
- 账号、登录、支付、商城订单
- Tuya SDK、设备配网、DP 控制
- 数据库 schema、Prisma migration、数据结构变更
- iOS/Android 原生工程、Capacitor 打包
- Docker、Nginx、服务器部署、HTTPS
- AI 食谱规则、安全过滤、营养计算规则

小文案、docs、局部 UI、测试脚本可以在当前工作区修改，但必须先确认 git status。

## Safety Rules

- 不提交真实 AppSecret、API Key、支付密钥、证书、.env 文件。
- 不提交 node_modules、Pods、SDK 压缩包、Xcode/Android Studio 本地缓存、graphify-out。
- 测试环境配置和正式环境配置必须分开。
- 修改业务规则时，同步更新 docs 或 decision record。

## Validation Rules

按改动范围选择最小验证：
- Backend: npm test
- Backend app load: NODE_ENV=production node -e "require('./src/index'); console.log('express app loaded')"
- Frontend: npm run build:frontend
- Android: ./gradlew :app:compileDebugJavaWithJavac --offline
- iOS: xcodebuild no-sign simulator build

## Worktree Sync Discipline

### 分支生命周期规则
1. Feature branch 寿命不超过 3 天。超过 3 天必须 rebase 到 main 或与其他活跃分支同步。
2. 每个 feature branch 开始工作前，必须先 `git fetch && git rebase main`。
3. 同时存在 2 个以上 feature branch 时，每天结束前必须检查是否有交叉修改的文件。

### 共享热点文件保护
以下文件被多个功能模块共享，修改时必须特别注意：
- `frontend/src/App.jsx` — 主路由入口
- `backend/src/index.js` — 后端入口
- `frontend/src/i18n/translations.js` — 国际化
- `frontend/src/data/demoRecipes.js` — 食谱数据
- `backend/src/services/gemini.js` — AI 服务
- `frontend/src/api/index.js` — 前端 API 层

修改这些文件时：
1. 先确认其他 branch 是否也在修改同一文件
2. 如果是，立即进行一次 merge/rebase 同步，不要等到功能完成

### Commit 颗粒度
- 禁止单个 commit 修改超过 20 个文件
- 每完成一个独立子功能就 commit 一次
- Commit message 必须说明改动范围

### 数据库变更统一路径
- 表结构变更（DDL）：只通过 `prisma/schema.prisma` + `npx prisma db push`
- 数据变更（DML）：通过 `npm run db:sync`（刷新食谱）或 `npm run db:seed`（完整种子）
- 禁止使用 raw SQL migration 文件创建/修改表结构（已有的 001_*.sql 标记为 deprecated）
- `pg_client.js` 仅用于运行时查询，不用于 DDL

### 合并后必须验证
合并完成后必须执行：
1. `grep -rn '<<<<<<' --exclude-dir=node_modules` — 确认无冲突标记残留
2. 前端构建验证
3. 后端加载验证
4. 如有函数重复，auto-merge 可能导致同名函数被合入两次
