# 笔试 AI 助手

一款面向备考场景的 AI 智能刷题与学习辅助工具。支持模拟练习、拍照搜题、AI 解析和错题复盘。

## 功能概览

| 模块 | 功能 |
|------|------|
| **📊 仪表盘** | 考试倒计时、学习进度环形图、快速操作入口、最近活动、AI 洞察建议 |
| **📝 模拟练习** | 计时答题、选项交互、草稿记录、提交即时反馈、解题步骤解析、20 题一套自动结算 |
| **📸 拍照搜题** | 图片题目识别、AI 分步解析、加入错题本、相似题型推荐 |
| **📖 错题本** | 按学科筛选、关键词搜索、AI 弱点诊断（正确率趋势）、错题回顾 |

## 技术栈

**前端** — React 19 / TypeScript / Vite 6 / Tailwind CSS 4 / Lucide React

**后端** — Express.js / Supabase (PostgreSQL) / tsx

**测试** — Vitest + Supertest（6 个集成测试）

## 快速开始

### 前置条件

- Node.js >= 22
- Supabase 项目（可选 — 不配置时使用内置本地 fallback 数据）

### 安装与运行

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填写 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY

# 3. 初始化数据库（可选）
# 在 Supabase SQL Editor 中执行 supabase/schema.sql

# 4. 启动（前后端一体）
npm run dev:full
# 或分别启动：
#   npm run dev       → 前端 http://localhost:3000
#   npm run api:dev   → 后端 http://localhost:8787
```

### 运行测试

```bash
npm test
```

## 项目结构

```
src/
├── App.tsx                        # 视图路由切换
├── types.ts                       # TypeScript 类型
├── lib/api.ts                     # API 客户端 + 本地 fallback
├── components/
│   ├── Layout.tsx                 # 响应式布局（桌面侧栏 / 移动底部导航）
│   ├── DashboardView.tsx          # 仪表盘首页
│   ├── PracticeView.tsx           # 模拟练习
│   ├── CameraView.tsx             # 拍照搜题
│   └── MistakesView.tsx           # 错题本
server/
└── index.ts                       # Express API 服务（含 Supabase 集成）
tests/
└── server.test.ts                 # 6 个集成测试（session / submit / next-set / dashboard）
supabase/
└── schema.sql                     # 表结构 + 种子数据
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/dashboard` | 仪表盘 |
| PATCH | `/api/profile` | 更新用户名 |
| GET | `/api/practice/session` | 获取当前练习 |
| POST | `/api/practice/submit` | 提交答案 |
| POST | `/api/practice/next-set` | 下一套练习 |
| GET | `/api/mistakes` | 错题列表（筛选/搜索/分页） |
| GET | `/api/camera/analysis` | 拍照识别结果 |
| POST | `/api/mistakes/from-scan` | 拍照结果→错题本 |
| POST | `/api/camera/search-similar` | 相似题型搜索 |

## 本地 Fallback

后端不可达时自动切换至内置本地数据，确保核心功能离线可用。环境变量控制：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `VITE_API_TIMEOUT_MS` | `25000` | 超时阈值 |
| `VITE_ENABLE_LOCAL_FALLBACK` | `true` | 是否启用 fallback |

## 截图

> 截图待补充

<!-- 在此处添加截图，例如：
![仪表盘](screenshots/dashboard.png)
![练习](screenshots/practice.png)
![拍照搜题](screenshots/camera.png)
![错题本](screenshots/mistakes.png)
-->

## License

Apache-2.0
