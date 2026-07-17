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
