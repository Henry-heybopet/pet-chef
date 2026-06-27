# Codex Project Rules

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
