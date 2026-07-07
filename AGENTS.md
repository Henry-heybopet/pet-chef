# Project Rules — pet chef worktree

This worktree belongs to the same repository as `/Users/yhl/Antigravity/pet chef`.

## User-Visible Runtime Rules

### Single Acceptance Frontend

用户可见前端只允许从主工作区启动：

- 主工作区：`/Users/yhl/Antigravity/pet chef`
- 主前端验收地址：`http://localhost:5173/`
- Admin 验收地址：`http://localhost:5174/`
- 后端服务地址：`http://localhost:3001/`

子 worktree 只能作为隔离开发区，不能长期作为用户验收入口。

如果子 worktree 需要短暂启动服务，只能用于开发自测，不能作为最终验收 URL。

任何子 worktree 的功能改动完成后，必须先合并回主工作区，再从主工作区启动服务并验收。

### Required Runtime Disclosure

每次开始前端、后端、admin、数据库、设备、登录、支付相关代码任务前，Codex 必须先输出：

```text
实际修改目录:
当前分支:
实际运行前端目录:
用户验收 URL:
是否为主工作区验收:
```

如果实际修改目录不是 `/Users/yhl/Antigravity/pet chef`，必须明确说明：

```text
这是隔离 worktree，只能做开发验证。
用户验收前必须合并回 /Users/yhl/Antigravity/pet chef。
```

### Forbidden Runtime Drift

禁止把子 worktree 的 dev server 当成最终验收环境。

禁止在没有说明 worktree 来源的情况下，让用户访问 `5175`、`5176` 或其他临时前端端口进行最终验收。

最终验收只能使用：

- 主前端：`http://localhost:5173/`
- Admin：`http://localhost:5174/`
- Backend：`http://localhost:3001/`
