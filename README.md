# Pet Chef 宠物鲜食机

Pet Chef 是嗨宝宠物的宠物鲜食机软件项目，用于承接产品定义、UI 原型、犬只资料、食谱生成、烹饪流程和设备联动等功能开发。

## 项目关联

- 产品定义目录：`/Users/yhl/Documents/001-嗨宝宠物/01-产品定义`
- 本地软件目录：`/Users/yhl/Antigravity/pet chef`
- GitHub 仓库：`https://github.com/Henry-heybopet/pet-chef`

产品定义目录保留正式资料、说明书、专利建议、UI 提示词和项目计划；本仓库保留可运行代码和面向开发的 Markdown 文档。

## 代码结构

```text
frontend/   React + Vite 前端
backend/    Node/Express 后端
api/        Vercel serverless 入口
docs/       产品和开发文档
```

## 本地开发

前端：

```bash
cd frontend
npm install
npm run dev
```

构建：

```bash
npm run build
```

后端依赖：

```bash
cd backend
npm install
```

## 文档入口

- [产品定义](docs/product.md)
- [功能需求](docs/requirements.md)
- [开发路线图](docs/roadmap.md)
- [UI 说明](docs/ui-notes.md)
- [设备联动](docs/device-integration.md)

## 当前管理规则

1. 产品原始资料放在产品定义目录，不直接混入代码目录。
2. 可以执行开发的内容整理成 Markdown，放入 `docs/`。
3. Office/WPS 临时文件、系统文件、环境变量和构建产物不进入 Git。
4. 每次重要需求变更，先更新 `docs/requirements.md` 或 `docs/roadmap.md`，再改代码。
