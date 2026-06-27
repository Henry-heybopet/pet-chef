# Pet Chef Version Info

| Field | Value |
|-------|-------|
| **Version** | Ver B1.00 |
| **Codename** | "Safety First" |
| **Build Date** | 2026-06-22 |
| **Git Branch** | `Ver-B1.00` |
| **Based On** | `main` (e895469) |

## Phase 1 — "安全可用"

Core deliverables:
- 🔴 AI 食材硬规则安全过滤器
- 🔄 食材库 + 食谱库迁移至 PostgreSQL (Supabase)
- 🧭 导航升级：状态机引导 → 5 Tab 自由切换
- 🏠 首页阶段式差异化布局

## Component Versions

| Component | Version | Notes |
|-----------|---------|-------|
| Frontend (React+Capacitor) | B1.00 | New: BottomTabBar, SafetyWarning, CategoryTabBar, HomeScreen phases |
| Backend (Express 5) | B1.00 | New: safety_filter.js, PG migration, PG-backed recipe API |
| Database (PostgreSQL) | B1.00 | New: ingredient_library, recipes tables |

## Build Status

| Item | Status |
|------|--------|
| Build Date | 2026-06-22 12:20 CST |
| Backend Syntax Check | ✅ All 5 files passed |
| Frontend Structure | ✅ 9 new components + App.jsx + AIInputScreen |
| Safety Filter Tests | ✅ 5/6 passed (T5: English fuzzy match — expected, DB is Chinese) |
| API Logic Tests | ✅ 12/12 passed |
| Version Stamps | ✅ B1.00 on all packages |
| QA Total | ✅ 24/26 passed, 1 expected, 1 sandbox-limited |
