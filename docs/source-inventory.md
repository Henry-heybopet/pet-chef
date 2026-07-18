# 资料提炼清单

## 已处理资料

| 文件 | 提炼去向 | 备注 |
| --- | --- | --- |
| `宠物鲜食机Ver 1.0 .docx` | `product.md`, `device-integration.md`, `patent-notes.md` | 产品定位、硬件结构、微压蒸汽、双轴撕扯、成本和样机信息 |
| `Pet Chef宠物鲜食机_中文说明书.docx` | `product.md`, `requirements.md`, `device-integration.md` | 设备参数、控制项、错误码、安全限制、TuyaSmart 配网 |
| `K1511 MANUAL.pdf` | `product.md`, `device-integration.md` | 与中文说明书内容基本一致，作为设备说明书补充来源 |
| `鲜食机UI设计.docx` | `requirements.md`, `ui-notes.md` | Feeding OS 定位、页面信息架构、食谱推荐、食材替换、购物清单 |
| `鲜食机UI提示词.docx` | `requirements.md`, `ui-notes.md`, `device-integration.md` | 狗鲜食主线、我的爱犬、AI 健康食谱、食谱列表、烹饪页和后端同步要求 |
| `鲜食机-核心技术创新合成.docx` | `patent-notes.md`, `product.md` | 专利壁垒、扭矩反馈、微压蒸汽、结构创新 |
| `鲜食机专利建议（GPT）.docx` | `patent-notes.md` | 中美专利方向、核心权利要求、技术交底要点 |
| `产品定义（综合UI）.docx` | 暂不进入主需求 | 该文件主要是猫砂盆、喂食器、饮水机和宠物健康系统的大平台设想，与当前宠物鲜食机 MVP 关系较远 |

## 未提炼资料

| 文件 | 状态 | 后续处理 |
| --- | --- | --- |
| `宠物鲜食机项目进度计划.pptx` | `roadmap.md` | 6月到3月上市计划、测试节奏、交付物、风险管理 |
| `docs/source/犬用鲜食配方_A+B+C_40种优化版_营养合规审查（0630）.xlsx` | `recipe-database.md`, `backend/src/data/recipes_db.js`, `frontend/src/data/demoRecipes.js` | 当前 40 个 A+B+C 优化食谱源数据 |
| `鲜食机照片.jpg` | 未进入 Markdown | 可用于 README 或 UI 首屏素材 |

## 提炼原则

1. 原始 Word/PDF/PPT 继续留在产品定义目录。
2. GitHub 仓库只保留开发可执行的 Markdown 摘要和仍在使用的轻量源数据。
3. 与 MVP 直接相关的内容进入 `product.md`、`requirements.md`、`ui-notes.md`、`device-integration.md`。
4. 专利和技术壁垒进入 `patent-notes.md`。
5. 跨产品平台想法暂时不进入鲜食机 MVP，避免范围失控。
